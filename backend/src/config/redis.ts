import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const useTls = process.env.REDIS_TLS === 'true' || redisHost.includes('upstash.io');

export const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  tls: useTls ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${redisHost}:${redisPort} (TLS: ${useTls})`);
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection Error:', err.message);
});
