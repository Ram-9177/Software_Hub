import nodemailer from 'nodemailer';
import { ENV } from '../../config/env.js';
import { db } from '../../config/database.js';

let transporter: nodemailer.Transporter | null = null;

export const POWER_AUTOMATE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    to: { type: 'string', description: 'Recipient email address' },
    from: { type: 'string', description: 'Sender email account (sriram@smru.edu.in)' },
    senderEmail: { type: 'string', description: 'Sender email (sriram@smru.edu.in)' },
    senderName: { type: 'string', description: 'Sender display name (Sri Ram)' },
    recipientName: { type: 'string', description: 'Full name of recipient' },
    subject: { type: 'string', description: 'Email subject line' },
    body: { type: 'string', description: 'Plaintext email content' },
    htmlBody: { type: 'string', description: 'Formatted HTML email content' },
    step: { type: 'string', description: 'System event step key (e.g. new_task_assigned, welcome_email)' },
    actionUrl: { type: 'string', description: 'Direct link into Software Hub' },
    systemName: { type: 'string', description: 'Application title (Software Hub)' },
    timestamp: { type: 'string', description: 'ISO 8601 UTC timestamp of trigger' },
    variables: { type: 'object', description: 'Interpolated template key-value variables' },
  },
  required: ['to', 'subject', 'body'],
};

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

export async function getPowerAutomateConfig(): Promise<{
  webhookUrl: string;
  isEnabled: boolean;
  isConfigured: boolean;
}> {
  try {
    const urlSetting = await db('app_settings').where({ key: 'power_automate_webhook_url' }).first();
    const enabledSetting = await db('app_settings').where({ key: 'power_automate_enabled' }).first();

    const webhookUrl = urlSetting?.value?.trim() || ENV.POWER_AUTOMATE_WEBHOOK_URL || '';
    const isConfigured = Boolean(webhookUrl);
    const isEnabled = enabledSetting?.value === 'false' ? false : (isConfigured || ENV.POWER_AUTOMATE_ENABLED);

    return { webhookUrl, isEnabled, isConfigured };
  } catch {
    const webhookUrl = ENV.POWER_AUTOMATE_WEBHOOK_URL || '';
    return {
      webhookUrl,
      isConfigured: Boolean(webhookUrl),
      isEnabled: ENV.POWER_AUTOMATE_ENABLED,
    };
  }
}

