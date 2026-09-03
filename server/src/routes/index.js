import { Router } from 'express';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js';
import { createAuthController } from '../controllers/authController.js';
import { createQuizController } from '../controllers/quizController.js';
import { createScoreController } from '../controllers/scoreController.js';
import { createAiController } from '../controllers/aiController.js';
import { createDashboardController } from '../controllers/dashboardController.js';

export const buildRouter = () => {
  const router = Router();
  const auth = createAuthController();
  const quizzes = createQuizController();
  const scores = createScoreController();
  const ai = createAiController();
  const dashboard = createDashboardController();

  /* ------------------------------- auth ------------------------------- */
  router.post('/auth/register', auth.register);
  router.post('/auth/login', auth.login);
  router.get('/auth/me', requireAuth, auth.me);
  router.put('/auth/profile', requireAuth, auth.updateProfile);
  router.put('/auth/password', requireAuth, auth.changePassword);
  router.get('/users', requireAuth, requireRole('professor', 'admin'), auth.listStudents);

  /* ----------------------------- dashboard ---------------------------- */
  router.get('/dashboard', requireAuth, dashboard.stats);

  /* ------------------------- quizzes (full CRUD) ---------------------- */
  router.get('/quizzes', requireAuth, quizzes.list);
  router.post('/quizzes', requireAuth, quizzes.create);
  router.get('/quizzes/:id', requireAuth, quizzes.get);
  router.put('/quizzes/:id', requireAuth, quizzes.update);
  router.delete('/quizzes/:id', requireAuth, quizzes.remove);

  /* play (answers stripped) / edit (with correct answers) */
  router.get('/quizzes/:id/full', requireAuth, quizzes.full);

  /* ------------------------ questions (full CRUD) --------------------- */
  router.post('/quizzes/:id/questions', requireAuth, quizzes.addQuestion);
  router.post('/quizzes/:id/questions/bulk', requireAuth, quizzes.bulkImportQuestions);
  router.put('/questions/:id', requireAuth, quizzes.updateQuestion);
  router.delete('/questions/:id', requireAuth, quizzes.removeQuestion);

  /* -------------------------- answers (CRUD) -------------------------- */
  router.post('/questions/:id/answers', requireAuth, quizzes.addAnswer);
  router.put('/answers/:id', requireAuth, quizzes.updateAnswer);
  router.delete('/answers/:id', requireAuth, quizzes.removeAnswer);

  /* ------------------------- attempts / scores ------------------------ */
  router.post('/quizzes/:id/attempts', requireAuth, quizzes.submitAttempt);
  router.get('/quizzes/:id/attempts', requireAuth, quizzes.listAttempts);
  router.get('/scores', requireAuth, scores.list);
  router.get('/scores/:id', requireAuth, scores.detail);
  router.delete('/scores/:id', requireAuth, scores.remove);

  /* --------------------------------- AI ------------------------------- */
  router.get('/ai/status', requireAuth, ai.status);
  router.post('/ai/generate', requireAuth, ai.generate);

  return router;
};
