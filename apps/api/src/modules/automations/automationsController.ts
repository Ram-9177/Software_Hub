import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import {
  isSmtpConfigured,
  sendSystemNotification,
  getPowerAutomateConfig,
  sendViaPowerAutomate,
  POWER_AUTOMATE_JSON_SCHEMA,
} from './emailService.js';
import { logAdminAction } from '../users/userController.js';
import {
  runDueTomorrowJob,
  runOverdueJob,
  runNotCheckedInJob,
  runMonthEndReviewJob,
  runWeeklySummaryJob,
} from './scheduler.js';
import { ENV } from '../../config/env.js';

export async function getAutomations(_req: Request, res: Response) {
  const automations = await db('automations').orderBy('id', 'asc');

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const sentThisWeek = await db('email_logs')
    .where('sent_at', '>=', oneWeekAgo)
    .where({ status: 'delivered' })
    .count('id as count')
    .first();

  const totalDelivered = await db('email_logs')
    .where({ status: 'delivered' })
    .count('id as count')
    .first();

  const totalFailed = await db('email_logs')
    .where({ status: 'failed' })
    .count('id as count')
    .first();

  const totalLogs = await db('email_logs').count('id as count').first();

  const smtpConfigured = isSmtpConfigured();
  const paConfig = await getPowerAutomateConfig();
  const lastDispatched = await db('app_settings').where({ key: 'power_automate_last_dispatched_at' }).first().catch(() => null);
  const lastStatus = await db('app_settings').where({ key: 'power_automate_last_status' }).first().catch(() => null);

  const hasChannel = await db.schema.hasColumn('email_logs', 'channel').catch(() => false);
  let paCount = 0;
  if (hasChannel) {
    const resCount = await db('email_logs').where({ channel: 'power_automate', status: 'delivered' }).count('id as count').first().catch(() => null);
    paCount = Number(resCount?.count || 0);
  }

  return res.json({
    metrics: {
      sentThisWeek: Number(sentThisWeek?.count || 0),
      totalDelivered: Number(totalDelivered?.count || 0),
      totalFailed: Number(totalFailed?.count || 0),
      totalCount: Number(totalLogs?.count || 0),
      powerAutomateDelivered: paCount,
    },
    smtpStatus: {
      isConfigured: smtpConfigured,
      host: ENV.SMTP_HOST || 'Not set',
      port: ENV.SMTP_PORT || 587,
      from: ENV.SMTP_FROM || 'Not set',
      error: smtpConfigured
        ? null
        : 'SMTP is not configured in environment variables. Email automations run in simulation/fallback mode.',
    },
    powerAutomateStatus: {
      isConfigured: paConfig.isConfigured,
      isEnabled: paConfig.isEnabled,
      webhookUrl: paConfig.webhookUrl,
      lastDispatchedAt: lastDispatched?.value || null,
      lastStatus: lastStatus?.value || null,
      totalDispatched: paCount,
      schema: POWER_AUTOMATE_JSON_SCHEMA,
    },
    automations: automations.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      triggerEvent: a.trigger_event,
      scheduleCron: a.schedule_cron,
      recipientDescription: a.recipient_description,
      channel: a.channel,
      isEnabled: Boolean(a.is_enabled),
      emailSubjectTemplate: a.email_subject_template,
      emailBodyTemplate: a.email_body_template,
      updatedAt: a.updated_at,
    })),
  });
}

export async function getPowerAutomateStatus(_req: Request, res: Response) {
  const paConfig = await getPowerAutomateConfig();
  const lastDispatched = await db('app_settings').where({ key: 'power_automate_last_dispatched_at' }).first().catch(() => null);
  const lastStatus = await db('app_settings').where({ key: 'power_automate_last_status' }).first().catch(() => null);

  const hasChannel = await db.schema.hasColumn('email_logs', 'channel').catch(() => false);
  let paCount = 0;
  if (hasChannel) {
    const resCount = await db('email_logs').where({ channel: 'power_automate', status: 'delivered' }).count('id as count').first().catch(() => null);
    paCount = Number(resCount?.count || 0);
  }

  return res.json({
    isConfigured: paConfig.isConfigured,
    isEnabled: paConfig.isEnabled,
    webhookUrl: paConfig.webhookUrl,
    lastDispatchedAt: lastDispatched?.value || null,
    lastStatus: lastStatus?.value || null,
    totalDispatched: paCount,
    schema: POWER_AUTOMATE_JSON_SCHEMA,
  });
}

