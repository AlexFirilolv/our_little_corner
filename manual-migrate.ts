import * as dotenv from 'dotenv';
dotenv.config();

import { runPendingMigrations } from './app/lib/migrations';
import { waitForDB } from './app/lib/db';

async function main() {
  console.log('DATABASE_URL from env:', process.env.DATABASE_URL);
  console.log('Starting manual migration...');
  await waitForDB();
  await runPendingMigrations();
  console.log('Migration complete.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
