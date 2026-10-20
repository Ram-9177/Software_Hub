import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add channel column to email_logs for tracking Power Automate vs SMTP
  const hasChannel = await knex.schema.hasColumn('email_logs', 'channel');
  if (!hasChannel) {
    await knex.schema.alterTable('email_logs', (table) => {
      table.string('channel').defaultTo('smtp').nullable();
    });
  }

  // 2. Ensure app_settings table exists & initialize Power Automate keys
  const hasAppSettings = await knex.schema.hasTable('app_settings');
  if (!hasAppSettings) {
    await knex.schema.createTable('app_settings', (table) => {
      table.string('key').primary();
      table.text('value').notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  const defaultSettings = [
    { key: 'power_automate_webhook_url', value: '' },
    { key: 'power_automate_enabled', value: 'true' },
    { key: 'email_delivery_channel', value: 'hybrid' },
  ];

  for (const s of defaultSettings) {
    const existing = await knex('app_settings').where({ key: s.key }).first();
    if (!existing) {
      await knex('app_settings').insert({
        key: s.key,
        value: s.value,
        updated_at: new Date(),
      });
    }
  }

  // 3. Add new end-to-end automations rules (attendance, leave, password security)
  const newAutomations = [
    {
      id: 'auto-11',
      key: 'attendance_checkin',
      name: '11. Attendance Check-In Confirmed',
      trigger_event: 'attendance_checkin',
      schedule_cron: null,
      recipient_description: 'Intern upon checking in',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Software Hub Attendance: Daily Check-in Recorded for {{recipient_name}}',
      email_body_template: 'Hello {{recipient_name}},\n\nYour attendance check-in has been successfully recorded at {{checkin_time}} on {{date}} in Software Hub.\nStatus: {{attendance_status}}\n\nReview your Software Hub attendance register anytime: {{action_url}}',
    },
    {
      id: 'auto-12',
      key: 'leave_requested',
      name: '12. Leave Request Submitted',
      trigger_event: 'leave_requested',
      schedule_cron: null,
      recipient_description: 'Intern & Supervisor',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Software Hub Leave Request: {{start_date}} to {{end_date}}',
      email_body_template: 'Hello {{recipient_name}},\n\nYour leave request from {{start_date}} to {{end_date}} has been received and queued for review in Software Hub.\nReason: {{leave_reason}}\nCategory: {{leave_category}}\n\nYou will be notified via email once approved.\nTrack your request in Software Hub: {{action_url}}',
    },
    {
      id: 'auto-13',
      key: 'leave_reviewed',
      name: '13. Leave Request Decision',
      trigger_event: 'leave_reviewed',
      schedule_cron: null,
      recipient_description: 'Intern who submitted request',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Software Hub Leave Decision: {{decision_status}} ({{start_date}} to {{end_date}})',
      email_body_template: 'Hello {{recipient_name}},\n\nYour leave request from {{start_date}} to {{end_date}} has been reviewed in Software Hub.\nStatus: {{decision_status}}\nReview Comment: {{reviewer_comment}}\nReviewed by: {{reviewer_name}}\n\nView details in Software Hub: {{action_url}}',
    },
    {
      id: 'auto-14',
      key: 'password_changed',
      name: '14. Password Changed Security Notice',
      trigger_event: 'password_changed',
      schedule_cron: null,
      recipient_description: 'User upon password change',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Software Hub Security Notice: Your Password Was Changed',
      email_body_template: 'Hello {{recipient_name}},\n\nThis is an automated security notice confirming that your Software Hub account password was recently updated.\n\nIf you initiated this change, no further action is required.\nIf you did NOT perform this action, please contact Software Hub leadership immediately.',
    },
  ];

  for (const auto of newAutomations) {
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
  const hasChannel = await knex.schema.hasColumn('email_logs', 'channel');
  if (hasChannel) {
    await knex.schema.alterTable('email_logs', (table) => {
      table.dropColumn('channel');
    });
  }
}