export async function updatePowerAutomateConfig(req: Request, res: Response) {
  const currentUser = req.user!;
  const { webhookUrl, isEnabled } = req.body;

  if (webhookUrl !== undefined) {
    const trimmed = String(webhookUrl).trim();
    const existingUrl = await db('app_settings').where({ key: 'power_automate_webhook_url' }).first();
    if (existingUrl) {
      await db('app_settings').where({ key: 'power_automate_webhook_url' }).update({ value: trimmed, updated_at: new Date() });
    } else {
      await db('app_settings').insert({ key: 'power_automate_webhook_url', value: trimmed, updated_at: new Date() });
    }
  }

  if (isEnabled !== undefined) {
    const strVal = isEnabled ? 'true' : 'false';
    const existingEnabled = await db('app_settings').where({ key: 'power_automate_enabled' }).first();
    if (existingEnabled) {
      await db('app_settings').where({ key: 'power_automate_enabled' }).update({ value: strVal, updated_at: new Date() });
    } else {
      await db('app_settings').insert({ key: 'power_automate_enabled', value: strVal, updated_at: new Date() });
    }
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'POWER_AUTOMATE_CONFIG_UPDATED',
    resourceType: 'AUTOMATION',
    details: { hasWebhookUrl: Boolean(webhookUrl), isEnabled },
    ipAddress: req.ip,
  });

  return res.json({
    message: 'Microsoft Power Automate configuration saved successfully.',
    isConfigured: Boolean(webhookUrl),
    isEnabled: Boolean(isEnabled),
  });
}

