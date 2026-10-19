import { db } from '../config/database.js';
import { seed } from './seeds/initial_seed.js';
import path from 'path';

async function main() {
  console.log('[Migrate] Applying database migrations...');
  await db.migrate.latest({
    directory: path.resolve(process.cwd(), 'src/db/migrations'),
  });
  console.log('[Seed] Running database seed...');
  await seed(db);
  console.log('[Seed] Database seeded successfully!');
  await db.destroy();
}

main().catch((err) => {
  console.error('[Seed] Database seeding failed:', err);
  process.exit(1);
});
