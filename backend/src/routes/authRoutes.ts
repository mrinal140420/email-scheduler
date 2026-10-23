import { Router, Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/db';
import { sendSlackTestAlert } from '../services/slack';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';

/**
 * GET /api/auth/google/url
 * Returns Google OAuth Authorization URL
 */
router.get('/google/url', (_req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    // If client ID is not configured, supply mock/demo mode URL
    return res.json({
      configured: false,
      url: `${FRONTEND_URL}/login?demo_auth=true`,
      message: 'Google Client ID not provided in environment. Demo login fallback enabled.',
    });
  }

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: GOOGLE_CALLBACK_URL,
    client_id: GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options).toString();
  return res.json({ configured: true, url: `${rootUrl}?${qs}` });
});

/**
 * GET /api/auth/google/callback
 * Exchanges authorization code for Google profile
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
  }

  try {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    });

    const { access_token } = tokenResponse.data;
    const userProfileResponse = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = userProfileResponse.data;

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name,
        avatar: profile.picture,
      },
      create: {
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
      },
    });

    const userTokenPayload = Buffer.from(
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      })
    ).toString('base64');

    return res.redirect(`${FRONTEND_URL}?token=${userTokenPayload}`);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error.response?.data || error.message);
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
});

/**
 * GET /api/auth/slack/url
 * Returns Slack OAuth URL or Webhook setup
 */
router.get('/slack/url', (_req: Request, res: Response) => {
  if (!SLACK_CLIENT_ID) {
    return res.json({
      configured: false,
      message: 'Slack OAuth App credentials not configured in env. Webhook connection mode enabled.',
    });
  }

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=incoming-webhook,chat:write&redirect_uri=${encodeURIComponent(
    'http://localhost:5000/api/auth/slack/callback'
  )}`;

  return res.json({ configured: true, url: slackAuthUrl });
});

/**
 * POST /api/auth/slack/webhook
 * Manually connect or update Slack incoming webhook
 */
router.post('/slack/webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, channel, userId } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    // Save webhook to primary user or system record
    const targetUser = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    if (targetUser) {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          slackWebhook: webhookUrl,
          slackChannel: channel || '#general',
        },
      });
    }

    return res.json({ success: true, message: 'Slack webhook connected successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/slack/test
 * Dispatches test notification to verify Slack connection
 */
router.post('/slack/test', async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    const user = await prisma.user.findFirst({
      where: { slackWebhook: { not: null } },
    });

    const targetUrl = webhookUrl || user?.slackWebhook || process.env.SLACK_WEBHOOK_URL;

    if (!targetUrl) {
      return res.status(400).json({ error: 'No Slack webhook configured to test.' });
    }

    await sendSlackTestAlert(targetUrl);
    return res.json({ success: true, message: 'Test notification sent to Slack!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to dispatch test notification' });
  }
});

/**
 * GET /api/auth/slack/status
 * Check current Slack connection state
 */
router.get('/slack/status', async (_req: Request, res: Response) => {
  try {
    const userWithSlack = await prisma.user.findFirst({
      where: { slackWebhook: { not: null } },
    });

    const isConnected = !!(userWithSlack?.slackWebhook || process.env.SLACK_WEBHOOK_URL);

    return res.json({
      connected: isConnected,
      channel: userWithSlack?.slackChannel || '#email-alerts',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/slack/disconnect
 * Safely disconnects Slack
 */
router.post('/slack/disconnect', async (_req: Request, res: Response) => {
  try {
    await prisma.user.updateMany({
      data: {
        slackWebhook: null,
        slackToken: null,
      },
    });
    return res.json({ success: true, message: 'Slack disconnected successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
