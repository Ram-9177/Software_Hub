import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add description column to teams if not already present
  const hasDescription = await knex.schema.hasColumn('teams', 'description');
  if (!hasDescription) {
    await knex.schema.alterTable('teams', (table) => {
      table.text('description').nullable();
    });
  }

  // 2. Add unique constraint on team_members (team_id, user_id) to prevent duplicate memberships
  // Check if unique index already exists
  try {
    await knex.schema.alterTable('team_members', (table) => {
      table.unique(['team_id', 'user_id'], { indexName: 'uq_team_members_team_user' });
    });
  } catch (e) {
    console.warn('[Migration] Index uq_team_members_team_user may already exist:', (e as any).message);
  }

  // 3. Add unique constraint on channel_members (channel_id, user_id)
  try {
    await knex.schema.alterTable('channel_members', (table) => {
      table.unique(['channel_id', 'user_id'], { indexName: 'uq_channel_members_chan_user' });
    });
  } catch (e) {
    console.warn('[Migration] Index uq_channel_members_chan_user may already exist:', (e as any).message);
  }

  // 4. Add unique constraint on attendance (user_id, date) to prevent duplicate daily check-in records
  try {
    await knex.schema.alterTable('attendance', (table) => {
      table.unique(['user_id', 'date'], { indexName: 'uq_attendance_user_date' });
    });
  } catch (e) {
    console.warn('[Migration] Index uq_attendance_user_date may already exist:', (e as any).message);
  }

  // 5. Add unique index on chat_channels(name)
  try {
    await knex.schema.alterTable('chat_channels', (table) => {
      table.unique(['name'], { indexName: 'uq_chat_channels_name' });
    });
  } catch (e) {
    console.warn('[Migration] Index uq_chat_channels_name may already exist:', (e as any).message);
  }

  // 6. Add unique index on teams(name)
  try {
    await knex.schema.alterTable('teams', (table) => {
      table.unique(['name'], { indexName: 'uq_teams_name' });
    });
  } catch (e) {
    console.warn('[Migration] Index uq_teams_name may already exist:', (e as any).message);
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasDescription = await knex.schema.hasColumn('teams', 'description');
  if (hasDescription) {
    await knex.schema.alterTable('teams', (table) => {
      table.dropColumn('description');
    });
  }

  try {
    await knex.schema.alterTable('team_members', (table) => {
      table.dropUnique(['team_id', 'user_id'], 'uq_team_members_team_user');
    });
  } catch {
    // Ignore drop errors
  }

  try {
    await knex.schema.alterTable('channel_members', (table) => {
      table.dropUnique(['channel_id', 'user_id'], 'uq_channel_members_chan_user');
    });
  } catch {
    // Ignore drop errors
  }

  try {
    await knex.schema.alterTable('attendance', (table) => {
      table.dropUnique(['user_id', 'date'], 'uq_attendance_user_date');
    });
  } catch {
    // Ignore drop errors
  }
}
