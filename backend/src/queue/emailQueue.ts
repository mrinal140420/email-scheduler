import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { indexEmailJob } from '../services/elasticsearch';

export const QUEUE_NAME = 'email-scheduler';

export interface EmailJobData {
  emailJobId: string;
  recipient: string;
  subject: string;
  body: string;
  senderId?: string;
  scheduledAt: string;
  rescheduleAttempt?: number;
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs in Redis for audit & Bull-board
    },
    removeOnFail: {
      count: 1000, // Keep failed jobs for inspection
    },
  },
});

export async function scheduleEmailJob({
  recipient,
  subject,
  body,
  scheduledAt,
  senderId,
  userId,
}: {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  senderId?: string;
  userId?: string;
}) {
  const targetTime = new Date(scheduledAt).getTime();
  const now = Date.now();
  const delay = Math.max(0, targetTime - now);

  // 1. Create record in Database first (Single Source of Truth)
  const dbJob = await prisma.emailJob.create({
    data: {
      recipient,
      subject,
      body,
      scheduledAt: new Date(scheduledAt),
      status: delay > 0 ? 'QUEUED' : 'PENDING',
      senderId,
      userId,
    },
    include: {
      sender: true,
    },
  });

  // 2. Add job to BullMQ with jobId = dbJob.id for absolute idempotency
  const bullJob = await emailQueue.add(
    'send-email',
    {
      emailJobId: dbJob.id,
      recipient: dbJob.recipient,
      subject: dbJob.subject,
      body: dbJob.body,
      senderId: dbJob.senderId || undefined,
      scheduledAt: dbJob.scheduledAt.toISOString(),
    },
    {
      jobId: dbJob.id, // Idempotent key
      delay: delay,
    }
  );

  // 3. Update DB with BullMQ job ID
  await prisma.emailJob.update({
    where: { id: dbJob.id },
    data: { bullJobId: bullJob.id },
  });

  // 4. Index in Elasticsearch
  await indexEmailJob(dbJob);

  return dbJob;
}
