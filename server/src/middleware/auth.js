import { get } from '../db/index.js';
import { verifyToken } from '../utils/auth.js';

/** Extracts and verifies the JWT from the Authorization header, loads the user. */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: { code: 'TOKEN_INVALID', message: 'Session expired, please sign in again' } });
    }

    const user = await get('SELECT id, name, email, role, academic_level, preferred_language, avatar_color, created_at FROM users WHERE id = ?', [payload.sub]);
    if (!user) return res.status(401).json({ error: { code: 'USER_GONE', message: 'Account no longer exists' } });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth: attaches req.user when a valid token is present, never blocks. */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      try {
        const payload = verifyToken(token);
        const user = await get('SELECT id, name, email, role, academic_level, preferred_language, avatar_color, created_at FROM users WHERE id = ?', [payload.sub]);
        if (user) req.user = user;
      } catch {
        /* ignore invalid token on optional routes */
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to do this' } });
  }
  next();
};

/** Async wrapper so thrown errors reach the error handler. */
export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
