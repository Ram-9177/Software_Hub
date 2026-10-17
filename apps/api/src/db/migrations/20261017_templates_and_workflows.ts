import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Certificate Templates Table
  const hasCertTemplates = await knex.schema.hasTable('certificate_templates');
  if (!hasCertTemplates) {
    await knex.schema.createTable('certificate_templates', (table) => {
      table.string('id').primary();
      table.string('category').notNullable(); // paid, unpaid
      table.string('title').notNullable();
      table.string('background_image_path').notNullable();
      table.float('min_attendance_percentage').defaultTo(90.0);
      table.float('min_marksheet_percentage').defaultTo(80.0);
      table.integer('min_level').defaultTo(1);
      table.string('authorized_signatory').defaultTo('Director, Central Office, St. Mary’s Rehabilitation University');
      table.boolean('is_active').defaultTo(true);
      table.text('field_coordinates').nullable(); // JSON configuration for text placement
      table.timestamps(true, true);
    });
  }

  // 2. Persistent Notifications Table
  const hasNotifications = await knex.schema.hasTable('notifications');
  if (!hasNotifications) {
    await knex.schema.createTable('notifications', (table) => {
      table.string('id').primary();
      table.string('user_id').notNullable();
      table.string('title').notNullable();
      table.text('message').notNullable();
      table.string('type').notNullable(); // leave_request, level_approval, certificate_review, task_review, announcement
      table.string('resource_type').nullable();
      table.string('resource_id').nullable();
      table.string('action_url').nullable();
      table.boolean('is_read').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 3. Alter leave_requests for categories, duration, supporting doc, and reviews
  const hasLeaveCategory = await knex.schema.hasColumn('leave_requests', 'leave_category');
  if (!hasLeaveCategory) {
    await knex.schema.alterTable('leave_requests', (table) => {
      table.string('leave_category').defaultTo('full_day'); // full_day, half_day, work_from_home, other
      table.string('partial_day_duration').nullable();
      table.string('supporting_document_url').nullable();
      table.text('review_comment').nullable();
      table.timestamp('reviewed_at').nullable();
    });
  }

  // 4. Alter attendance for geolocation and campus geofencing
  const hasLatitude = await knex.schema.hasColumn('attendance', 'latitude');
  if (!hasLatitude) {
    await knex.schema.alterTable('attendance', (table) => {
      table.float('latitude').nullable();
      table.float('longitude').nullable();
      table.float('location_accuracy').nullable();
      table.boolean('within_campus_boundary').nullable();
      table.string('check_in_ip').nullable();
      table.string('check_out_ip').nullable();
    });
  }

  // 5. Alter certificates for template link and reissue auditing
  const hasTemplateId = await knex.schema.hasColumn('certificates', 'template_id');
  if (!hasTemplateId) {
    await knex.schema.alterTable('certificates', (table) => {
      table.string('template_id').nullable();
      table.string('category').nullable(); // paid, unpaid
      table.string('reissued_from').nullable();
      table.text('reissue_reason').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('certificate_templates');
}
