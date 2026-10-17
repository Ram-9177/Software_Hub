import { db } from '../config/database.js';
import path from 'path';

async function main() {
  console.log('[Runner] Starting migrations...');
  await db.migrate.latest({
    directory: path.resolve(process.cwd(), 'src/db/migrations'),
  });
  console.log('[Runner] Migrations up to date.');

  console.log('[Runner] Running official seed...');
  await db.seed.run({
    directory: path.resolve(process.cwd(), 'src/db/seeds'),
  });
  console.log('[Runner] Seed finished successfully.');

  const users = await db('users').select('id', 'name', 'email', 'role');
  console.log(`[Runner] Official users (${users.length}):`);
  for (const u of users) {
    console.log(` - ${u.name} (${u.role}) <${u.email}>`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[Runner] Error running migration/seed:', err);
  process.exit(1);
});
