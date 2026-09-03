import { all, get, run, now } from '../db/index.js';
import { hashPassword, verifyPassword, signToken } from '../utils/auth.js';
import { assert, badRequest, cleanString, validEmail, oneOf, LEVELS, LANGUAGES, ROLES, notFound } from '../utils/validation.js';
import { asyncRoute } from '../middleware/auth.js';

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9'];
const pickColor = (email) => AVATAR_COLORS[[...email].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export const mapUser = (u) =>
  u && {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    academicLevel: u.academic_level,
    preferredLanguage: u.preferred_language,
    avatarColor: u.avatar_color || pickColor(u.email),
    createdAt: u.created_at,
  };

export const createAuthController = () => ({
  register: asyncRoute(async (req, res) => {
    const name = cleanString(req.body?.name, { max: 120, field: 'Name' });
    const email = validEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    assert(password.length >= 8, 'Password must be at least 8 characters');
    assert(password.length <= 100, 'Password must be 100 characters or fewer');

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) throw badRequest('An account already exists with this email');

    const role = oneOf(req.body?.role, ROLES, 'student');
    const level = oneOf(req.body?.academicLevel, LEVELS, 'L1');
    const language = oneOf(req.body?.preferredLanguage, LANGUAGES, 'fr');
    const ts = now();

    const result = await run(
      'INSERT INTO users (name, email, password_hash, role, academic_level, preferred_language, avatar_color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, email, await hashPassword(password), role, level, language, pickColor(email), ts, ts]
    );
    const user = await get('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: { token: signToken(user), user: mapUser(user) } });
  }),

  login: asyncRoute(async (req, res) => {
    const email = validEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw badRequest('Incorrect email or password');
    }
    res.json({ data: { token: signToken(user), user: mapUser(user) } });
  }),

  me: asyncRoute(async (req, res) => {
    res.json({ data: { user: mapUser(req.user) } });
  }),

  updateProfile: asyncRoute(async (req, res) => {
    const user = req.user;
    const name = req.body?.name !== undefined ? cleanString(req.body.name, { max: 120, field: 'Name' }) : user.name;
    const level = req.body?.academicLevel !== undefined ? oneOf(req.body.academicLevel, LEVELS, user.academic_level) : user.academic_level;
    const language = req.body?.preferredLanguage !== undefined ? oneOf(req.body.preferredLanguage, LANGUAGES, user.preferred_language) : user.preferred_language;
    const color = req.body?.avatarColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(req.body.avatarColor) ? req.body.avatarColor : user.avatar_color;

    await run('UPDATE users SET name = ?, academic_level = ?, preferred_language = ?, avatar_color = ?, updated_at = ? WHERE id = ?', [
      name,
      level,
      language,
      color,
      now(),
      user.id,
    ]);
    const updated = await get('SELECT * FROM users WHERE id = ?', [user.id]);
    if (!updated) throw notFound('User not found');
    res.json({ data: { user: mapUser(updated) } });
  }),

  changePassword: asyncRoute(async (req, res) => {
    const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const next = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    assert(next.length >= 8, 'New password must be at least 8 characters');

    const row = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!row || !(await verifyPassword(current, row.password_hash))) throw badRequest('Current password is incorrect');

    await run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [await hashPassword(next), now(), req.user.id]);
    res.json({ data: { ok: true } });
  }),

  listStudents: asyncRoute(async (req, res) => {
    const rows = await all(
      `SELECT u.id, u.name, u.email, u.role, u.academic_level, u.preferred_language, u.avatar_color,
              (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id) AS attempt_count,
              (SELECT AVG(a.percentage) FROM attempts a WHERE a.user_id = u.id) AS avg_score
       FROM users u ORDER BY u.name ASC LIMIT 200`
    );
    res.json({
      data: rows.map((r) => ({
        ...mapUser(r),
        attemptCount: Number(r.attempt_count || 0),
        avgScore: r.avg_score === null ? null : Math.round(Number(r.avg_score) * 10) / 10,
      })),
    });
  }),
});
