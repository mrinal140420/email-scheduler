import { Router, Request, Response } from 'express';
import { emailQueue } from '../queue/emailQueue';
import { prisma } from '../config/db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [counts, scheduledDbCount, sentDbCount, failedDbCount, totalSenders] = await Promise.all([
      emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
      prisma.emailJob.count({ where: { status: { in: ['PENDING', 'QUEUED', 'RATE_LIMITED', 'PROCESSING'] } } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
      prisma.senderAccount.count(),
    ]);

    return res.json({
      queue: counts,
      database: {
        scheduled: scheduledDbCount,
        sent: sentDbCount,
        failed: failedDbCount,
        senders: totalSenders,
      },
      config: {
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
        delayBetweenSendsMs: parseInt(process.env.DELAY_BETWEEN_EMAILS_MS || '2000', 10),
        maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
