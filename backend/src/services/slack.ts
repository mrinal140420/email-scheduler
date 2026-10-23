import axios from 'axios';
import { prisma } from '../config/db';

interface RateLimitAlertParams {
  senderEmail: string;
  senderId: string;
  hourlyLimit: number;
  currentCount: number;
  nextAvailableWindow: Date;
  delayedJobsCount?: number;
}

export async function sendSlackRateLimitNotification({
  senderEmail,
  senderId,
  hourlyLimit,
  currentCount,
  nextAvailableWindow,
  delayedJobsCount = 1,
}: RateLimitAlertParams) {
  // Check if any user or system has configured a Slack webhook or token
  const user = await prisma.user.findFirst({
    where: {
      slackWebhook: {
        not: null,
      },
    },
  });

  const webhookUrl = user?.slackWebhook || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(`[Slack] Rate limit reached for ${senderEmail}, but no Slack webhook is connected. Skipping notification safely.`);
    return { sent: false, reason: 'no_webhook_connected' };
  }

  const payload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 ReachInbox Alert: Hourly Email Rate Limit Reached',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Attention:* Sender account *${senderEmail}* has reached its maximum hourly sending threshold.`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Hourly Limit:*\n${hourlyLimit} emails/hour`,
          },
          {
            type: 'mrkdwn',
            text: `*Emails Sent in Current Window:*\n${currentCount} emails`,
          },
          {
            type: 'mrkdwn',
            text: `*Affected / Rescheduled Jobs:*\n${delayedJobsCount} job(s)`,
          },
          {
            type: 'mrkdwn',
            text: `*Next Available Send Window:*\n${nextAvailableWindow.toLocaleTimeString()} (${nextAvailableWindow.toLocaleDateString()})`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚡ *Zero Dropped Jobs:* Outbox Scheduler automatically postponed upcoming emails to the next hour window while preserving sending order.',
          },
        ],
      },
    ],
  };

  try {
    const response = await axios.post(webhookUrl, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`[Slack] Live alert dispatched successfully for sender ${senderEmail} (status: ${response.status})`);
    return { sent: true, status: response.status };
  } catch (err: any) {
    console.error('[Slack] Failed to dispatch webhook alert:', err.message);
    return { sent: false, error: err.message };
  }
}

export async function sendSlackTestAlert(webhookUrl: string) {
  const payload = {
    text: '🚀 *ReachInbox Test Notification:* Slack webhook is successfully connected and verified! Rate limit alerts will be delivered to this channel.',
  };

  const response = await axios.post(webhookUrl, payload, {
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' },
  });

  return response.data;
}
