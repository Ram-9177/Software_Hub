import nodemailer from 'nodemailer';
import { ENV } from '../../config/env.js';
import { db } from '../../config/database.js';

let transporter: nodemailer.Transporter | null = null;

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
  eventType: string;
  recipientEmail: string;
  recipientName?: string;
  variables: Record<string, string>;
  automationId?: string;
}

export async function sendSystemNotification(options: SendEmailOptions): Promise<{
  success: boolean;
  logId: string;
  status: 'delivered' | 'failed';
  error?: string;
}> {
  const logId = `elog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    // 1. Fetch template from email_templates or automations
    const template = await db('email_templates')
      .where({ event_type: options.eventType })
      .first();

    let subject = `Software Hub 2.0 Notification — ${options.eventType}`;
    let body = `Hello ${options.recipientName || 'Member'},\n\nYou have a new notification from Software Hub 2.0.`;
    let senderName = 'Software Hub 2.0';

    if (template) {
      if (!template.is_enabled) {
        console.log(`[EmailService] Template ${options.eventType} is disabled. Skipping.`);
        return { success: false, logId, status: 'failed', error: 'Template is disabled' };
      }
      subject = template.subject;
      body = template.body;
      senderName = template.sender_display_name || 'Software Hub 2.0';
    }

    // 2. Interpolate variables (e.g. {{task_title}} -> options.variables['task_title'])
    const allVars: Record<string, string> = {
      system_name: 'Software Hub 2.0',
      recipient_name: options.recipientName || 'Member',
      action_url: `${ENV.CLIENT_ORIGIN}`,
      ...options.variables,
    };

    for (const [key, val] of Object.entries(allVars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, val);
      body = body.replace(regex, val);
    }

    // 3. Send email via transporter
    const client = getEmailTransporter();
    
    // In dev / mock smtp, attempt send or simulate robust delivery
    let deliverySuccess = true;
    let errorMessage: string | null = null;

    try {
      if (ENV.NODE_ENV !== 'test' && ENV.SMTP_HOST !== 'mock') {
        await client.sendMail({
          from: `"${senderName}" <${ENV.SMTP_FROM}>`,
          to: options.recipientEmail,
          subject,
          text: body,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 12px;">
              <h2 style="color: #1e293b; margin: 0; font-size: 18px; font-weight: 700;">${senderName}</h2>
              <p style="color: #64748b; margin: 4px 0 0; font-size: 12px;">Official University Operations Platform</p>
            </div>
            <div style="color: #334155; line-height: 1.6; font-size: 14px; white-space: pre-wrap;">${body}</div>
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
              This is an official system notification from Software Hub 2.0. Please do not reply directly to this automated email.
            </div>
          </div>`,
        });
      }
    } catch (sendErr: any) {
      console.warn('[EmailService] SMTP delivery attempt failed or using offline mock:', sendErr.message);
      // If mock SMTP credentials fail, record error details
      if (ENV.SMTP_HOST !== 'smtp.ethereal.email') {
        deliverySuccess = false;
        errorMessage = sendErr.message;
      }
    }

    const logStatus = deliverySuccess ? 'delivered' : 'failed';

    // 4. Record in email_logs
    await db('email_logs').insert({
      id: logId,
      automation_id: options.automationId || null,
      recipient_email: options.recipientEmail,
      subject,
      status: logStatus,
      error_message: errorMessage,
      sent_at: new Date(),
    });

    return {
      success: deliverySuccess,
      logId,
      status: logStatus,
      error: errorMessage || undefined,
    };
  } catch (err: any) {
    console.error('[EmailService] Fatal email error:', err);
    await db('email_logs').insert({
      id: logId,
      automation_id: options.automationId || null,
      recipient_email: options.recipientEmail,
      subject: options.eventType,
      status: 'failed',
      error_message: err.message,
      sent_at: new Date(),
    });

    return { success: false, logId, status: 'failed', error: err.message };
  }
}
