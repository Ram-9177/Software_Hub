import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Audit Logs table for administrative and security actions
  const hasAuditLogs = await knex.schema.hasTable('audit_logs');
  if (!hasAuditLogs) {
    await knex.schema.createTable('audit_logs', (table) => {
      table.string('id').primary();
      table.string('user_id').nullable();
      table.string('user_name').nullable();
      table.string('action').notNullable();
      table.string('resource_type').notNullable();
      table.string('resource_id').nullable();
      table.text('details').nullable();
      table.string('ip_address').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 2. Google Calendar Integration Tokens table
  const hasGoogleCalendar = await knex.schema.hasTable('google_calendar_tokens');
  if (!hasGoogleCalendar) {
    await knex.schema.createTable('google_calendar_tokens', (table) => {
      table.string('id').primary();
      table.string('user_id').notNullable().unique();
      table.text('access_token').notNullable();
      table.text('refresh_token').nullable();
      table.string('token_type').defaultTo('Bearer');
      table.bigInteger('expiry_date').nullable();
      table.text('scope').nullable();
      table.boolean('is_connected').defaultTo(true);
      table.timestamp('synced_at').nullable();
      table.timestamps(true, true);
    });
  }

  // 3. Email Templates table
  const hasEmailTemplates = await knex.schema.hasTable('email_templates');
  if (!hasEmailTemplates) {
    await knex.schema.createTable('email_templates', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('event_type').notNullable().unique();
      table.string('subject').notNullable();
      table.text('body').notNullable();
      table.string('sender_display_name').defaultTo('Software Hub 2.0');
      table.boolean('is_enabled').defaultTo(true);
      table.text('available_variables').notNullable(); // JSON array
      table.string('last_updated_by').nullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 4. Add user profile columns if missing (joining_date, phone)
  const hasJoiningDate = await knex.schema.hasColumn('users', 'joining_date');
  if (!hasJoiningDate) {
    await knex.schema.alterTable('users', (table) => {
      table.string('joining_date').nullable();
      table.string('phone').nullable();
    });
  }

  // 5. Add google calendar sync columns to events if missing
  const hasGoogleEventId = await knex.schema.hasColumn('events', 'google_event_id');
  if (!hasGoogleEventId) {
    await knex.schema.alterTable('events', (table) => {
      table.string('google_event_id').nullable();
      table.boolean('is_synced').defaultTo(false);
      table.string('location').nullable();
      table.string('description').nullable();
      table.boolean('is_all_day').defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_templates');
  await knex.schema.dropTableIfExists('google_calendar_tokens');
  await knex.schema.dropTableIfExists('audit_logs');
}
