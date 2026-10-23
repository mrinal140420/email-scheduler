import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/db';
import { scheduleEmailJob, emailQueue } from '../queue/emailQueue';
import { searchEmailJobs } from '../services/elasticsearch';
import { getOrCreateDefaultSender } from '../services/mailer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Email regex validator
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * POST /api/emails/schedule
 * Schedules one or many emails
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { recipients, recipient, subject, body, scheduledAt, senderId, delayBetweenSeconds } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and Body are required.' });
    }

    const emailList: string[] = Array.isArray(recipients)
      ? recipients
      : recipient
      ? [recipient]
      : [];

    if (emailList.length === 0) {
      return res.status(400).json({ error: 'At least one recipient email is required.' });
    }

    // Default sender ensure
    let assignedSenderId = senderId;
    if (!assignedSenderId) {
      const defaultSender = await getOrCreateDefaultSender();
      assignedSenderId = defaultSender.id;
    }

    const baseStartTime = scheduledAt ? new Date(scheduledAt).getTime() : Date.now();
    const staggerDelayMs = (delayBetweenSeconds ? Number(delayBetweenSeconds) : 2) * 1000;

    const scheduledJobs = [];

    for (let i = 0; i < emailList.length; i++) {
      const targetEmail = emailList[i].trim();
      if (!targetEmail) continue;

      // Calculate staggered schedule time for bulk sends
      const itemScheduleTime = new Date(baseStartTime + i * staggerDelayMs);

      const job = await scheduleEmailJob({
        recipient: targetEmail,
        subject,
        body,
        scheduledAt: itemScheduleTime,
        senderId: assignedSenderId,
      });

      scheduledJobs.push(job);
    }

    return res.status(201).json({
      message: `Successfully scheduled ${scheduledJobs.length} email(s)`,
      count: scheduledJobs.length,
      jobs: scheduledJobs,
    });
  } catch (error: any) {
    console.error('Error scheduling emails:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/emails/scheduled
 * Retrieves pending, queued, or rate-limited scheduled emails
 */
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where = {
      status: {
        in: ['PENDING', 'QUEUED', 'RATE_LIMITED', 'PROCESSING'],
      },
    };

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        include: { sender: true },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      emails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/sent
 * Retrieves sent or failed emails
 */
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where = {
      status: {
        in: ['SENT', 'FAILED'],
      },
    };

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        include: { sender: true },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      emails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/search
 * Elasticsearch full-text search with database fallback
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query parameter `q` is required.' });
    }

    const searchResults = await searchEmailJobs(query);
    return res.json(searchResults);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/emails/upload-csv
 * Upload CSV or text file and extract email leads
 */
router.post('/upload-csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const matchedEmails = fileContent.match(EMAIL_REGEX) || [];

    // Deduplicate emails
    const uniqueEmails = Array.from(new Set(matchedEmails.map((e: string) => e.toLowerCase())));

    return res.json({
      filename: req.file.originalname,
      count: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/emails/:id
 * Cancels and deletes a scheduled job
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.emailJob.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Attempt to remove from BullMQ
    if (job.bullJobId) {
      try {
        const bullJob = await emailQueue.getJob(job.bullJobId);
        if (bullJob) {
          await bullJob.remove();
        }
      } catch (err: any) {
        console.warn(`Could not remove Bull job ${job.bullJobId}:`, err.message);
      }
    }

    await prisma.emailJob.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return res.json({ message: 'Job cancelled successfully', id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/senders
 * Returns configured sender accounts
 */
router.get('/senders', async (_req: Request, res: Response) => {
  try {
    await getOrCreateDefaultSender();
    const senders = await prisma.senderAccount.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        hourlyLimit: true,
      },
    });
    return res.json(senders);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
