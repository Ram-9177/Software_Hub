import { db } from '../config/database.js';
import { seed } from './seeds/initial_seed.js';

async function main() {
  console.log('[Seed] Running database seed...');
  await seed(db);
  console.log('[Seed] Database seeded successfully!');
  await db.destroy();
}

main().catch((err) => {
  console.error('[Seed] Database seeding failed:', err);
  process.exit(1);
});
