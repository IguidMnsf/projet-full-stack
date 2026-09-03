import { all, get } from '../db/index.js';
import { asyncRoute } from '../middleware/auth.js';
import { mapQuiz } from './quizController.js';

const DAY_MS = 24 * 3600 * 1000;
const dayKey = (isoDate) => String(isoDate).slice(0, 10);

export const createDashboardController = () => ({
  stats: asyncRoute(async (req, res) => {
    const user = req.user;
    const isProf = ['professor', 'admin'].includes(user.role);

    const totals = await get(
      `SELECT
        (SELECT COUNT(*) FROM quizzes WHERE is_published = 1) AS total_quizzes,
        (SELECT COUNT(*) FROM quizzes WHERE created_by = ?) AS my_quizzes,
        (SELECT COUNT(*) FROM questions) AS total_questions,
        (SELECT COUNT(*) FROM attempts) AS total_attempts`,
      [user.id]
    );

    const mine = await get(
      `SELECT COUNT(*) AS n, AVG(percentage) AS avg_pct, MAX(percentage) AS best_pct,
              COALESCE(SUM(total_questions), 0) AS answered, COALESCE(SUM(duration_seconds),0) AS seconds
       FROM attempts WHERE user_id = ?`,
      [user.id]
    );

    // Recommended quizzes: user's level first, then the rest (published only).
    const recommended = await all(
      `SELECT q.*, u.name AS owner_name,
              (SELECT COUNT(*) FROM questions qs WHERE qs.quiz_id = q.id) AS question_count,
              (SELECT COUNT(*) FROM attempts at WHERE at.quiz_id = q.id) AS attempt_count
       FROM quizzes q JOIN users u ON u.id = q.created_by
       WHERE q.is_published = 1
       ORDER BY (q.level = ?) DESC, q.created_at DESC
       LIMIT 4`,
      [user.academic_level]
    );

    const recentAttempts = await all(
      `SELECT a.*, q.title AS quiz_title, q.subject AS quiz_subject, q.language AS quiz_language,
              u.name AS user_name, u.avatar_color AS user_color
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN users u ON u.id = a.user_id
       ${isProf ? '' : 'WHERE a.user_id = ?'}
       ORDER BY a.created_at DESC
       LIMIT 6`,
      isProf ? [] : [user.id]
    );

    // Last-14-days activity
    const since = new Date(Date.now() - 13 * DAY_MS).toISOString().slice(0, 19).replace('T', ' ');
    const rows = await all(
      `SELECT created_at, percentage FROM attempts
       WHERE created_at >= ? ${isProf ? '' : 'AND user_id = ?'}
       ORDER BY created_at ASC`,
      isProf ? [since] : [since, user.id]
    );
    const activity = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
      const dayRows = rows.filter((r) => dayKey(r.created_at) === d);
      activity.push({
        date: d,
        count: dayRows.length,
        avg: dayRows.length ? Math.round((dayRows.reduce((s, r) => s + Number(r.percentage), 0) / dayRows.length) * 10) / 10 : null,
      });
    }

    // Community leaderboard (30 days)
    const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 19).replace('T', ' ');
    const leaderboard = await all(
      `SELECT u.id, u.name, u.avatar_color, COUNT(*) AS n, AVG(a.percentage) AS avg_pct
       FROM attempts a JOIN users u ON u.id = a.user_id
       WHERE a.created_at >= ?
       GROUP BY u.id, u.name, u.avatar_color
       ORDER BY avg_pct DESC, n DESC
       LIMIT 5`,
      [since30]
    );

    const subjectRows = await all(
      `SELECT q.subject, COUNT(*) AS n FROM attempts a JOIN quizzes q ON q.id = a.quiz_id
       ${isProf ? '' : 'WHERE a.user_id = ?'}
       GROUP BY q.subject ORDER BY n DESC LIMIT 6`,
      isProf ? [] : [user.id]
    );

    const n = Number(mine?.n || 0);
    res.json({
      data: {
        totals: {
          totalQuizzes: Number(totals?.total_quizzes || 0),
          myQuizzes: Number(totals?.my_quizzes || 0),
          totalQuestions: Number(totals?.total_questions || 0),
          totalAttempts: Number(totals?.total_attempts || 0),
        },
        me: {
          attempts: n,
          avgScore: mine?.avg_pct !== null && mine?.avg_pct !== undefined ? Math.round(Number(mine.avg_pct) * 10) / 10 : null,
          bestScore: mine?.best_pct !== null && mine?.best_pct !== undefined ? Math.round(Number(mine.best_pct) * 10) / 10 : null,
          questionsAnswered: Number(mine?.answered || 0),
          timeSpentMinutes: Math.round(Number(mine?.seconds || 0) / 60),
        },
        recommended: recommended.map(mapQuiz),
        recentAttempts: recentAttempts.map((r) => ({
          id: r.id,
          quizId: r.quiz_id,
          quizTitle: r.quiz_title,
          subject: r.quiz_subject,
          language: r.quiz_language,
          userName: r.user_name,
          userColor: r.user_color,
          score: r.score,
          total: r.total_questions,
          percentage: Math.round(Number(r.percentage) * 10) / 10,
          durationSeconds: r.duration_seconds,
          createdAt: r.created_at,
        })),
        activity,
        leaderboard: leaderboard.map((r) => ({
          userId: r.id,
          name: r.name,
          color: r.avatar_color,
          attempts: Number(r.n),
          avgScore: Math.round(Number(r.avg_pct) * 10) / 10,
        })),
        subjects: subjectRows.map((r) => ({ subject: r.subject, count: Number(r.n) })),
      },
    });
  }),
});