export async function sendViaPowerAutomate(
  payload: {
    to: string;
    recipientName: string;
    subject: string;
    body: string;
    htmlBody: string;
    step: string;
    actionUrl: string;
    systemName: string;
    timestamp: string;
    variables: Record<string, string>;
  },
  webhookUrl: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SoftwareHub-PowerAutomate/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status === 202 || res.status === 200) {
      return { success: true, statusCode: res.status };
    } else {
      const responseText = await res.text().catch(() => '');
      return {
        success: false,
        statusCode: res.status,
        error: `Power Automate HTTP ${res.status}: ${responseText.slice(0, 300) || res.statusText}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.name === 'AbortError' ? 'Power Automate request timed out (12s)' : (err?.message || String(err)),
    };
  }
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
  channel?: 'power_automate' | 'smtp' | 'simulated';
  error?: string;
}

/**
 * Unified email delivery pipeline with Microsoft Power Automate (No Entra ID) priority,
 * automatic fallback to SMTP / simulated delivery, idempotency, and full delivery audit logging.
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

  // 3. Idempotency Check: Don't send duplicate emails within reasonable window
  const idempotencyKey = options.idempotencyKey || `${ruleKey}:${cleanEmail}:${Date.now()}`;
  const existingLog = await db('email_logs')
    .where({ idempotency_key: idempotencyKey, status: 'delivered' })
    .first();

  if (existingLog) {
    console.log(`[EmailService] Idempotency match for key ${idempotencyKey}. Email already sent.`);
    return { success: true, logId: existingLog.id, status: 'delivered', channel: existingLog.channel || 'smtp' };
  }

  // 4. Resolve Subject and Body Template
  let subject = automation?.email_subject_template;
  let body = automation?.email_body_template;
  const senderName = 'Sri Ram — Software Hub';
  const senderEmail = 'sriram@smru.edu.in';

  // Fallback check in email_templates if needed
  if (!subject || !body) {
    const tmpl = await db('email_templates').where({ event_type: ruleKey }).first();
    if (tmpl) {
      if (!tmpl.is_enabled) {
        return { success: true, logId, status: 'skipped', error: 'Template is disabled' };
      }
      subject = subject || tmpl.subject;
      body = body || tmpl.body;
    }
  }

  // Built-in Software Hub fallbacks
  if (!subject || !body) {
    const upperKey = String(ruleKey).toUpperCase();
    if (upperKey === 'WELCOME_EMAIL') {
      subject = subject || 'Welcome to Software Hub — {{recipient_name}}';
      body = body || 'Hello {{recipient_name}},\n\nWelcome to Software Hub! Your account has been provisioned as {{role}} by {{inviter_name}}.\n\nClick the link below to activate your account and set your password:\n{{invite_link}}\n\nOpen Software Hub: {{action_url}}';
    } else if (upperKey === 'EMAIL_VERIFICATION') {
      subject = subject || 'Verify Your Software Hub Account Email';
      body = body || 'Hello {{recipient_name}},\n\nPlease verify your email address to complete your Software Hub account setup.\n\nClick here to verify: {{verification_link}}\n\nThis link is valid for 24 hours.\n\nOpen Software Hub: {{action_url}}';
    } else if (upperKey === 'PASSWORD_RESET') {
      subject = subject || 'Reset Your Software Hub Account Password';
      body = body || 'Hello {{recipient_name}},\n\nA password reset request was received for your Software Hub account.\n\nClick the link below to set a new password:\n{{reset_link}}\n\nIf you did not make this request, you can safely ignore this email.\n\nOpen Software Hub: {{action_url}}';
    } else {
      subject = subject || `Software Hub Notification — ${ruleKey}`;
      body = body || `Hello {{recipient_name}},\n\nYou have an official notification from Software Hub.`;
    }
  }

  // Interpolate Variables
  const allVars: Record<string, string> = {
    system_name: 'Software Hub',
    recipient_name: options.recipientName || 'Member',
    sender_name: senderName,
    sender_email: senderEmail,
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
      <div style="border-bottom: 2px solid #0d315c; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0d315c; margin: 0; font-size: 19px; font-weight: 800;">${senderName}</h2>
        <p style="color: #64748b; margin: 4px 0 0; font-size: 12px; font-weight: 500;">
          Dispatched from <strong>${senderEmail}</strong> · Software Hub Operations Platform
        </p>
      </div>
      <div style="color: #1e293b; line-height: 1.65; font-size: 14px; white-space: pre-wrap;">${body}</div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
        This automated transmission was dispatched according to Software Hub institutional policies from account <strong>${senderEmail}</strong> via Microsoft Power Automate.
      </div>
    </div>
  `;

  // 5. Check Microsoft Power Automate delivery first
  const paConfig = await getPowerAutomateConfig();
  let delivered = false;
  let activeChannel: 'power_automate' | 'smtp' | 'simulated' = 'simulated';
  let lastError: string | null = null;

  // Check for dummy test domains to prevent Office 365 NDR bouncebacks
  const isDummyTestDomain =
    cleanEmail.endsWith('@domain.com') ||
    cleanEmail.endsWith('@example.com') ||
    cleanEmail.endsWith('@test.com') ||
    cleanEmail.endsWith('.invalid');

  const shouldSendPowerAutomate =
    paConfig.isEnabled &&
    paConfig.webhookUrl &&
    !isDummyTestDomain &&
    process.env.NODE_ENV !== 'test';

  if (shouldSendPowerAutomate) {
    const paPayload = {
      to: cleanEmail,
      from: senderEmail,
      senderEmail,
      senderName,
      recipientName: options.recipientName || 'Member',
      subject,
      body,
      htmlBody,
      step: ruleKey,
      actionUrl: allVars.action_url,
      systemName: 'Software Hub',
      timestamp: new Date().toISOString(),
      variables: allVars,
    };

    const paResult = await sendViaPowerAutomate(paPayload, paConfig.webhookUrl);
    if (paResult.success) {
      delivered = true;
      activeChannel = 'power_automate';
      console.log(`[PowerAutomate] Delivered "${subject}" to ${cleanEmail} via Power Automate Webhook (No Entra ID) [HTTP ${paResult.statusCode}]`);

      // Update last dispatched status in app_settings
      try {
        await db('app_settings').where({ key: 'power_automate_last_dispatched_at' }).update({ value: new Date().toISOString() });
        await db('app_settings').where({ key: 'power_automate_last_status' }).update({ value: 'delivered' });
      } catch {
        // non-blocking
      }
    } else {
      lastError = paResult.error || 'Power Automate dispatch failed';
      console.warn(`[EmailService] Power Automate dispatch failed: ${lastError}. Falling back to secondary delivery.`);
      try {
        await db('app_settings').where({ key: 'power_automate_last_status' }).update({ value: `failed: ${lastError}` });
      } catch {
        // non-blocking
      }
    }
  }

  // 6. Secondary fallback to SMTP if not yet delivered
  if (!delivered) {
    if (ENV.NODE_ENV !== 'test' && !isSmtpConfigured()) {
      lastError = lastError || 'No active email channel configured. Configure Microsoft Power Automate Webhook or SMTP credentials in Central Admin.';
      console.warn(`[EmailService] Cannot dispatch email to ${cleanEmail}: ${lastError}`);
    } else {
      const maxAttempts = 3;
      let attempts = 0;

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
            activeChannel = 'smtp';
            delivered = true;
          } else if (ENV.NODE_ENV === 'test') {
            // Test runner simulation mode
            activeChannel = 'simulated';
            delivered = true;
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          console.warn(`[EmailService] Attempt ${attempts} fallback failed for ${cleanEmail}: ${lastError}`);
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 300 * Math.pow(3, attempts - 1)));
          }
        }
      }
    }
  }

  const finalStatus = delivered ? 'delivered' : 'failed';

  // 7. Record in email_logs
  try {
    const logData: Record<string, any> = {
      id: logId,
      rule: options.ruleKey || ruleKey,
      automation_id: automation?.id || null,
      recipient: cleanEmail,
      recipient_email: cleanEmail,
      subject,
      status: finalStatus,
      attempts: 1,
      error: lastError,
      error_message: lastError,
      sent_time: delivered ? new Date() : null,
      sent_at: new Date(),
      idempotency_key: idempotencyKey,
    };

    // Include channel if supported by schema
    const hasChannel = await db.schema.hasColumn('email_logs', 'channel').catch(() => false);
    if (hasChannel) {
      logData.channel = activeChannel;
    }

    await db('email_logs').insert(logData);
  } catch (dbErr) {
    console.error('[EmailService] Failed to insert email_log record:', dbErr);
  }

  return {
    success: delivered,
    logId,
    status: finalStatus,
    channel: activeChannel,
    error: lastError || undefined,
  };
}
