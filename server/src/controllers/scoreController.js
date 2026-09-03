import { all, get, run } from '../db/index.js';
import { notFound, forbidden } from '../utils/validation.js';
import { asyncRoute } from '../middleware/auth.js';

const mapAttempt = (r) => ({
  id: r.id,
  quizId: r.quiz_id,
  quizTitle: r.quiz_title,
  quizSubject: r.quiz_subject,
  quizLanguage: r.quiz_language,
  userId: r.user_id,
  userName: r.user_name,
  userColor: r.user_color,
  score: r.score,
  total: r.total_questions,
  percentage: Math.round(Number(r.percentage) * 10) / 10,
  durationSeconds: r.duration_seconds,
  createdAt: r.created_at,
});

export const createScoreController = () => ({
  list: asyncRoute(async (req, res) => {
    const scope = req.query.scope === 'all' ? 'all' : 'mine';
    if (scope === 'all' && !['professor', 'admin'].includes(req.user.role)) {
      throw forbidden('Only professors can view all attempts');
    }
    const quizId = Number(req.query.quizId) || null;
    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const where = scope === 'all' ? '1=1' : 'a.user_id = ?';
    const params = scope === 'all' ? [] : [req.user.id];
    if (quizId) {
      where === '1=1' ? params.push(quizId) : params.push(quizId);
    }

    const rows = await all(
      `SELECT a.*, q.title AS quiz_title, q.subject AS quiz_subject, q.language AS quiz_language,
              u.name AS user_name, u.avatar_color AS user_color
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN users u ON u.id = a.user_id
       WHERE ${where}${quizId ? ' AND a.quiz_id = ?' : ''}
       ORDER BY a.created_at DESC
       LIMIT ${limit}`,
      params
    );
    res.json({ data: rows.map(mapAttempt) });
  }),

  detail: asyncRoute(async (req, res) => {
    const row = await get(
      `SELECT a.*, q.title AS quiz_title, q.subject AS quiz_subject, q.language AS quiz_language,
              u.name AS user_name, u.avatar_color AS user_color
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN users u ON u.id = a.user_id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!row) throw notFound('Attempt not found');
    const canSee = row.user_id === req.user.id || ['professor', 'admin'].includes(req.user.role);
    if (!canSee) throw forbidden('You cannot view this attempt');

    let breakdown = [];
    try {
      const details = JSON.parse(row.details || '[]');
      if (Array.isArray(details) && details.length) {
        const questionIds = details.map((d) => d.questionId);
        const questions = await all(
          `SELECT * FROM questions WHERE id IN (${questionIds.map(() => '?').join(',')})`,
          questionIds
        );
        const answers = await all(
          `SELECT * FROM answers WHERE question_id IN (${questionIds.map(() => '?').join(',')}) ORDER BY position ASC, id ASC`,
          questionIds
        );
        breakdown = questions
          .sort((a, b) => a.position - b.position)
          .map((q) => {
            const d = details.find((x) => x.questionId === q.id) || {};
            return {
              questionId: q.id,
              text: q.question_text,
              explanation: q.explanation,
              answers: answers
                .filter((a) => a.question_id === q.id)
                .map((a) => ({ id: a.id, text: a.answer_text, isCorrect: Boolean(Number(a.is_correct)) })),
              selectedAnswerId: d.selectedAnswerId ?? null,
              correctAnswerId: d.correctAnswerId ?? null,
              correct: Boolean(d.correct),
            };
          });
      }
    } catch {
      breakdown = [];
    }

    res.json({ data: { ...mapAttempt(row), breakdown } });
  }),

  remove: asyncRoute(async (req, res) => {
    const attempt = await get('SELECT * FROM attempts WHERE id = ?', [req.params.id]);
    if (!attempt) throw notFound('Attempt not found');
    const canDelete = attempt.user_id === req.user.id || ['professor', 'admin'].includes(req.user.role);
    if (!canDelete) throw forbidden('You cannot delete this attempt');
    await run('DELETE FROM attempts WHERE id = ?', [attempt.id]);
    res.json({ data: { ok: true } });
  }),
});
