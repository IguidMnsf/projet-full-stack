-- QuizFlow — SQLite fallback schema (mirrors schema.mysql.sql).
-- Only used when no MySQL server is reachable (restricted environments).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','professor','admin')),
  academic_level TEXT NOT NULL DEFAULT 'L1' CHECK (academic_level IN ('L1','L2','L3','M1','M2')),
  preferred_language TEXT NOT NULL DEFAULT 'fr' CHECK (preferred_language IN ('fr','en','ar')),
  avatar_color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL DEFAULT 'General',
  level TEXT NOT NULL DEFAULT 'L1' CHECK (level IN ('L1','L2','L3','M1','M2')),
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en','ar')),
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_published INTEGER NOT NULL DEFAULT 1,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  ai_provider TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quizzes_owner ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_level ON quizzes(level);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  explanation TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON attempts(quiz_id);
