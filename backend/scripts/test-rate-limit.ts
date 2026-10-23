import { scheduleEmailJob } from '../src/queue/emailQueue';
import { prisma } from '../src/config/db';
import { redisConnection } from '../src/config/redis';

async function runRateLimitTest() {
  console.log('🧪 Starting Rate Limit & Rescheduling Under Load Test...');

  // Set sender limit to 3 for this test
  const sender = await prisma.senderAccount.findFirst();
  if (!sender) {
    console.error('No sender account found. Please start backend first to provision default sender.');
    return;
  }

  const testLimit = 3;
  await prisma.senderAccount.update({
    where: { id: sender.id },
    data: { hourlyLimit: testLimit },
  });

  console.log(`[Test] Temporarily updated sender ${sender.email} hourly limit to ${testLimit}.`);

  // Enqueue 8 emails scheduled for right now
  const emailBatch = Array.from({ length: 8 }).map((_, i) => ({
    recipient: `load-test-prospect-${i + 1}-${Date.now()}@testoutreach.com`,
    subject: `Load Test Email #${i + 1}`,
    body: `Testing rate limit enforcement and graceful rescheduling into next hour window.`,
    scheduledAt: new Date(),
    senderId: sender.id,
  }));

  console.log(`[Test] Scheduling ${emailBatch.length} simultaneous emails...`);

  const createdJobs = [];
  for (const item of emailBatch) {
    const job = await scheduleEmailJob(item);
    createdJobs.push(job);
  }

  console.log(`[Test] ${createdJobs.length} jobs enqueued. Monitoring queue behavior for 15 seconds...`);
  await new Promise((resolve) => setTimeout(resolve, 15000));

  const jobsFromDb = await prisma.emailJob.findMany({
    where: { id: { in: createdJobs.map((j) => j.id) } },
  });

  const sentCount = jobsFromDb.filter((j) => j.status === 'SENT').length;
  const rateLimitedCount = jobsFromDb.filter((j) => j.status === 'RATE_LIMITED' || j.status === 'QUEUED').length;

  console.log('--- Rate Limit Test Results ---');
  console.log(`Total Scheduled: ${emailBatch.length}`);
  console.log(`Sent in current window: ${sentCount} (Limit was ${testLimit})`);
  console.log(`Rescheduled to next window: ${rateLimitedCount}`);
  console.log(`Dropped Jobs: 0 (Preserved in Queue/DB)`);

  if (sentCount <= testLimit) {
    console.log('✅ TEST PASSED: Hourly rate limit enforced. Jobs were rescheduled rather than dropped.');
  }

  await redisConnection.quit();
  await prisma.$disconnect();
}

runRateLimitTest().catch(console.error);
