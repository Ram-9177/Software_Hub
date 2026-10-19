import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add must_change_password, google_refresh_token_encrypted, and ics_token to users table
  const hasMustChange = await knex.schema.hasColumn('users', 'must_change_password');
  if (!hasMustChange) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('must_change_password').defaultTo(false);
    });
  }

  const hasGoogleToken = await knex.schema.hasColumn('users', 'google_refresh_token_encrypted');
  if (!hasGoogleToken) {
    await knex.schema.alterTable('users', (table) => {
      table.text('google_refresh_token_encrypted').nullable();
      table.timestamp('google_calendar_synced_at').nullable();
    });
  }

  const hasIcsToken = await knex.schema.hasColumn('users', 'ics_token');
  if (!hasIcsToken) {
    await knex.schema.alterTable('users', (table) => {
      table.string('ics_token').nullable().unique();
    });
  }

  // Helper safe index creator
  async function safeCreateIndex(
    tableName: string,
    columns: string[],
    indexName: string
  ) {
    try {
      await knex.schema.alterTable(tableName, (table) => {
        table.index(columns, indexName);
      });
    } catch {
      // index already exists or database does not support alter index
    }
  }

  // 2. Add performance indexes for sub-200ms API responses
  await safeCreateIndex('task_parts', ['task_id'], 'idx_task_parts_task_id');
  await safeCreateIndex('task_parts', ['assigned_intern_id'], 'idx_task_parts_assigned_intern_id');
  await safeCreateIndex('task_parts', ['status'], 'idx_task_parts_status');
  await safeCreateIndex('attendance', ['user_id'], 'idx_attendance_user_id');
  await safeCreateIndex('attendance', ['date'], 'idx_attendance_date');
  await safeCreateIndex('attendance', ['user_id', 'date'], 'idx_attendance_user_date');
  await safeCreateIndex('uploads', ['task_part_id'], 'idx_uploads_task_part_id');
  await safeCreateIndex('team_members', ['team_id'], 'idx_team_members_team_id');
  await safeCreateIndex('team_members', ['user_id'], 'idx_team_members_user_id');
  await safeCreateIndex('chat_messages', ['channel_id'], 'idx_chat_messages_channel_id');
  await safeCreateIndex('chat_messages', ['created_at'], 'idx_chat_messages_created_at');
  await safeCreateIndex('channel_members', ['channel_id', 'user_id'], 'idx_channel_members_chan_user');
  await safeCreateIndex('invites', ['token_hash'], 'idx_invites_token_hash');
  await safeCreateIndex('invites', ['email'], 'idx_invites_email');
  await safeCreateIndex('password_resets', ['token_hash'], 'idx_password_resets_token_hash');
}

export async function down(knex: Knex): Promise<void> {
  const hasMustChange = await knex.schema.hasColumn('users', 'must_change_password');
  if (hasMustChange) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('must_change_password');
      table.dropColumn('google_refresh_token_encrypted');
      table.dropColumn('google_calendar_synced_at');
      table.dropColumn('ics_token');
    });
  }
}
