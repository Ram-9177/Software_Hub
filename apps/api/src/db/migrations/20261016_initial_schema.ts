import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Users
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash').nullable();
    table.string('role').notNullable(); // admin, lead, paid_intern, unpaid_intern
    table.string('intern_type').nullable(); // paid, unpaid
    table.string('paired_paid_intern_id').nullable();
    table.integer('current_level').defaultTo(1); // 1-15
    table.float('marksheet_percentage').nullable();
    table.boolean('marksheet_confirmed').defaultTo(false);
    table.string('status').defaultTo('active');
    table.string('avatar_url').nullable();
    table.timestamps(true, true);
  });

  // 2. Teams
  await knex.schema.createTable('teams', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('lead_id').notNullable();
    table.timestamps(true, true);
  });

  // 3. Team Members
  await knex.schema.createTable('team_members', (table) => {
    table.string('id').primary();
    table.string('team_id').notNullable();
    table.string('user_id').notNullable();
    table.timestamps(true, true);
  });

  // 4. Tasks
  await knex.schema.createTable('tasks', (table) => {
    table.string('id').primary();
    table.string('task_number').notNullable().unique();
    table.string('title').notNullable();
    table.text('description').nullable();
    table.timestamp('due_date').notNullable();
    table.string('priority').defaultTo('medium'); // low, medium, high
    table.string('status').defaultTo('to_do'); // to_do, in_progress, in_review, done, overdue
    table.string('created_by').notNullable();
    table.timestamps(true, true);
  });

  // 5. Task Parts
  await knex.schema.createTable('task_parts', (table) => {
    table.string('id').primary();
    table.string('task_id').notNullable();
    table.integer('part_number').notNullable();
    table.integer('total_parts').notNullable();
    table.string('title').notNullable();
    table.string('assigned_intern_id').notNullable();
    table.timestamp('due_date').notNullable();
    table.string('status').defaultTo('to_do');
    table.string('reviewer_id').nullable();
    table.integer('rating').nullable(); // 1-5
    table.text('review_comment').nullable();
    table.timestamp('submitted_at').nullable();
    table.timestamp('reviewed_at').nullable();
  });

  // 6. Uploads
  await knex.schema.createTable('uploads', (table) => {
    table.string('id').primary();
    table.string('task_part_id').notNullable();
    table.string('kind').notNullable(); // file, git_link, documentation
    table.text('url_or_path').notNullable();
    table.string('file_name').nullable();
    table.integer('file_size').nullable();
    table.string('mime_type').nullable();
    table.string('uploaded_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 7. Attendance
  await knex.schema.createTable('attendance', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable();
    table.string('date').notNullable(); // YYYY-MM-DD
    table.timestamp('check_in_time').nullable();
    table.timestamp('check_out_time').nullable();
    table.string('status').notNullable(); // present, late, half_day, absent, leave, holiday, week_off
    table.timestamps(true, true);
  });

  // 8. Attendance Rules
  await knex.schema.createTable('attendance_rules', (table) => {
    table.string('id').primary();
    table.string('office_start_time').defaultTo('09:00');
    table.integer('grace_minutes').defaultTo(15);
    table.float('half_day_hours').defaultTo(4.0);
    table.string('absent_cutoff_time').defaultTo('11:00');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 9. Leave Requests
  await knex.schema.createTable('leave_requests', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable();
    table.string('start_date').notNullable();
    table.string('end_date').notNullable();
    table.text('reason').notNullable();
    table.string('status').defaultTo('pending'); // pending, approved, rejected
    table.string('reviewed_by').nullable();
    table.timestamps(true, true);
  });

  // 10. Chat Channels
  await knex.schema.createTable('chat_channels', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('type').notNullable(); // team, group, direct
    table.string('team_id').nullable();
    table.string('created_by').notNullable();
    table.timestamps(true, true);
  });

  // 11. Channel Members
  await knex.schema.createTable('channel_members', (table) => {
    table.string('id').primary();
    table.string('channel_id').notNullable();
    table.string('user_id').notNullable();
    table.timestamp('last_read_at').nullable();
    table.timestamps(true, true);
  });

  // 12. Chat Messages
  await knex.schema.createTable('chat_messages', (table) => {
    table.string('id').primary();
    table.string('channel_id').notNullable();
    table.string('sender_id').notNullable();
    table.text('text').nullable();
    table.text('attachments').nullable(); // JSON string
    table.string('linked_task_id').nullable();
    table.boolean('is_pinned').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 13. Message Reactions
  await knex.schema.createTable('message_reactions', (table) => {
    table.string('id').primary();
    table.string('message_id').notNullable();
    table.string('user_id').notNullable();
    table.string('emoji').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 14. Events / Calendar
  await knex.schema.createTable('events', (table) => {
    table.string('id').primary();
    table.string('title').notNullable();
    table.string('type').notNullable(); // meeting, deadline, holiday, review, lockout
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').notNullable();
    table.string('team_id').nullable();
    table.string('applies_to_role').nullable();
    table.string('created_by').notNullable();
    table.timestamps(true, true);
  });

  // 15. Level Reviews
  await knex.schema.createTable('level_reviews', (table) => {
    table.string('id').primary();
    table.string('intern_id').notNullable();
    table.integer('level_number').notNullable();
    table.string('decision').notNullable(); // passed, repeat
    table.text('notes').nullable();
    table.string('reviewed_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 16. Marksheets
  await knex.schema.createTable('marksheets', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable();
    table.string('file_path').notNullable();
    table.float('percentage').notNullable();
    table.string('status').defaultTo('pending'); // pending, confirmed, rejected
    table.string('confirmed_by').nullable();
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamp('confirmed_at').nullable();
  });

  // 17. Certificates
  await knex.schema.createTable('certificates', (table) => {
    table.string('id').primary();
    table.string('certificate_number').notNullable().unique();
    table.string('user_id').notNullable();
    table.integer('level').notNullable(); // 1 or 2
    table.string('issue_date').notNullable();
    table.string('status').defaultTo('issued'); // issued, revoked
    table.text('qr_code_data').notNullable();
    table.string('pdf_path').nullable();
    table.float('attendance_percentage').notNullable();
    table.integer('tasks_completed').notNullable();
    table.string('issued_by').notNullable();
    table.timestamps(true, true);
  });

  // 18. Automations
  await knex.schema.createTable('automations', (table) => {
    table.string('id').primary();
    table.string('key').notNullable().unique();
    table.string('name').notNullable();
    table.string('trigger_event').notNullable();
    table.string('schedule_cron').nullable();
    table.string('recipient_description').notNullable();
    table.string('channel').defaultTo('both'); // email, push, both
    table.boolean('is_enabled').defaultTo(true);
    table.string('email_subject_template').notNullable();
    table.text('email_body_template').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 19. Email Logs
  await knex.schema.createTable('email_logs', (table) => {
    table.string('id').primary();
    table.string('automation_id').nullable();
    table.string('recipient_email').notNullable();
    table.string('subject').notNullable();
    table.string('status').notNullable(); // delivered, failed
    table.text('error_message').nullable();
    table.timestamp('sent_at').defaultTo(knex.fn.now());
  });

  // 20. Notification Preferences
  await knex.schema.createTable('notification_preferences', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable();
    table.string('event_key').notNullable();
    table.boolean('email_enabled').defaultTo(true);
    table.boolean('push_enabled').defaultTo(true);
  });

  // 21. Push Subscriptions
  await knex.schema.createTable('push_subscriptions', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable();
    table.text('endpoint').notNullable();
    table.text('p256dh').notNullable();
    table.text('auth').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 22. Kudos
  await knex.schema.createTable('kudos', (table) => {
    table.string('id').primary();
    table.string('from_user_id').notNullable();
    table.string('to_user_id').notNullable();
    table.integer('points').notNullable();
    table.string('reason').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'kudos',
    'push_subscriptions',
    'notification_preferences',
    'email_logs',
    'automations',
    'certificates',
    'marksheets',
    'level_reviews',
    'events',
    'message_reactions',
    'chat_messages',
    'channel_members',
    'chat_channels',
    'leave_requests',
    'attendance_rules',
    'attendance',
    'uploads',
    'task_parts',
    'tasks',
    'team_members',
    'teams',
    'users',
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
