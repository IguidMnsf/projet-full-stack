import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import config, { REPO_ROOT } from './env.js';
import { initDb } from './db/index.js';
import { initSchema } from './db/initSchema.js';
import { seedIfNeeded } from './db/seed.js';
import { buildRouter } from './routes/index.js';
import { ApiError } from './utils/validation.js';

async function main() {
  await initDb();
  await initSchema();
  await seedIfNeeded(false);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(
    cors({
      origin: config.clientOrigin === '*' ? true : config.clientOrigin.split(',').map((s) => s.trim()),
    })
  );

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'quizflow-api', time: new Date().toISOString() }));
  app.use('/api', buildRouter());

  // API 404 (before SPA fallback)
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API endpoint' } }));

  // Serve the built SPA in production
  const distDir = path.join(REPO_ROOT, 'client', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: 'index.html', maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
    console.log('[app] Serving built client from client/dist');
  }

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Invalid JSON body' } });
    }
    console.error('[error]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Unexpected server error' } });
  });

  app.listen(config.port, config.host, () => {
    console.log(`\n  QuizFlow API ready  →  http://localhost:${config.port}`);
    console.log(`  Demo accounts use the password: password123\n`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
