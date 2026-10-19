import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { isSmtpConfigured, sendSystemNotification } from './emailService.js';
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

  return res.json({
    metrics: {
      sentThisWeek: Number(sentThisWeek?.count || 0),
      totalDelivered: Number(totalDelivered?.count || 0),
      totalFailed: Number(totalFailed?.count || 0),
      totalCount: Number(totalLogs?.count || 0),
    },
    smtpStatus: {
      isConfigured: smtpConfigured,
      host: ENV.SMTP_HOST || 'Not set',
      port: ENV.SMTP_PORT || 587,
      from: ENV.SMTP_FROM || 'Not set',
      error: smtpConfigured
        ? null
        : 'SMTP is not configured in environment variables. Email automations are offline.',
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
    task_title: 'Central Office Database Migration (Part 1)',
    task_priority: 'High',
    task_deadline: new Date(Date.now() + 86400000).toLocaleDateString(),
    assigned_by: 'Office Administrator',
    reviewer_name: 'Lead Reviewer',
    intern_name: 'Alex Johnson',
    submission_type: 'Git repository link',
    submission_status: 'Approved',
    review_comment: 'Excellent work on the deliverable.',
    certificate_number: 'SH2-L1-0042',
    certificate_type: 'Foundational Operations Certificate',
    verification_link: 'http://localhost:5173/verify/SH2-L1-0042',
    action_url: 'http://localhost:5173/todo',
    system_name: 'Software Hub 2.0 Command Center',
    completed_count: '14',
    in_review_count: '3',
    overdue_count: '1',
    average_attendance: '96',
    missing_interns_list: 'None pending',
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

export async function getEmailLogs(req: Request, res: Response) {
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
      'idempotency_key as idempotencyKey'
    );

  return res.json(logs);
}

export async function getEmailTemplates(_req: Request, res: Response) {
  const templates = await db('automations').select(
    'id',
    'key',
    'name',
    'trigger_event as triggerEvent',
    'email_subject_template as subjectTemplate',
    'email_body_template as bodyTemplate',
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

export async function sendTestEmail(req: Request, res: Response) {
  const { recipientEmail } = req.body;
  const targetEmail = recipientEmail || req.user?.email;

  if (!targetEmail) {
    return res.status(400).json({ message: 'Recipient email is required' });
  }

  if (!isSmtpConfigured()) {
    return res.status(400).json({
      message: 'SMTP is not configured in environment variables (.env). Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS first.',
    });
  }

  try {
    const result = await sendSystemNotification({
      ruleKey: 'welcome_email',
      recipientEmail: targetEmail,
      recipientName: req.user?.name || 'Administrator',
      variables: {
        recipient_role: 'Administrator',
        action_url: ENV.CLIENT_ORIGIN || 'http://localhost:5173',
      },
    });

    return res.json({
      message: `Test email dispatched successfully to ${targetEmail}`,
      result,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: `Failed to send test email: ${err.message || 'SMTP communication error'}`,
    });
  }
}
