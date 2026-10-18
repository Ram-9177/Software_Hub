import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasIdempotencyKey = await knex.schema.hasColumn('email_logs', 'idempotency_key');
  if (!hasIdempotencyKey) {
    await knex.schema.alterTable('email_logs', (table) => {
      table.string('rule').nullable();
      table.string('recipient').nullable();
      table.integer('attempts').defaultTo(1);
      table.text('error').nullable();
      table.timestamp('sent_time').nullable();
      table.string('idempotency_key').nullable();
    });

    try {
      await knex.schema.alterTable('email_logs', (table) => {
        table.unique(['idempotency_key'], { indexName: 'uq_email_logs_idempotency_key' });
      });
    } catch (e) {
      console.warn('[Migration] Index uq_email_logs_idempotency_key may already exist');
    }
  }

  // Ensure default automations rules are initialized in automations table
  const defaultAutomations = [
    {
      id: 'auto-1',
      key: 'welcome_email',
      name: '1. Welcome Email (Intern Onboarding)',
      trigger_event: 'user_created',
      schedule_cron: null,
      recipient_description: 'Newly created intern',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Welcome to Central Office — {{recipient_name}}',
      email_body_template: 'Hello {{recipient_name}},\n\nWelcome to Software Hub 2.0 Central Office. Your account has been provisioned as {{recipient_role}}.\n\nSign in to review your work: {{action_url}}',
    },
    {
      id: 'auto-2',
      key: 'new_task_assigned',
      name: '2. New Task or Part Assigned',
      trigger_event: 'task_assigned',
      schedule_cron: null,
      recipient_description: 'Task part assignee',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'New Task Assignment: {{task_title}}',
      email_body_template: 'Hello {{recipient_name}},\n\nYou have been assigned a new deliverable: {{task_title}}.\nPriority: {{task_priority}}\nDeadline: {{task_deadline}}\nAssigned by: {{assigned_by}}\n\nView details: {{action_url}}',
    },
    {
      id: 'auto-3',
      key: 'due_tomorrow',
      name: '3. Due Tomorrow Reminder (09:00 Daily)',
      trigger_event: 'schedule_due_tomorrow',
      schedule_cron: '0 9 * * *',
      recipient_description: 'Interns with parts due tomorrow',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Due Tomorrow: {{task_title}}',
      email_body_template: 'Hello {{recipient_name}},\n\nThis is a reminder that {{task_title}} is due tomorrow ({{task_deadline}}). Please upload your proof of work on time.\n\nOpen Command Center: {{action_url}}',
    },
    {
      id: 'auto-4',
      key: 'overdue_reminder',
      name: '4. Overdue Notice (10:00 Daily)',
      trigger_event: 'schedule_overdue',
      schedule_cron: '0 10 * * *',
      recipient_description: 'Assignee and Team Lead',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'OVERDUE NOTICE: {{task_title}}',
      email_body_template: 'Attention {{recipient_name}},\n\nThe deliverable {{task_title}} is now OVERDUE (was due on {{task_deadline}}). Please submit proof of work immediately or contact your team lead.\n\nOpen Command Center: {{action_url}}',
    },
    {
      id: 'auto-5',
      key: 'work_submitted',
      name: '5. Work Submitted for Review',
      trigger_event: 'work_submitted',
      schedule_cron: null,
      recipient_description: 'Reviewer / Team Lead / Core Mentor',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Work Submitted for Review: {{task_title}}',
      email_body_template: 'Hello {{reviewer_name}},\n\n{{intern_name}} has uploaded proof of work for {{task_title}}.\nProof type: {{submission_type}}\n\nPlease review and approve: {{action_url}}',
    },
    {
      id: 'auto-6',
      key: 'reviewed_or_sent_back',
      name: '6. Reviewed or Sent Back',
      trigger_event: 'work_reviewed',
      schedule_cron: null,
      recipient_description: 'Assignee',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Task Review Update: {{task_title}} [{{submission_status}}]',
      email_body_template: 'Hello {{recipient_name}},\n\nYour submission for {{task_title}} has been reviewed.\nStatus: {{submission_status}}\nFeedback: {{review_comment}}\n\nOpen task: {{action_url}}',
    },
    {
      id: 'auto-7',
      key: 'not_checked_in',
      name: '7. Not Checked In By 10:00 Daily',
      trigger_event: 'schedule_attendance_check',
      schedule_cron: '0 10 * * *',
      recipient_description: 'Intern (push/email) + Summary list to Leader',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Attendance Reminder: Check-in Pending for Today',
      email_body_template: 'Hello {{recipient_name}},\n\nYou have not yet checked in for today as of 10:00. Please log into Command Center and complete your check-in: {{action_url}}',
    },
    {
      id: 'auto-8',
      key: 'month_end_level_review',
      name: '8. Month-End Level Review Notice (3 Days Before End of Month)',
      trigger_event: 'schedule_month_end_review',
      schedule_cron: '0 9 28 * *',
      recipient_description: 'Leaders and Admin',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Upcoming Month-End Level Reviews Notice',
      email_body_template: 'Hello Central Office Leaders,\n\nThe current operational month ends in 3 days. Please review cohort deliverables, attendance, and progress in the Tracker to mark Level Pass/Repeat decisions.\n\nOpen Tracker: {{action_url}}',
    },
    {
      id: 'auto-9',
      key: 'weekly_summary',
      name: '9. Weekly Operations Summary (Monday 09:00)',
      trigger_event: 'schedule_weekly_summary',
      schedule_cron: '0 9 * * 1',
      recipient_description: 'Leaders and Admin',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Central Office Weekly Operations Summary',
      email_body_template: 'Hello Central Office Leadership,\n\nHere is your Monday weekly operations summary:\nCompleted deliverables: {{completed_count}}\nPending reviews: {{in_review_count}}\nOverdue items: {{overdue_count}}\nActive attendance rate: {{average_attendance}}%\n\nView full operations dashboard: {{action_url}}',
    },
    {
      id: 'auto-10',
      key: 'certificate_issued',
      name: '10. Certificate Issued (With Attached PDF)',
      trigger_event: 'certificate_issued',
      schedule_cron: null,
      recipient_description: 'Intern receiving certificate',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Official Credential Issued: {{certificate_type}} ({{certificate_number}})',
      email_body_template: 'Congratulations {{intern_name}},\n\nYour official certificate ({{certificate_number}}) has been approved and issued by the Central Office.\n\nYour verifiable PDF certificate is attached to this email.\nVerify online: {{verification_link}}',
    },
  ];

  for (const auto of defaultAutomations) {
    const exists = await knex('automations').where({ key: auto.key }).first();
    if (!exists) {
      await knex('automations').insert({
        ...auto,
        updated_at: new Date(),
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasIdempotencyKey = await knex.schema.hasColumn('email_logs', 'idempotency_key');
  if (hasIdempotencyKey) {
    try {
      await knex.schema.alterTable('email_logs', (table) => {
        table.dropUnique(['idempotency_key'], 'uq_email_logs_idempotency_key');
      });
    } catch {
      // ignore
    }
  }
}
