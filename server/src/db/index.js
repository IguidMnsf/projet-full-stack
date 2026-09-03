import config from '../env.js';

/**
 * Database adapter.
 *
 * The platform is MySQL-first: when a MySQL server (or MariaDB) is reachable it
 * is used through the `mysql2` driver. When no MySQL server can be reached
 * (e.g. sandboxed/offline environments), the adapter transparently falls back
 * to an embedded engine (Node's built-in SQLite) using the exact same schema
 * and queries, so the whole stack keeps working with real persisted data.
 *
 * Controllers only use: all() / get() / run() / exec() — dialect-agnostic.
 */
let db = null;

const ISO = (d = new Date()) =>
  d.toISOString().slice(0, 19).replace('T', ' ');

export const now = () => ISO();

/* ---------------------------------- MySQL ---------------------------------- */
async function connectMysql() {
  const mysql = await import('mysql2/promise');
  const base = {
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    connectTimeout: 4000,
  };

  // Make sure the database exists.
  const bootstrap = await mysql.createConnection(base);
  await bootstrap
    .query(
      `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .catch(() => {});
  await bootstrap.end();

  const pool = mysql.createPool({
    ...base,
    database: config.mysql.database,
    connectionLimit: 10,
    namedPlaceholders: false,
    dateStrings: true,
    multipleStatements: false,
  });
  await pool.query('SELECT 1');

  return {
    kind: 'mysql',
    async all(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    async get(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows[0];
    },
    async run(sql, params = []) {
      const [res] = await pool.query(sql, params);
      return { insertId: Number(res.insertId || 0), changes: Number(res.affectedRows || 0) };
    },
    async exec(sql) {
      const conn = await pool.getConnection();
      try {
        const statements = sql
          .split(/;\s*\n/)
          .map((s) => s.trim())
          .filter((s) => s && !s.startsWith('--'));
        for (const stmt of statements) {
          await conn.query(stmt);
        }
      } finally {
        conn.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

/* ------------------------------ SQLite fallback ----------------------------- */
async function connectSqlite() {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { DatabaseSync } = await import('node:sqlite');

  fs.mkdirSync(path.dirname(config.sqliteFile), { recursive: true });
  const sqlite = new DatabaseSync(config.sqliteFile);
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const norm = (p) => (p === undefined ? null : p);
  return {
    kind: 'sqlite',
    async all(sql, params = []) {
      return sqlite.prepare(sql).all(...params.map(norm));
    },
    async get(sql, params = []) {
      return sqlite.prepare(sql).get(...params.map(norm));
    },
    async run(sql, params = []) {
      const res = sqlite.prepare(sql).run(...params.map(norm));
      return { insertId: Number(res.lastInsertRowid || 0), changes: Number(res.changes || 0) };
    },
    async exec(sql) {
      sqlite.exec(sql);
    },
    async close() {
      sqlite.close();
    },
  };
}

/** Connect to MySQL; fall back to embedded SQLite when unreachable. */
export async function initDb() {
  if (db) return db;
  if (config.mysqlEnabled) {
    try {
      db = await connectMysql();
      console.log(`[db] ✔ Connected to MySQL at ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);
      return db;
    } catch (err) {
      console.warn(`[db] ✖ MySQL unavailable (${err.code || err.message}). Falling back to embedded SQLite.`);
      console.warn('[db]   → set DATABASE_URL in .env to use MySQL when available.');
    }
  }
  db = await connectSqlite();
  console.log(`[db] ✔ Embedded database ready at ${config.sqliteFile}`);
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialised');
  return db;
}

export const isMysql = () => db?.kind === 'mysql';

// Convenience helpers used by controllers
export const all = (sql, params) => getDb().all(sql, params);
export const get = (sql, params) => getDb().get(sql, params);
export const run = (sql, params) => getDb().run(sql, params);
export const exec = (sql) => getDb().exec(sql);
export const kind = () => db?.kind;

export default { initDb, getDb, all, get, run, exec, kind, isMysql, now };
