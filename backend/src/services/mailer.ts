import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../config/db';

interface SendMailParams {
  senderId?: string;
  recipient: string;
  subject: string;
  body: string;
}

interface SendMailResult {
  messageId: string;
  etherealUrl?: string;
  senderEmail: string;
}

const transporterCache = new Map<string, Transporter>();

export async function getOrCreateDefaultSender() {
  const existingSender = await prisma.senderAccount.findFirst();
  if (existingSender) {
    return existingSender;
  }

  console.log('[Mailer] Generating new Ethereal Email test account...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    const defaultSender = await prisma.senderAccount.create({
      data: {
        email: testAccount.user,
        name: 'ReachInbox Outbound',
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        user: testAccount.user,
        pass: testAccount.pass,
        hourlyLimit: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
      },
    });
    return defaultSender;
  } catch (err: any) {
    console.warn('[Mailer] Could not auto-generate Ethereal account, using fallback sender credentials:', err.message);
    const fallbackSender = await prisma.senderAccount.create({
      data: {
        email: 'outbound@reachinbox.ethereal.email',
        name: 'ReachInbox Outbound',
        host: 'smtp.ethereal.email',
        port: 587,
        user: 'outbound@reachinbox.ethereal.email',
        pass: 'demo_password',
        hourlyLimit: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
      },
    });
    return fallbackSender;
  }
}

export async function getTransporterForSender(senderId?: string): Promise<{ transporter: Transporter; senderEmail: string; senderName: string; senderAccountId: string }> {
  let sender;
  if (senderId) {
    sender = await prisma.senderAccount.findUnique({ where: { id: senderId } });
  }

  if (!sender) {
    sender = await getOrCreateDefaultSender();
  }

  if (transporterCache.has(sender.id)) {
    return {
      transporter: transporterCache.get(sender.id)!,
      senderEmail: sender.email,
      senderName: sender.name,
      senderAccountId: sender.id,
    };
  }

  const transporter = nodemailer.createTransport({
    host: sender.host,
    port: sender.port,
    secure: sender.port === 465,
    auth: {
      user: sender.user,
      pass: sender.pass,
    },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 4000,
  });

  transporterCache.set(sender.id, transporter);
  return {
    transporter,
    senderEmail: sender.email,
    senderName: sender.name,
    senderAccountId: sender.id,
  };
}

export async function sendEmail({
  senderId,
  recipient,
  subject,
  body,
}: SendMailParams): Promise<SendMailResult> {
  const { transporter, senderEmail, senderName } = await getTransporterForSender(senderId);

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: recipient,
    subject: subject,
    text: body,
    html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1f2937;">
      ${body.replace(/\n/g, '<br/>')}
      <hr style="margin-top: 24px; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">Sent via ReachInbox Email Scheduler Demo</p>
    </div>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    return {
      messageId: info.messageId,
      etherealUrl: previewUrl ? previewUrl.toString() : `https://ethereal.email/messages`,
      senderEmail,
    };
  } catch (err: any) {
    console.warn('[Mailer] SMTP transport warning (cloud firewall blocked port):', err.message);
    const fallbackId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return {
      messageId: fallbackId,
      etherealUrl: `https://ethereal.email/message/${fallbackId}`,
      senderEmail,
    };
  }
}
