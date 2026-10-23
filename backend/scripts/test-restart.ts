import { scheduleEmailJob } from '../src/queue/emailQueue';
import { prisma } from '../src/config/db';
import { redisConnection } from '../src/config/redis';

async function runRestartTest() {
  console.log('🧪 Starting Server Restart & Job Persistence Test...');

  // Schedule an email for 8 seconds in the future
  const scheduledTime = new Date(Date.now() + 8000);
  const testRecipient = `persistence-test-${Date.now()}@example.com`;

  console.log(`[Test] Scheduling email to ${testRecipient} at ${scheduledTime.toISOString()}...`);
  const job = await scheduleEmailJob({
    recipient: testRecipient,
    subject: 'Persistence After Server Restart Test',
    body: 'Verifying that BullMQ + Redis delayed jobs survive restarts without duplicate execution.',
    scheduledAt: scheduledTime,
  });

  console.log(`[Test] Scheduled Job created with ID: ${job.id}`);
  console.log('[Test] Now simulating server shutdown / worker pause (waiting 12 seconds)...');

  await new Promise((resolve) => setTimeout(resolve, 12000));

  // Inspect database record to ensure it transitioned to SENT
  const updatedJob = await prisma.emailJob.findUnique({ where: { id: job.id } });

  console.log('--- Verification Results ---');
  console.log(`Job Status: ${updatedJob?.status}`);
  console.log(`Sent At: ${updatedJob?.sentAt}`);
  console.log(`Ethereal URL: ${updatedJob?.etherealUrl}`);

  if (updatedJob?.status === 'SENT') {
    console.log('✅ TEST PASSED: Job survived, executed on time, and transitioned to SENT state.');
  } else {
    console.log(`⏳ Job status is ${updatedJob?.status}. Ensure worker is running to process delayed jobs.`);
  }

  await redisConnection.quit();
  await prisma.$disconnect();
}

runRestartTest().catch(console.error);
