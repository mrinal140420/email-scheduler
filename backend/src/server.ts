import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import emailRoutes from './routes/emailRoutes';
import authRoutes from './routes/authRoutes';
import statsRoutes from './routes/statsRoutes';
import { setupBullBoard } from './queue/bullBoard';
import { startEmailWorker } from './queue/emailWorker';
import { initElasticsearch } from './services/elasticsearch';
import { getOrCreateDefaultSender } from './services/mailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Bull-Board Dashboard
app.use('/admin/queues', setupBullBoard());

// Root & Health Check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'ReachInbox Email Job Scheduler Backend',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      bullBoard: '/admin/queues',
      emails: '/api/emails',
      stats: '/api/stats',
    },
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/emails', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);

// Server startup & background worker boot
async function startServer() {
  try {
    // 1. Initialize Elasticsearch (with fallback)
    await initElasticsearch();

    // 2. Ensure at least one Ethereal sender account is available
    await getOrCreateDefaultSender().catch((err) => {
      console.warn('[Mailer] Initial Ethereal provisioning warning:', err.message);
    });

    // 3. Start BullMQ concurrent Worker
    startEmailWorker();

    // 4. Start HTTP Server
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 ReachInbox Email Scheduler Backend running on port ${PORT}`);
      console.log(`📊 Bull-Board Queue Dashboard: http://localhost:${PORT}/admin/queues`);
      console.log(`✉️  API Root: http://localhost:${PORT}/api/emails`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

startServer();
