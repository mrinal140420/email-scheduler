export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  slackWebhook?: string;
  slackChannel?: string;
}

export interface SenderAccount {
  id: string;
  email: string;
  name: string;
  hourlyLimit: number;
}

export type JobStatus = 'PENDING' | 'QUEUED' | 'RATE_LIMITED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface EmailJob {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  status: JobStatus;
  bullJobId?: string;
  attempts: number;
  errorMessage?: string;
  etherealUrl?: string;
  createdAt: string;
  sender?: SenderAccount;
}

export interface QueueStats {
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  database: {
    scheduled: number;
    sent: number;
    failed: number;
    senders: number;
  };
  config: {
    concurrency: number;
    delayBetweenSendsMs: number;
    maxEmailsPerHour: number;
  };
}
