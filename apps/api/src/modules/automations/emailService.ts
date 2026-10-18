import nodemailer from 'nodemailer';
import { ENV } from '../../config/env.js';
import { db } from '../../config/database.js';

let transporter: nodemailer.Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(
    ENV.SMTP_HOST &&
    ENV.SMTP_HOST !== 'mock' &&
    ENV.SMTP_USER &&
    ENV.SMTP_PASS
  );
}

export function getEmailTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_PORT === 465,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  ruleKey?: string;
  eventType?: string;
  recipientEmail: string;
  recipientName?: string;
  recipientUserId?: string;
  variables: Record<string, string>;
  idempotencyKey?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export interface SendResult {
  success: boolean;
  logId: string;
  status: 'delivered' | 'failed' | 'skipped';
  error?: string;
}

/**
 * Background email delivery with idempotency, user muting checks, and retries with backoff.
 */
export async function sendSystemNotification(options: SendEmailOptions): Promise<SendResult> {
  const logId = `elog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanEmail = options.recipientEmail.trim().toLowerCase();

  // 1. Check user muting preference
  if (options.recipientUserId || cleanEmail) {
    const user = options.recipientUserId
      ? await db('users').where({ id: options.recipientUserId }).first()
      : await db('users').whereRaw('LOWER(email) = ?', [cleanEmail]).first();

    if (user?.email_notifications_muted) {
      console.log(`[EmailService] User ${cleanEmail} has muted email notifications. Skipping.`);
      return { success: true, logId, status: 'skipped', error: 'User muted notifications' };
    }
  }

  const ruleKey = options.ruleKey || options.eventType || 'general';

  // 2. Check automation rule enabled status & template
  const automation = await db('automations').where({ key: ruleKey }).first();
  if (automation && !automation.is_enabled) {
    console.log(`[EmailService] Rule ${ruleKey} is disabled by administrator. Skipping.`);
    return { success: true, logId, status: 'skipped', error: 'Automation rule disabled' };
  }

  // 3. Idempotency Check: Don't send same email twice
  const idempotencyKey = options.idempotencyKey || `${ruleKey}:${cleanEmail}:${Date.now()}`;
  const existingLog = await db('email_logs')
    .where({ idempotency_key: idempotencyKey, status: 'delivered' })
    .first();

  if (existingLog) {
    console.log(`[EmailService] Idempotency match for key ${idempotencyKey}. Email already sent.`);
    return { success: true, logId: existingLog.id, status: 'delivered' };
  }

  // 4. Resolve Subject and Body Template
  let subject = automation?.email_subject_template || `Central Office Notification — ${ruleKey}`;
  let body = automation?.email_body_template || `Hello {{recipient_name}},\n\nYou have an official notification from the Central Office.`;
  const senderName = 'Software Hub 2.0 Central Office';

  // Fallback check in email_templates if needed
  if (!automation) {
    const tmpl = await db('email_templates').where({ event_type: options.ruleKey }).first();
    if (tmpl) {
      if (!tmpl.is_enabled) {
        return { success: true, logId, status: 'skipped', error: 'Template is disabled' };
      }
      subject = tmpl.subject;
      body = tmpl.body;
    }
  }

  // Interpolate Variables
  const allVars: Record<string, string> = {
    system_name: 'Software Hub 2.0 Command Center',
    recipient_name: options.recipientName || 'Intern / Member',
    action_url: ENV.CLIENT_ORIGIN || 'http://localhost:5173',
    ...options.variables,
  };

  for (const [key, val] of Object.entries(allVars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const singleRegex = new RegExp(`\\{${key}\\}`, 'g');
    subject = subject.replace(regex, val).replace(singleRegex, val);
    body = body.replace(regex, val).replace(singleRegex, val);
  }

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 19px; font-weight: 800;">${senderName}</h2>
        <p style="color: #64748b; margin: 4px 0 0; font-size: 12px; font-weight: 500;">Official Work-Management & Central Operations Platform</p>
      </div>
      <div style="color: #334155; line-height: 1.65; font-size: 14px; white-space: pre-wrap;">${body}</div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
        This automated transmission was dispatched according to University Central Office policies.
      </div>
    </div>
  `;

  // 5. Send with retry and exponential backoff
  const maxAttempts = 3;
  let attempts = 0;
  let delivered = false;
  let lastError: string | null = null;

  while (attempts < maxAttempts && !delivered) {
    attempts++;
    try {
      if (ENV.NODE_ENV !== 'test' && isSmtpConfigured()) {
        const client = getEmailTransporter();
        await client.sendMail({
          from: `"${senderName}" <${ENV.SMTP_FROM}>`,
          to: cleanEmail,
          subject,
          text: body,
          html: htmlBody,
          attachments: options.attachments,
        });
      }
      delivered = true;
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[EmailService] Attempt ${attempts} failed for ${cleanEmail}: ${lastError}`);
      if (attempts < maxAttempts) {
        // Exponential backoff: 300ms, 900ms
        await new Promise((r) => setTimeout(r, 300 * Math.pow(3, attempts - 1)));
      }
    }
  }

  const finalStatus = delivered ? 'delivered' : 'failed';

  // 6. Record in email_logs
  try {
    await db('email_logs').insert({
      id: logId,
      rule: options.ruleKey,
      automation_id: automation?.id || null,
      recipient: cleanEmail,
      recipient_email: cleanEmail,
      subject,
      status: finalStatus,
      attempts,
      error: lastError,
      error_message: lastError,
      sent_time: delivered ? new Date() : null,
      sent_at: new Date(),
      idempotency_key: idempotencyKey,
    });
  } catch (dbErr) {
    console.error('[EmailService] Failed to insert email_log record:', dbErr);
  }

  return {
    success: delivered,
    logId,
    status: finalStatus,
    error: lastError || undefined,
  };
}
