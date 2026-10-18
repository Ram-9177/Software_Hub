import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Invites table
  const hasInvites = await knex.schema.hasTable('invites');
  if (!hasInvites) {
    await knex.schema.createTable('invites', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('email').notNullable();
      table.string('role').notNullable();
      table.string('intern_type').nullable();
      table.string('team_id').nullable();
      table.string('invited_by_user_id').notNullable();
      table.string('token_hash').notNullable();
      table.string('status').defaultTo('pending'); // pending, accepted, cancelled, expired
      table.timestamp('expires_at').notNullable();
      table.timestamp('accepted_at').nullable();
      table.timestamps(true, true);
    });
  }

  // 2. Password Resets table
  const hasPasswordResets = await knex.schema.hasTable('password_resets');
  if (!hasPasswordResets) {
    await knex.schema.createTable('password_resets', (table) => {
      table.string('id').primary();
      table.string('user_id').notNullable();
      table.string('token_hash').notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('used').defaultTo(false);
      table.timestamps(true, true);
    });
  }

  // 3. User table updates for security, lockout, and notification muting
  const hasMicrosoftId = await knex.schema.hasColumn('users', 'microsoft_id');
  if (!hasMicrosoftId) {
    await knex.schema.alterTable('users', (table) => {
      table.string('microsoft_id').nullable();
    });
  }

  const hasFailedAttempts = await knex.schema.hasColumn('users', 'failed_login_attempts');
  if (!hasFailedAttempts) {
    await knex.schema.alterTable('users', (table) => {
      table.integer('failed_login_attempts').defaultTo(0);
    });
  }

  const hasLockedUntil = await knex.schema.hasColumn('users', 'locked_until');
  if (!hasLockedUntil) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('locked_until').nullable();
    });
  }

  const hasTokenVersion = await knex.schema.hasColumn('users', 'token_version');
  if (!hasTokenVersion) {
    await knex.schema.alterTable('users', (table) => {
      table.integer('token_version').defaultTo(1);
    });
  }

  const hasEmailMuted = await knex.schema.hasColumn('users', 'email_notifications_muted');
  if (!hasEmailMuted) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('email_notifications_muted').defaultTo(false);
    });
  }

  const hasPushMuted = await knex.schema.hasColumn('users', 'push_notifications_muted');
  if (!hasPushMuted) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('push_notifications_muted').defaultTo(false);
    });
  }

  const hasTeamId = await knex.schema.hasColumn('users', 'team_id');
  if (!hasTeamId) {
    await knex.schema.alterTable('users', (table) => {
      table.string('team_id').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_resets');
  await knex.schema.dropTableIfExists('invites');
}
