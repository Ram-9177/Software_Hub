import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

/**
 * Idempotent seed script:
 * The ONLY seed record allowed is the first admin account, created from environment variables.
 * Absolutely NO sample or dummy records anywhere.
 */
export async function seed(knex: Knex): Promise<void> {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@softwarehub2.org').trim().toLowerCase();
  const adminName = process.env.ADMIN_NAME || 'Central Office Admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

  // Check if first admin already exists
  const existingAdmin = await knex('users')
    .whereRaw('LOWER(email) = ?', [adminEmail])
    .first();

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const adminId = 'u-admin-root';

    await knex('users').insert({
      id: adminId,
      name: adminName,
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin',
      intern_type: null,
      current_level: 15,
      marksheet_percentage: null,
      marksheet_confirmed: true,
      status: 'active',
      token_version: 1,
      failed_login_attempts: 0,
      locked_until: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log(`[Seed] Initial Admin account initialized: ${adminEmail}`);
  } else {
    console.log(`[Seed] Admin account ${adminEmail} already exists. Skipping.`);
  }

  // Ensure default attendance rules record exists if missing
  const existingRules = await knex('attendance_rules').first();
  if (!existingRules) {
    await knex('attendance_rules').insert({
      id: 'att-rules-default',
      office_start_time: '09:00',
      grace_minutes: 15,
      half_day_hours: 4.0,
      absent_cutoff_time: '11:00',
      updated_at: new Date(),
    });
    console.log('[Seed] Default attendance rules created (09:00, 15m grace, 4h half-day, 11:00 absent).');
  }
}
