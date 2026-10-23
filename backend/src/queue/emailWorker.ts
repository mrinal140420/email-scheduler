import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { sendEmail, getOrCreateDefaultSender } from '../services/mailer';
import { indexEmailJob } from '../services/elasticsearch';
import { sendSlackRateLimitNotification } from '../services/slack';
import { EmailJobData, QUEUE_NAME, emailQueue } from './emailQueue';

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const delayBetweenSends = parseInt(process.env.DELAY_BETWEEN_EMAILS_MS || '2000', 10);
const defaultMaxPerHour = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10);

/**
 * Returns a Redis key for the current hourly window of a sender.
 * Format: ratelimit:{senderId}:{YYYYMMDDHH}
 */
function getHourlyWindowKey(senderId: string, date: Date = new Date()): { key: string; windowExpiresInSeconds: number; nextWindowTime: Date } {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  const key = `ratelimit:${senderId}:${year}${month}${day}${hour}`;

  // Next window starts at top of next hour
  const nextWindowTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours() + 1, 0, 0, 0));
  const windowExpiresInSeconds = Math.max(1, Math.ceil((nextWindowTime.getTime() - date.getTime()) / 1000) + 120);

  return { key, windowExpiresInSeconds, nextWindowTime };
}

/**
 * Atomically checks and increments the sender's hourly email counter in Redis.
 * If limit is reached, returns { allowed: false, currentCount, nextWindowTime }.
 */
async function checkAndIncrementHourlyRateLimit(senderId: string, limit: number): Promise<{ allowed: boolean; currentCount: number; nextWindowTime: Date }> {
  const { key, windowExpiresInSeconds, nextWindowTime } = getHourlyWindowKey(senderId);

  // Atomic Lua script or pipeline to increment and set TTL
  const multi = redisConnection.multi();
  multi.incr(key);
  multi.expire(key, windowExpiresInSeconds);
  const results = await multi.exec();

  const currentCount = (results?.[0]?.[1] as number) || 1;

  if (currentCount > limit) {
    return {
      allowed: false,
      currentCount,
      nextWindowTime,
    };
  }

  return {
    allowed: true,
    currentCount,
    nextWindowTime,
  };
}

export function startEmailWorker() {
  console.log(`[Worker] Initializing BullMQ Worker (Concurrency: ${concurrency}, Delay: ${delayBetweenSends}ms)`);

  const worker = new Worker<EmailJobData>(
    QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailJobId, recipient, subject, body } = job.data;
      let senderId = job.data.senderId;

      // 1. Idempotency Check: Fetch from DB to ensure it hasn't been sent already
      const dbJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: { sender: true },
      });

      if (!dbJob) {
        console.warn(`[Worker] Job ${emailJobId} not found in database. Skipping.`);
        return;
      }

      if (dbJob.status === 'SENT') {
        console.log(`[Worker] Job ${emailJobId} was already sent. Skipping for idempotency.`);
        return;
      }

      // If no sender assigned, attach or fetch default sender
      let sender = dbJob.sender;
      if (!sender) {
        sender = await getOrCreateDefaultSender();
        senderId = sender.id;
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: { senderId: sender.id },
        });
      }

      const hourlyLimit = sender.hourlyLimit || defaultMaxPerHour;

      // 2. Enforce Distributed Hourly Rate Limit in Redis
      const rateLimitCheck = await checkAndIncrementHourlyRateLimit(sender.id, hourlyLimit);

      if (!rateLimitCheck.allowed) {
        const nextWindow = rateLimitCheck.nextWindowTime;
        const delayUntilNextWindow = Math.max(1000, nextWindow.getTime() - Date.now());

        console.warn(
          `[Worker] ⚠️ Rate limit exceeded for sender ${sender.email} (${rateLimitCheck.currentCount}/${hourlyLimit}). Rescheduling job ${emailJobId} to next window at ${nextWindow.toISOString()} (delay: ${Math.round(delayUntilNextWindow / 1000)}s)`
        );

        // Update DB status to RATE_LIMITED
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RATE_LIMITED',
            scheduledAt: nextWindow,
          },
        });

        // Trigger Real Slack Notification on Rate Limit Hit (Required by assignment)
        await sendSlackRateLimitNotification({
          senderEmail: sender.email,
          senderId: sender.id,
          hourlyLimit,
          currentCount: rateLimitCheck.currentCount,
          nextAvailableWindow: nextWindow,
          delayedJobsCount: 1,
        });

        // Re-enqueue job into next hour window (Never drop or fail)
        await emailQueue.add(
          'send-email',
          {
            ...job.data,
            senderId: sender.id,
            scheduledAt: nextWindow.toISOString(),
            rescheduleAttempt: (job.data.rescheduleAttempt || 0) + 1,
          },
          {
            jobId: `${emailJobId}-retry-${(job.data.rescheduleAttempt || 0) + 1}`,
            delay: delayUntilNextWindow,
          }
        );

        return { status: 'rescheduled_due_to_rate_limit', nextWindow };
      }

      // 3. Provider Throttling Delay: Enforce minimum delay between email sends
      if (delayBetweenSends > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenSends));
      }

      // 4. Update status to PROCESSING
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'PROCESSING' },
      });

      try {
        // 5. Send Email via Ethereal SMTP
        const sendResult = await sendEmail({
          senderId: sender.id,
          recipient,
          subject,
          body,
        });

        const sentAt = new Date();

        // 6. Persist successful delivery & Ethereal preview link
        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt,
            etherealUrl: sendResult.etherealUrl,
          },
          include: { sender: true },
        });

        // 7. Sync latest state to Elasticsearch
        await indexEmailJob(updatedJob);

        console.log(`[Worker] ✅ Sent email to ${recipient} via ${sendResult.senderEmail}`);
        if (sendResult.etherealUrl) {
          console.log(`[Worker] 🔗 Ethereal Preview: ${sendResult.etherealUrl}`);
        }

        return {
          status: 'SENT',
          recipient,
          etherealUrl: sendResult.etherealUrl,
        };
      } catch (err: any) {
        console.error(`[Worker] ❌ Failed to send email ${emailJobId} to ${recipient}:`, err.message);

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
            attempts: { increment: 1 },
          },
        });

        throw err; // Let BullMQ retry based on backoff config
      }
    },
    {
      connection: redisConnection,
      concurrency: concurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
}
