import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

prisma.$connect()
  .then(() => {
    console.log('[Database] Connected to PostgreSQL via Prisma');
  })
  .catch((err) => {
    console.error('[Database] Connection failed:', err.message);
  });
