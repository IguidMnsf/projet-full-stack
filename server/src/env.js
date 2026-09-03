import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(SERVER_ROOT, '..');

// Tiny .env loader (repo root). Real environment variables always win.
function loadDotEnv() {
  const candidates = [path.join(REPO_ROOT, '.env'), path.join(SERVER_ROOT, '.env')];
  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let value = m[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!(m[1] in process.env)) process.env[m[1]] = value;
      }
    } catch {
      /* file missing — ignore */
    }
  }
}
loadDotEnv();

const parseMysqlUrl = (url) => {
  // mysql://user:password@host:port/database
  try {
    const u = new URL(url);
    return {
      host: u.hostname || '127.0.0.1',
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username || 'root'),
      password: decodeURIComponent(u.password || ''),
      database: (u.pathname || '/').slice(1) || 'quiz_platform',
    };
  } catch {
    return null;
  }
};

const url = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
const urlParts = url ? parseMysqlUrl(url) : null;

export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'quizflow-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || '*',

  // ---- MySQL connection (the app's primary database) ----
  mysql: urlParts
    ? { ...urlParts }
    : {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD ?? '',
        database: process.env.MYSQL_DATABASE || 'quiz_platform',
      },
  mysqlEnabled: process.env.MYSQL_DISABLED !== '1',

  // SQLite is only used as an automatic fallback when no MySQL server is
  // reachable (e.g. sandboxes with restricted networking). Data lives in a
  // real database file on disk.
  sqliteFile: process.env.SQLITE_FILE || path.join(SERVER_ROOT, 'data', 'quiz_platform.sqlite'),

  // ---- AI provider ----
  aiProvider: (process.env.AI_PROVIDER || 'auto').toLowerCase(), // auto | gemini | openai | demo
  geminiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  openaiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};

export default config;
