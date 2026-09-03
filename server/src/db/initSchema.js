import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec, kind } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Applies the schema for the active dialect, then seeds demo data if empty. */
export async function initSchema() {
  const file = kind() === 'mysql' ? 'schema.mysql.sql' : 'schema.sqlite.sql';
  const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
  await exec(sql);
  console.log(`[db] ✔ Schema applied (${file})`);
}
