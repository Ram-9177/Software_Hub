import nodemailer from 'nodemailer';
import { ENV } from './env.js';

let transporter: nodemailer.Transporter;

export function getMailer(): nodemailer.Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_PORT === 465,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content?: any; path?: string }>;
}) {
  const mail = getMailer();
  try {
    const info = await mail.sendMail({
      from: ENV.SMTP_FROM,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
      attachments,
    });
    console.log(`[Email Dispatch] Sent to ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[Email Dispatch] Failed to deliver email to ${to} | Subject: "${subject}":`, error?.message || error);
    return { success: false, error: error?.message || 'SMTP delivery failed' };
  }
}

