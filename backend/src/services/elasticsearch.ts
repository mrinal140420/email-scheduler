import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { prisma } from '../config/db';

dotenv.config();

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
export const ES_INDEX = process.env.ELASTICSEARCH_INDEX || 'email_jobs';

export const esClient = new Client({
  node: esNode,
  maxRetries: 3,
  requestTimeout: 5000,
});

let isElasticsearchConnected = false;

export async function initElasticsearch() {
  try {
    const ping = await esClient.ping();
    if (ping) {
      isElasticsearchConnected = true;
      console.log(`[Elasticsearch] Connected to cluster at ${esNode}`);

      const indexExists = await esClient.indices.exists({ index: ES_INDEX });
      if (!indexExists) {
        await esClient.indices.create({
          index: ES_INDEX,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                createdAt: { type: 'date' },
                senderEmail: { type: 'keyword' },
              },
            },
          },
        });
        console.log(`[Elasticsearch] Created index: ${ES_INDEX}`);
      }
    }
  } catch (error: any) {
    console.warn(`[Elasticsearch] Service not reachable at ${esNode} (${error.message}). Fallback to SQL search active.`);
    isElasticsearchConnected = false;
  }
}

export async function indexEmailJob(emailJob: any) {
  if (!isElasticsearchConnected) return;

  try {
    await esClient.index({
      index: ES_INDEX,
      id: emailJob.id,
      body: {
        id: emailJob.id,
        recipient: emailJob.recipient,
        subject: emailJob.subject,
        body: emailJob.body,
        status: emailJob.status,
        scheduledAt: emailJob.scheduledAt,
        sentAt: emailJob.sentAt,
        createdAt: emailJob.createdAt,
        senderEmail: emailJob.sender?.email,
      },
    });
  } catch (error: any) {
    console.warn(`[Elasticsearch] Failed to index email job ${emailJob.id}:`, error.message);
  }
}

export async function searchEmailJobs(query: string) {
  if (isElasticsearchConnected) {
    try {
      const response = await esClient.search({
        index: ES_INDEX,
        body: {
          query: {
            multi_match: {
              query,
              fields: ['recipient^3', 'subject^2', 'body', 'status'],
              fuzziness: 'AUTO',
            },
          },
        },
      });

      const hits = response.hits.hits.map((hit: any) => hit._source);
      return { source: 'elasticsearch', results: hits };
    } catch (err: any) {
      console.warn('[Elasticsearch] Search query failed, falling back to Database:', err.message);
    }
  }

  // Graceful fallback to Database search with Prisma
  const dbResults = await prisma.emailJob.findMany({
    where: {
      OR: [
        { recipient: { contains: query } },
        { subject: { contains: query } },
        { body: { contains: query } },
        { status: { contains: query } },
      ],
    },
    include: {
      sender: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return { source: 'database_fallback', results: dbResults };
}