export async function testPowerAutomateFlow(req: Request, res: Response) {
  const { webhookUrl, recipientEmail, stepKey } = req.body;
  const targetEmail = (recipientEmail || req.user?.email || 'admin@smru.edu.in').trim();

  let targetUrl = webhookUrl?.trim();
  if (!targetUrl) {
    const config = await getPowerAutomateConfig();
    targetUrl = config.webhookUrl;
  }

  if (!targetUrl) {
    return res.status(400).json({
      message: 'Microsoft Power Automate Webhook URL is missing. Please provide or save a valid HTTP trigger URL.',
    });
  }

  const selectedStep = stepKey || 'new_task_assigned';

  const testPayload = {
    to: targetEmail,
    from: 'sriram@smru.edu.in',
    senderEmail: 'sriram@smru.edu.in',
    senderName: 'Sri Ram (Software Hub)',
    recipientName: req.user?.name || 'Software Hub Member',
    subject: `[Test Dispatch] Software Hub Notification: ${selectedStep}`,
    body: `Hello ${req.user?.name || 'Member'},\n\nThis is a verified live test transmission originating from Software Hub through your Microsoft Power Automate flow.\nSender: Sri Ram <sriram@smru.edu.in>\nStep: ${selectedStep}\nTriggered at: ${new Date().toLocaleString()}`,
    htmlBody: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="border-bottom: 2px solid #0d315c; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #0d315c; margin: 0; font-size: 18px; font-weight: 800;">Software Hub</h2>
          <p style="color: #64748b; margin: 4px 0 0; font-size: 12px; font-weight: 500;">
            Dispatched by Sri Ram &lt;sriram@smru.edu.in&gt;
          </p>
          <span style="display: inline-block; background: #eff6ff; color: #1e40af; font-size: 11px; padding: 2px 8px; border-radius: 9999px; margin-top: 6px; font-weight: 600;">
            Microsoft Power Automate (No Entra ID) Verified
          </span>
        </div>
        <p style="color: #1e293b; font-size: 14px; line-height: 1.6;">
          Hello <strong>${req.user?.name || 'Member'}</strong>,<br/><br/>
          Your Power Automate cloud flow received and processed this transmission successfully! No Azure Entra ID or App Registrations were required.
        </p>
        <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #475569;">
          <strong>Step:</strong> ${selectedStep}<br/>
          <strong>Timestamp:</strong> ${new Date().toISOString()}<br/>
          <strong>Target:</strong> ${targetEmail}
        </div>
      </div>
    `,
    step: selectedStep,
    actionUrl: ENV.CLIENT_ORIGIN || 'http://localhost:5173',
    systemName: 'Software Hub',
    timestamp: new Date().toISOString(),
    variables: {
      step: selectedStep,
      recipient_email: targetEmail,
      mode: 'live_test',
    },
  };

  const result = await sendViaPowerAutomate(testPayload, targetUrl);

  if (!result.success) {
    return res.status(502).json({
      message: `Power Automate Webhook error: ${result.error}`,
      details: result,
    });
  }

  // Record test in email_logs
  try {
    const hasChannel = await db.schema.hasColumn('email_logs', 'channel').catch(() => false);
    await db('email_logs').insert({
      id: `elog-${Date.now()}-pa-test`,
      rule: selectedStep,
      recipient: targetEmail,
      recipient_email: targetEmail,
      subject: testPayload.subject,
      status: 'delivered',
      attempts: 1,
      sent_time: new Date(),
      sent_at: new Date(),
      idempotency_key: `pa_test:${Date.now()}`,
      ...(hasChannel ? { channel: 'power_automate' } : {}),
    });
  } catch {}

  return res.json({
    message: `Test email dispatched to ${targetEmail} via Microsoft Power Automate [HTTP ${result.statusCode}]!`,
    statusCode: result.statusCode,
    recipientEmail: targetEmail,
    step: selectedStep,
  });
}

export async function updateAutomation(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;
  const { isEnabled, emailSubjectTemplate, emailBodyTemplate } = req.body;

  const updates: Record<string, any> = {
    updated_at: new Date(),
  };

  if (isEnabled !== undefined) updates.is_enabled = Boolean(isEnabled);
  if (emailSubjectTemplate !== undefined) updates.email_subject_template = emailSubjectTemplate;
  if (emailBodyTemplate !== undefined) updates.email_body_template = emailBodyTemplate;

  await db('automations').where({ id }).update(updates);

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'AUTOMATION_UPDATED',
    resourceType: 'AUTOMATION',
    resourceId: id,
    details: updates,
    ipAddress: req.ip,
  });

  return res.json({ message: 'Automation rule updated successfully' });
}

export async function previewAutomation(req: Request, res: Response) {
  const { id } = req.params;
  const auto = await db('automations').where({ id }).first();

  if (!auto) {
    return res.status(404).json({ message: 'Automation not found' });
  }

  const placeholders: Record<string, string> = {
    recipient_name: 'Alex Johnson',
    recipient_role: 'Unpaid Intern',
    task_title: 'Software Hub Infrastructure Setup (Part 1)',
    task_priority: 'High',
    task_deadline: new Date(Date.now() + 86400000).toLocaleDateString(),
    assigned_by: 'Software Hub Administrator',
    reviewer_name: 'Lead Reviewer',
    intern_name: 'Alex Johnson',
    submission_type: 'Git repository link',
    submission_status: 'Approved',
    review_comment: 'Excellent work on the deliverable.',
    certificate_number: 'SH2-L1-0042',
    certificate_type: 'Foundational Operations Certificate',
    verification_link: 'http://localhost:5173/verify/SH2-L1-0042',
    action_url: 'http://localhost:5173/todo',
    system_name: 'Software Hub',
    completed_count: '14',
    in_review_count: '3',
    overdue_count: '1',
    average_attendance: '96',
    missing_interns_list: 'None pending',
    date: new Date().toLocaleDateString(),
    checkin_time: '09:05 AM',
    attendance_status: 'Present',
    start_date: new Date().toLocaleDateString(),
    end_date: new Date(Date.now() + 86400000 * 2).toLocaleDateString(),
    leave_reason: 'University examinations',
    leave_category: 'Full Day',
    decision_status: 'APPROVED',
  };

  let renderedSubject = auto.email_subject_template;
  let renderedBody = auto.email_body_template;

  for (const [key, val] of Object.entries(placeholders)) {
    renderedSubject = renderedSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    renderedSubject = renderedSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    renderedBody = renderedBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    renderedBody = renderedBody.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
  }

  return res.json({
    name: auto.name,
    subject: renderedSubject,
    body: renderedBody,
    placeholders,
  });
}

export async function getEmailLogs(_req: Request, res: Response) {
  const hasChannel = await db.schema.hasColumn('email_logs', 'channel').catch(() => false);

  const logs = await db('email_logs')
    .orderBy('sent_at', 'desc')
    .limit(100)
    .select(
      'id',
      'rule',
      'recipient',
      'recipient_email as recipientEmail',
      'subject',
      'status',
      'attempts',
      'error',
      'error_message as errorMessage',
      'sent_time as sentTime',
      'sent_at as sentAt',
      'idempotency_key as idempotencyKey',
      ...(hasChannel ? ['channel'] : [])
    );

  return res.json(logs);
}

export async function getEmailTemplates(_req: Request, res: Response) {
  const templates = await db('automations').select(
    'id',
    'key',
    'name',
    'trigger_event as triggerEvent',
    'email_subject_template as subject',
    'email_subject_template as subjectTemplate',
    'email_subject_template as emailSubjectTemplate',
    'email_body_template as body',
    'email_body_template as bodyTemplate',
    'email_body_template as emailBodyTemplate',
    'is_enabled as isEnabled'
  );
  return res.json(templates);
}

export async function muteUserNotifications(req: Request, res: Response) {
  const currentUser = req.user!;
  const { emailMuted, pushMuted } = req.body;

  const updates: Record<string, any> = {};
  if (emailMuted !== undefined) updates.email_notifications_muted = Boolean(emailMuted);
  if (pushMuted !== undefined) updates.push_notifications_muted = Boolean(pushMuted);

  await db('users').where({ id: currentUser.id }).update(updates);

  return res.json({
    message: 'Notification preferences updated successfully',
    emailMuted: updates.email_notifications_muted ?? false,
    pushMuted: updates.push_notifications_muted ?? false,
  });
}

export async function triggerScheduledJob(req: Request, res: Response) {
  const { jobKey } = req.params;

  let count = 0;
  if (jobKey === 'due_tomorrow') {
    count = await runDueTomorrowJob();
  } else if (jobKey === 'overdue') {
    count = await runOverdueJob();
  } else if (jobKey === 'not_checked_in') {
    count = await runNotCheckedInJob();
  } else if (jobKey === 'month_end') {
    count = await runMonthEndReviewJob();
  } else if (jobKey === 'weekly_summary') {
    count = await runWeeklySummaryJob();
  } else {
    return res.status(400).json({ message: `Unknown scheduled job key: ${jobKey}` });
  }

  return res.json({ message: `Job ${jobKey} executed successfully`, emailsDispatched: count });
}

export async function updateEmailTemplate(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;
  const { subject, body } = req.body;

  const updates: Record<string, any> = {
    updated_at: new Date(),
  };
  if (subject !== undefined) updates.email_subject_template = subject;
  if (body !== undefined) updates.email_body_template = body;

  await db('automations').where({ id }).update(updates);

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'EMAIL_TEMPLATE_UPDATED',
    resourceType: 'AUTOMATION',
    resourceId: id,
    details: updates,
    ipAddress: req.ip,
  });

  return res.json({ message: 'Template updated successfully' });
}

export async function retryEmailLog(req: Request, res: Response) {
  const { id } = req.params;
  const log = await db('email_logs').where({ id }).first();
  if (!log) {
    return res.status(404).json({ message: 'Email log not found' });
  }

  const result = await sendSystemNotification({
    ruleKey: log.rule,
    recipientEmail: log.recipient_email || log.recipient,
    variables: {
      recipient_role: 'Intern / Member',
      action_url: ENV.CLIENT_ORIGIN || 'http://localhost:5173',
    },
  });

  return res.json({
    message: `Email retried (${result.status}) via ${result.channel || 'standard delivery'}`,
    result,
  });
}

export async function sendTestEmail(req: Request, res: Response) {
  const { recipientEmail, eventType, ruleKey } = req.body;
  const targetEmail = recipientEmail || req.user?.email;

  if (!targetEmail) {
    return res.status(400).json({ message: 'Recipient email is required' });
  }

  const selectedRule = ruleKey || eventType || 'new_task_assigned';

  try {
    const result = await sendSystemNotification({
      ruleKey: selectedRule,
      recipientEmail: targetEmail,
      recipientName: req.user?.name || 'Administrator',
      variables: {
        recipient_role: 'Administrator',
        action_url: ENV.CLIENT_ORIGIN || 'http://localhost:5173',
      },
    });

    const isPa = result.channel === 'power_automate';
    const isSmtp = result.channel === 'smtp';

    return res.json({
      message: isPa
        ? `Test notification dispatched via Microsoft Power Automate to ${targetEmail}`
        : isSmtp
        ? `Test notification dispatched via SMTP to ${targetEmail}`
        : `Test notification logged & dispatched to ${targetEmail} (Simulated in development mode)`,
      result,
      channel: result.channel,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: `Failed to dispatch test notification: ${err.message || 'Transmission error'}`,
    });
  }
}
