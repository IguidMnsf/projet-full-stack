import { all, get, run, now } from '../db/index.js';
import { assert, badRequest, cleanString, oneOf, notFound, forbidden, LEVELS, LANGUAGES } from '../utils/validation.js';
import { asyncRoute } from '../middleware/auth.js';

/* ------------------------------- helpers -------------------------------- */

export const mapQuiz = (q) =>
  q && {
    id: q.id,
    title: q.title,
    description: q.description,
    subject: q.subject,
    level: q.level,
    language: q.language,
    durationMinutes: q.duration_minutes,
    isPublished: Boolean(Number(q.is_published)),
    aiGenerated: Boolean(Number(q.ai_generated)),
    aiProvider: q.ai_provider,
    createdBy: q.created_by,
    ownerName: q.owner_name ?? undefined,
    questionCount: q.question_count !== undefined ? Number(q.question_count) : undefined,
    attemptCount: q.attempt_count !== undefined ? Number(q.attempt_count) : undefined,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  };

const mapQuestion = (q) => ({
  id: q.id,
  quizId: q.quiz_id,
  text: q.question_text,
  explanation: q.explanation,
  position: q.position,
  answers: q.answers
    ? q.answers
        .sort((a, b) => a.position - b.position)
        .map((a) => ({
          id: a.id,
          questionId: a.question_id,
          text: a.answer_text,
          isCorrect: Boolean(Number(a.is_correct)),
          position: a.position,
        }))
    : undefined,
});

async function loadQuiz(id) {
  const quiz = await get('SELECT * FROM quizzes WHERE id = ?', [id]);
  if (!quiz) throw notFound('Quiz not found');
  return quiz;
}

async function assertCanEdit(quiz, user) {
  if (!user) throw forbidden('Authentication required');
  if (quiz.created_by !== user.id && user.role !== 'admin') {
    throw forbidden('Only the quiz owner can modify it');
  }
}

function validateQuestionPayload(body) {
  const text = cleanString(body?.text, { max: 2000, min: 3, field: 'Question text' });
  const explanation = body?.explanation ? cleanString(body.explanation, { max: 2000, min: 1, field: 'Explanation' }) : null;
  const answers = Array.isArray(body?.answers) ? body.answers : [];
  assert(answers.length >= 2, 'A question needs at least 2 answers');
  assert(answers.length <= 6, 'A question can have at most 6 answers');
  const cleaned = answers.map((a, i) => ({
    text: cleanString(a?.text, { max: 500, min: 1, field: `Answer ${i + 1}` }),
    isCorrect: Boolean(a?.isCorrect),
  }));
  assert(cleaned.some((a) => a.isCorrect), 'Mark exactly one correct answer');
  assert(cleaned.filter((a) => a.isCorrect).length === 1, 'Mark exactly one correct answer');
  return { text, explanation, answers: cleaned };
}

async function replaceAnswers(questionId, answers) {
  await run('DELETE FROM answers WHERE question_id = ?', [questionId]);
  for (let i = 0; i < answers.length; i++) {
    await run('INSERT INTO answers (question_id, answer_text, is_correct, position) VALUES (?,?,?,?)', [
      questionId,
      answers[i].text,
      answers[i].isCorrect ? 1 : 0,
      i,
    ]);
  }
}

/* ------------------------------ controller ------------------------------ */

