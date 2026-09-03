/** Re-seed the database from scratch: node src/db/seed-cli.js [--force] */
import { initDb } from './index.js';
import { initSchema } from './initSchema.js';
import { seedIfNeeded } from './seed.js';

const force = process.argv.includes('--force');
await initDb();
await initSchema();
await seedIfNeeded(force);
process.exit(0);
