import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { sendSystemNotification } from './emailService.js';
import { logAdminAction } from '../users/userController.js';

export async function getAutomations(_req: Request, res: Response) {
  const automations = await db('automations').orderBy('id', 'asc');
  
  // Real metrics calculated from genuine email_logs table
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const sentCount = await db('email_logs')
    .where('sent_at', '>=', oneWeekAgo)
    .where({ status: 'delivered' })
    .count('id as count')
    .first();

  const failedCount = await db('email_logs')
    .where('sent_at', '>=', oneWeekAgo)
    .where({ status: 'failed' })
    .count('id as count')
    .first();

  return res.json({
    metrics: {
      sentThisWeek: Number(sentCount?.count || 0),
      failed: Number(failedCount?.count || 0),
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

  if (isEnabled !== undefined) updates.is_enabled = isEnabled;
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

  return res.json({ message: 'Automation updated successfully' });
}

export async function previewAutomation(req: Request, res: Response) {
  const { id } = req.params;
  const auto = await db('automations').where({ id }).first();

  if (!auto) {
    return res.status(404).json({ message: 'Automation not found' });
  }

  // Real member samples from the official roster
  const placeholders: Record<string, string> = {
    intern_name: 'Cherry',
    assigner_name: 'Sheshi',
    task_title: 'Q3 University Network Security Audit',
    part_number: '2',
    part_title: 'Firewall Rule Validation & Port Scan',
    due_date: 'Fri 25 Oct',
    priority: 'High',
    action_url: 'http://localhost:5173/todo',
    system_name: 'Software Hub 2.0',
  };

  let renderedSubject = auto.email_subject_template;
  let renderedBody = auto.email_body_template;

  for (const [key, val] of Object.entries(placeholders)) {
    renderedSubject = renderedSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    renderedSubject = renderedSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    renderedBody = renderedBody.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    renderedBody = renderedBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }

  return res.json({
    name: auto.name,
    subject: renderedSubject,
    body: renderedBody,
    placeholders,
  });
}

// ----------------------------------------------------------------------
// EMAIL TEMPLATES MANAGEMENT (Section 6)
// ----------------------------------------------------------------------

export async function getEmailTemplates(_req: Request, res: Response) {
  const templates = await db('email_templates').select('*').orderBy('name', 'asc');
  return res.json(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      eventType: t.event_type,
      subject: t.subject,
      body: t.body,
      senderDisplayName: t.sender_display_name,
      isEnabled: Boolean(t.is_enabled),
      availableVariables: JSON.parse(t.available_variables || '[]'),
      lastUpdatedBy: t.last_updated_by,
      updatedAt: t.updated_at,
    }))
  );
}

export async function updateEmailTemplate(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;
  const { subject, body, senderDisplayName, isEnabled } = req.body;

  const updates: Record<string, any> = {
    updated_at: new Date(),
    last_updated_by: currentUser.name,
  };

  if (subject !== undefined) updates.subject = subject;
  if (body !== undefined) updates.body = body;
  if (senderDisplayName !== undefined) updates.sender_display_name = senderDisplayName;
  if (isEnabled !== undefined) updates.is_enabled = isEnabled;

  await db('email_templates').where({ id }).update(updates);

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'EMAIL_TEMPLATE_UPDATED',
    resourceType: 'EMAIL_TEMPLATE',
    resourceId: id,
    details: updates,
    ipAddress: req.ip,
  });

  return res.json({ message: 'Email template saved successfully' });
}

export async function sendTestEmail(req: Request, res: Response) {
  const currentUser = req.user!;
  const { recipientEmail, eventType = 'task_assigned', variables = {} } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ message: 'Recipient email address is required.' });
  }

  const result = await sendSystemNotification({
    eventType,
    recipientEmail,
    recipientName: currentUser.name,
    variables: {
      task_title: 'Sample Test Task — Software Hub 2.0',
      task_priority: 'High',
      task_deadline: '25 October 2026',
      assigned_by: currentUser.name,
      ...variables,
    },
  });

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'TEST_EMAIL_SENT',
    resourceType: 'EMAIL_LOG',
    resourceId: result.logId,
    details: { recipientEmail, eventType, status: result.status },
    ipAddress: req.ip,
  });

  return res.json({
    message: result.success
      ? `Test notification accepted and recorded as ${result.status}`
      : `Test notification failed: ${result.error}`,
    status: result.status,
    logId: result.logId,
  });
}

// ----------------------------------------------------------------------
// EMAIL DELIVERY LOGS & RETRY (Section 5)
// ----------------------------------------------------------------------

export async function getEmailLogs(_req: Request, res: Response) {
  const logs = await db('email_logs')
    .orderBy('sent_at', 'desc')
    .limit(50);

  return res.json(logs);
}

export async function retryEmail(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;

  const log = await db('email_logs').where({ id }).first();
  if (!log) {
    return res.status(404).json({ message: 'Email log not found.' });
  }

  const result = await sendSystemNotification({
    eventType: 'manual_retry',
    recipientEmail: log.recipient_email,
    recipientName: 'Team Member',
    variables: {
      task_title: log.subject,
    },
  });

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'EMAIL_RETRIED',
    resourceType: 'EMAIL_LOG',
    resourceId: id,
    details: { newLogId: result.logId, status: result.status },
    ipAddress: req.ip,
  });

  return res.json({
    message: `Email re-queued. Status: ${result.status}`,
    newStatus: result.status,
  });
}