export const createQuizController = () => ({
  list: asyncRoute(async (req, res) => {
    const user = req.user;
    const { search = '', level = '', subject = '', language = '', mine = '', sort = 'recent', includeDrafts = '' } = req.query;

    const where = [];
    const params = [];

    if (mine === '1') {
      where.push('q.created_by = ?');
      params.push(user.id);
    } else if (includeDrafts === '1') {
      where.push('(q.is_published = 1 OR q.created_by = ?)');
      params.push(user.id);
    } else {
      where.push('q.is_published = 1');
    }

    if (search.trim()) {
      where.push('(LOWER(q.title) LIKE ? OR LOWER(q.subject) LIKE ? OR LOWER(q.description) LIKE ?)');
      const like = `%${search.trim().toLowerCase()}%`;
      params.push(like, like, like);
    }
    if (oneOf(level, LEVELS, '')) {
      where.push('q.level = ?');
      params.push(level);
    }
    if (subject.trim()) {
      where.push('LOWER(q.subject) = ?');
      params.push(subject.trim().toLowerCase());
    }
    if (oneOf(language, LANGUAGES, '')) {
      where.push('q.language = ?');
      params.push(language);
    }

    const order = sort === 'popular' ? 'attempt_count DESC, q.created_at DESC' : sort === 'title' ? 'q.title ASC' : 'q.created_at DESC';
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const rows = await all(
      `SELECT q.*, u.name AS owner_name,
              (SELECT COUNT(*) FROM questions qs WHERE qs.quiz_id = q.id) AS question_count,
              (SELECT COUNT(*) FROM attempts at WHERE at.quiz_id = q.id) AS attempt_count
       FROM quizzes q JOIN users u ON u.id = q.created_by
       WHERE ${where.join(' AND ')}
       ORDER BY ${order}
       LIMIT ${limit}`,
      params
    );
    res.json({ data: rows.map(mapQuiz) });
  }),

  get: asyncRoute(async (req, res) => {
    const quiz = await loadQuiz(req.params.id);
    const canEdit = quiz.created_by === req.user.id || req.user.role === 'admin';
    if (!quiz.is_published && !canEdit) throw forbidden('This quiz is not published yet');
    const owner = await get('SELECT name FROM users WHERE id = ?', [quiz.created_by]);
    const counts = await all(
      `SELECT
        (SELECT COUNT(*) FROM questions qs WHERE qs.quiz_id = ?) AS question_count,
        (SELECT COUNT(*) FROM attempts at WHERE at.quiz_id = ?) AS attempt_count`,
      [quiz.id, quiz.id]
    );
    res.json({
      data: mapQuiz({
        ...quiz,
        owner_name: owner?.name,
        question_count: counts[0]?.question_count ?? 0,
        attempt_count: counts[0]?.attempt_count ?? 0,
      }),
      meta: { canEdit },
    });
  }),

  create: asyncRoute(async (req, res) => {
    const title = cleanString(req.body?.title, { max: 200, min: 3, field: 'Title' });
    const description = req.body?.description ? cleanString(req.body.description, { max: 1000, field: 'Description' }) : null;
    const subject = cleanString(req.body?.subject, { max: 80, min: 1, field: 'Subject' });
    const level = oneOf(req.body?.level, LEVELS, 'L1');
    const language = oneOf(req.body?.language, LANGUAGES, 'fr');
    const durationMinutes = Math.min(Math.max(Number(req.body?.durationMinutes) || 15, 1), 180);
    const isPublished = req.body?.isPublished === undefined ? 1 : req.body.isPublished ? 1 : 0;
    const ts = now();

    const result = await run(
      `INSERT INTO quizzes (created_by, title, description, subject, level, language, duration_minutes, is_published, ai_generated, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,0,?,?)`,
      [req.user.id, title, description, subject, level, language, durationMinutes, isPublished, ts, ts]
    );
    const quiz = await get('SELECT * FROM quizzes WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: mapQuiz({ ...quiz, owner_name: req.user.name }) });
  }),

  update: asyncRoute(async (req, res) => {
    const quiz = await loadQuiz(req.params.id);
    await assertCanEdit(quiz, req.user);

    const title = req.body?.title !== undefined ? cleanString(req.body.title, { max: 200, min: 3, field: 'Title' }) : quiz.title;
    const description = req.body?.description !== undefined ? (req.body.description ? cleanString(req.body.description, { max: 1000, field: 'Description' }) : null) : quiz.description;
    const subject = req.body?.subject !== undefined ? cleanString(req.body.subject, { max: 80, min: 1, field: 'Subject' }) : quiz.subject;
    const level = req.body?.level !== undefined ? oneOf(req.body.level, LEVELS, quiz.level) : quiz.level;
    const language = req.body?.language !== undefined ? oneOf(req.body.language, LANGUAGES, quiz.language) : quiz.language;
    const durationMinutes = req.body?.durationMinutes !== undefined ? Math.min(Math.max(Number(req.body.durationMinutes) || 15, 1), 180) : quiz.duration_minutes;
    const isPublished = req.body?.isPublished !== undefined ? (req.body.isPublished ? 1 : 0) : Number(quiz.is_published);

    await run(
      'UPDATE quizzes SET title=?, description=?, subject=?, level=?, language=?, duration_minutes=?, is_published=?, updated_at=? WHERE id=?',
      [title, description, subject, level, language, durationMinutes, isPublished, now(), quiz.id]
    );
    const updated = await get('SELECT * FROM quizzes WHERE id = ?', [quiz.id]);
    res.json({ data: mapQuiz({ ...updated, owner_name: req.user.name }) });
  }),

  remove: asyncRoute(async (req, res) => {
    const quiz = await loadQuiz(req.params.id);
    await assertCanEdit(quiz, req.user);
    await run('DELETE FROM quizzes WHERE id = ?', [quiz.id]);
    res.json({ data: { ok: true } });
  }),

  /** Full quiz with questions (+answers). mode=edit includes correct answers. */
  full: asyncRoute(async (req, res) => {
    const quiz = await loadQuiz(req.params.id);
    const canEdit = quiz.created_by === req.user.id || req.user.role === 'admin';
    const mode = req.query.mode === 'edit' ? 'edit' : 'play';
    if (mode === 'edit' && !canEdit) throw forbidden('Only the quiz owner can edit it');
    if (!quiz.is_published && !canEdit) throw forbidden('This quiz is not published yet');

    const questions = await all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC, id ASC', [quiz.id]);
    const answerRows = questions.length
      ? await all(
          `SELECT * FROM answers WHERE question_id IN (${questions.map(() => '?').join(',')}) ORDER BY position ASC, id ASC`,
          questions.map((q) => q.id)
        )
      : [];
    const byQuestion = new Map();
    for (const a of answerRows) {
      if (!byQuestion.has(a.question_id)) byQuestion.set(a.question_id, []);
      byQuestion.get(a.question_id).push(a);
    }

    let payload = questions.map((q) => mapQuestion({ ...q, answers: byQuestion.get(q.id) || [] }));
    if (mode === 'play') {
      payload = payload.map((q) => ({ ...q, answers: q.answers.map(({ isCorrect, ...a }) => a) }));
    }
    res.json({
      data: {
        ...mapQuiz({ ...quiz, owner_name: undefined }),
        questions: payload,
      },
      meta: { canEdit, mode },
    });
  }),

  /* ------------------------- questions CRUD ------------------------- */

  addQuestion: asyncRoute(async (req, res) => {
    const quiz = await loadQuiz(req.params.id);
    await assertCanEdit(quiz, req.user);
    const { text, explanation, answers } = validateQuestionPayload(req.body);

    const posRow = await get('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM questions WHERE quiz_id = ?', [quiz.id]);
    const qRes = await run(
      'INSERT INTO questions (quiz_id, question_text, explanation, position, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      [quiz.id, text, explanation, Number(posRow?.p ?? 0), now(), now()]
    );
    for (let i = 0; i < answers.length; i++) {
      await run('INSERT INTO answers (question_id, answer_text, is_correct, position) VALUES (?,?,?,?)', [
        qRes.insertId,
        answers[i].text,
        answers[i].isCorrect ? 1 : 0,
        i,
      ]);
    }
    const answerRows = await all('SELECT * FROM answers WHERE question_id = ? ORDER BY position ASC', [qRes.insertId]);
    res.status(201).json({ data: mapQuestion({ ...(await get('SELECT * FROM questions WHERE id = ?', [qRes.insertId])), answers: answerRows }) });
  }),

  updateQuestion: asyncRoute(async (req, res) => {
    const question = await get('SELECT * FROM questions WHERE id = ?', [req.params.id]);
    if (!question) throw notFound('Question not found');
    const quiz = await loadQuiz(question.quiz_id);
    await assertCanEdit(quiz, req.user);
    const { text, explanation, answers } = validateQuestionPayload({ ...req.body, text: req.body?.text ?? question.question_text });

    await run('UPDATE questions SET question_text = ?, explanation = ?, updated_at = ? WHERE id = ?', [text, explanation, now(), question.id]);
    await replaceAnswers(question.id, answers);
    const answerRows = await all('SELECT * FROM answers WHERE question_id = ? ORDER BY position ASC', [question.id]);
    res.json({ data: mapQuestion({ ...(await get('SELECT * FROM questions WHERE id = ?', [question.id])), answers: answerRows }) });
  }),

  removeQuestion: asyncRoute(async (req, res) => {
    const question = await get('SELECT * FROM questions WHERE id = ?', [req.params.id]);
    if (!question) throw notFound('Question not found');
    const quiz = await loadQuiz(question.quiz_id);
    await assertCanEdit(quiz, req.user);
    await run('DELETE FROM questions WHERE id = ?', [question.id]);
    res.json({ data: { ok: true } });
  }),

  /* -------------------------- answers CRUD -------------------------- */

  addAnswer: asyncRoute(async (req, res) => {
    const question = await get('SELECT * FROM questions WHERE id = ?', [req.params.id]);
    if (!question) throw notFound('Question not found');
    const quiz = await loadQuiz(question.quiz_id);
    await assertCanEdit(quiz, req.user);
    const text = cleanString(req.body?.text, { max: 500, min: 1, field: 'Answer text' });
    const isCorrect = req.body?.isCorrect ? 1 : 0;

    if (isCorrect) await run('UPDATE answers SET is_correct = 0 WHERE question_id = ?', [question.id]);
    const existing = await all('SELECT id FROM answers WHERE question_id = ?', [question.id]);
    if (existing.length >= 6) throw badRequest('A question can have at most 6 answers');

    const posRow = await get('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM answers WHERE question_id = ?', [question.id]);
    const resIns = await run('INSERT INTO answers (question_id, answer_text, is_correct, position) VALUES (?,?,?,?)', [
      question.id,
      text,
      isCorrect,
      Number(posRow?.p ?? 0),
    ]);
    const answer = await get('SELECT * FROM answers WHERE id = ?', [resIns.insertId]);
    res.status(201).json({ data: { id: answer.id, questionId: answer.question_id, text: answer.answer_text, isCorrect: Boolean(answer.is_correct), position: answer.position } });
  }),

  updateAnswer: asyncRoute(async (req, res) => {
    const answer = await get('SELECT * FROM answers WHERE id = ?', [req.params.id]);
    if (!answer) throw notFound('Answer not found');
    const question = await get('SELECT * FROM questions WHERE id = ?', [answer.question_id]);
    const quiz = await loadQuiz(question.quiz_id);
    await assertCanEdit(quiz, req.user);

    const text = req.body?.text !== undefined ? cleanString(req.body.text, { max: 500, min: 1, field: 'Answer text' }) : answer.answer_text;
    const isCorrect = req.body?.isCorrect !== undefined ? (req.body.isCorrect ? 1 : 0) : Number(answer.is_correct);
    if (isCorrect) await run('UPDATE answers SET is_correct = 0 WHERE question_id = ?', [question.id]);
    await run('UPDATE answers SET answer_text = ?, is_correct = ? WHERE id = ?', [text, isCorrect, answer.id]);
    const updated = await get('SELECT * FROM answers WHERE id = ?', [answer.id]);
    res.json({ data: { id: updated.id, questionId: updated.question_id, text: updated.answer_text, isCorrect: Boolean(updated.is_correct), position: updated.position } });
  }),

  removeAnswer: asyncRoute(async (req, res) => {
    const answer = await get('SELECT * FROM answers WHERE id = ?', [req.params.id]);
    if (!answer) throw notFound('Answer not found');
    const question = await get('SELECT * FROM questions WHERE id = ?', [answer.question_id]);
    const quiz = await loadQuiz(question.quiz_id);
    await assertCanEdit(quiz, req.user);

    const remaining = await all('SELECT id FROM answers WHERE question_id = ?', [question.id]);
    if (remaining.length <= 2) throw badRequest('A question needs at least 2 answers');

    await run('DELETE FROM answers WHERE id = ?', [answer.id]);
    if (Number(answer.is_correct)) {
      const next = await get('SELECT id FROM answers WHERE question_id = ? ORDER BY position ASC, id ASC LIMIT 1', [question.id]);
      if (next) await run('UPDATE answers SET is_correct = 1 WHERE id = ?', [next.id]);
    }
    res.json({ data: { ok: true } });
  }),

  /* ------------------------ bulk AI import -------------------------- */

  bulkImportQuestions: asyncRoute(async (req, res) => {
    const quiz = await loadQuiz(req.params.id);
    await assertCanEdit(quiz, req.user);
    const list = Array.isArray(req.body?.questions) ? req.body.questions.slice(0, 20) : [];
    assert(list.length > 0, 'No questions to import');

    let posRow = await get('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM questions WHERE quiz_id = ?', [quiz.id]);
    let position = Number(posRow?.p ?? 0);
    const created = [];
    for (const item of list) {
      const { text, explanation, answers } = validateQuestionPayload(item);
      const qRes = await run('INSERT INTO questions (quiz_id, question_text, explanation, position, created_at, updated_at) VALUES (?,?,?,?,?,?)', [
        quiz.id,
        text,
        explanation,
        position++,
        now(),
        now(),
      ]);
      for (let i = 0; i < answers.length; i++) {
        await run('INSERT INTO answers (question_id, answer_text, is_correct, position) VALUES (?,?,?,?)', [qRes.insertId, answers[i].text, answers[i].isCorrect ? 1 : 0, i]);
      }
      const answerRows = await all('SELECT * FROM answers WHERE question_id = ? ORDER BY position ASC', [qRes.insertId]);
      created.push(mapQuestion({ id: qRes.insertId, quiz_id: quiz.id, question_text: text, explanation, position: position - 1, answers: answerRows }));
    }
    if (req.body?.markAiGenerated) {
      await run('UPDATE quizzes SET ai_generated = 1, ai_provider = COALESCE(?, ai_provider), updated_at = ? WHERE id = ?', [
        req.body.aiProvider || null,
        now(),
        quiz.id,
      ]);
    }
    res.status(201).json({ data: created });
  }),

  /* --------------------------- attempts ----------------------------- */

  submitAttempt: asyncRoute(async (req, res) => {
    const quiz = await loadQuiz(req.params.id);
    const canEdit = quiz.created_by === req.user.id || req.user.role === 'admin';
    if (!quiz.is_published && !canEdit) throw forbidden('This quiz is not published yet');

    const submitted = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const durationSeconds = Math.min(Math.max(Number(req.body?.durationSeconds) || 0, 0), 24 * 3600);

    const questions = await all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC, id ASC', [quiz.id]);
    if (questions.length === 0) throw badRequest('This quiz has no questions yet');
    const answerRows = await all(
      `SELECT * FROM answers WHERE question_id IN (${questions.map(() => '?').join(',')})`,
      questions.map((q) => q.id)
    );
    const answersByQuestion = new Map();
    for (const a of answerRows) {
      if (!answersByQuestion.has(a.question_id)) answersByQuestion.set(a.question_id, []);
      answersByQuestion.get(a.question_id).push(a);
    }

    const selectedByQuestion = new Map();
    for (const item of submitted) {
      const qid = Number(item?.questionId);
      const aid = Number(item?.answerId);
      if (qid && aid) selectedByQuestion.set(qid, aid);
    }

    const details = [];
    let score = 0;
    for (const q of questions) {
      const options = answersByQuestion.get(q.id) || [];
      const correct = options.find((o) => Number(o.is_correct));
      const selectedId = selectedByQuestion.get(q.id) || null;
      const isCorrect = Boolean(correct && selectedId === correct.id);
      if (isCorrect) score++;
      details.push({
        questionId: q.id,
        selectedAnswerId: selectedId,
        correctAnswerId: correct?.id ?? null,
        correct: isCorrect,
      });
    }

    const total = questions.length;
    const percentage = Math.round((score / total) * 1000) / 10;
    const ins = await run(
      `INSERT INTO attempts (user_id, quiz_id, score, total_questions, percentage, duration_seconds, details, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.user.id, quiz.id, score, total, percentage, durationSeconds, JSON.stringify(details), now()]
    );

    res.status(201).json({
      data: {
        attemptId: ins.insertId,
        quizId: quiz.id,
        quizTitle: quiz.title,
        score,
        total,
        percentage,
        durationSeconds,
        breakdown: questions.map((q) => {
          const d = details.find((x) => x.questionId === q.id);
          const options = (answersByQuestion.get(q.id) || [])
            .sort((a, b) => a.position - b.position)
            .map((o) => ({ id: o.id, text: o.answer_text, isCorrect: Boolean(Number(o.is_correct)) }));
          return {
            questionId: q.id,
            text: q.question_text,
            explanation: q.explanation,
            answers: options,
            selectedAnswerId: d.selectedAnswerId,
            correctAnswerId: d.correctAnswerId,
            correct: d.correct,
          };
        }),
      },
    });
  }),

  listAttempts: asyncRoute(async (req, res) => {
    const quiz = await loadQuiz(req.params.id);
    const canEdit = quiz.created_by === req.user.id || req.user.role === 'admin';
    if (!canEdit) throw forbidden('Only the quiz owner can view all attempts');
    const rows = await all(
      `SELECT a.*, u.name AS user_name, u.avatar_color AS user_color
       FROM attempts a JOIN users u ON u.id = a.user_id
       WHERE a.quiz_id = ? ORDER BY a.created_at DESC LIMIT 200`,
      [quiz.id]
    );
    res.json({
      data: rows.map((r) => ({
        id: r.id,
        quizId: r.quiz_id,
        quizTitle: quiz.title,
        userId: r.user_id,
        userName: r.user_name,
        userColor: r.user_color,
        score: r.score,
        total: r.total_questions,
        percentage: Math.round(Number(r.percentage) * 10) / 10,
        durationSeconds: r.duration_seconds,
        createdAt: r.created_at,
      })),
    });
  }),
});
