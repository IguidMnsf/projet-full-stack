# QuizFlow — Plateforme intelligente de quiz (FR · العربية · EN)

Full-stack **intelligent quiz platform for higher education**, tailored to students' academic
levels. Built with **React (Vite)**, **Node.js/Express**, **MySQL**, and an **AI layer
(Gemini / OpenAI)** that generates MCQs from course text — with answer explanations.

> 🌐 Trilingual interface: **Français, العربية (full RTL), English** — switchable at runtime.

---

## ✨ Features

| Area | Details |
|---|---|
| **Auth (JWT)** | Register / login with `bcryptjs` hashing, JWT sessions (7 days), roles (`student`, `professor`, `admin`), profile & password management |
| **Dashboard** | Sidebar navigation, stat cards, 14-day activity chart, level-tailored recommendations, recent attempts, 30-day leaderboard, subject breakdown |
| **Quizzes (CRUD)** | Create / read / update / delete quizzes with subject, academic level (L1–M2), language, duration, publish/draft toggle, ownership permissions |
| **Questions (CRUD)** | Nested question management: create, edit, delete, 2–6 answers each with exactly one correct answer + explanation |
| **Answers (CRUD)** | Granular answer endpoints (add / update / delete) with automatic correct-answer maintenance |
| **Quiz player** | Question-by-question navigation, answer dots map, timer, submit confirmation, score ring, **detailed correction with explanations** |
| **Scores (CRUD)** | Attempts are graded server-side, persisted, listed (personal history; professors see everyone), inspectable with full breakdown, deletable |
| **AI generation** | Paste course text → Gemini or OpenAI generates MCQs **with explanations** → review → bulk-import into any quiz. Falls back to a built-in offline generator when no key is configured |
| **Level tailoring** | Registration selects academic level; dashboard recommendations prioritize it; AI prompts adapt difficulty per level |
| **i18n / RTL** | Full FR / AR / EN dictionaries, instant switching, automatic `dir=rtl` with CSS logical properties |
| **Polish** | Empty states, skeleton loading states, toasts, confirm dialogs, **optimistic updates with rollback** (quiz delete, question delete, score delete, publish toggle), responsive down to mobile |

---

## 🚀 Quick start

```bash
npm run install:all     # install root + server + client dependencies
npm run dev             # API on :4000  +  Vite dev server on :5173 (proxy /api)
```

Open **http://localhost:5173** — the database is created and seeded automatically
(5 users, 8 quizzes, 33 questions, 14 attempts) on first start.

Production mode (single origin — the API also serves the built SPA):

```bash
npm run build           # builds client/dist
npm start               # http://localhost:4000
```

### Demo accounts (password: `password123`)

| Name | Email | Role | Level | Language |
|---|---|---|---|---|
| Dr. Sarah Martin | `sarah.martin@campus.edu` | professor | M2 | 🇫🇷 FR |
| Amine Benali | `amine.benali@campus.edu` | student | L2 | 🇸🇦 AR |
| James Carter | `james.carter@campus.edu` | student | L3 | 🇬🇧 EN |
| Léa Dubois | `lea.dubois@campus.edu` | student | M1 | 🇫🇷 FR |
| Nadia Haddad | `admin@campus.edu` | admin | M2 | 🇬🇧 EN |

The login screen has **one-click demo buttons**.

Re-seed from scratch at any time: `npm run seed --prefix server -- --force`

---

## 🗄️ Database

The data layer is **MySQL-first** (`mysql2` driver, InnoDB schema in
`server/src/db/schema.mysql.sql`, `utf8mb4`), configured via `.env`
(see `.env.example`): `DATABASE_URL=mysql://user:pass@host:3306/quiz_platform`.

> **Automatic fallback:** in sandboxes/offline environments where no MySQL server
> is reachable, the same schema and queries run on an **embedded engine**
> (Node's built-in SQLite) persisted at `server/data/quiz_platform.sqlite`.
> Controllers use a dialect-agnostic adapter (`server/src/db/index.js`), so the
> application code is identical for both. To run on MySQL, simply start any
> MySQL 8 / MariaDB 10.6+ server and restart the API — tables and demo data are
> created automatically.

**Schema:** `users` · `quizzes` · `questions` · `answers` · `attempts` (scores,
with per-question result details stored as JSON) — foreign keys with `ON DELETE CASCADE`.

---

## 🤖 AI configuration

| Method | How |
|---|---|
| **Server key** | Set `GEMINI_API_KEY` or `OPENAI_API_KEY` (+ optional `AI_PROVIDER=gemini\|openai`, `GEMINI_MODEL`, `OPENAI_MODEL`) in `.env` |
| **Personal key** | *Settings → AI integration* — paste a Gemini/OpenAI key. It is stored **only in your browser** and sent per-request (`x-ai-key` header), never persisted server-side |
| **No key** | A built-in **offline generator** produces definition & fill-in-the-blank MCQs with explanations directly from your text, in FR/EN/AR — great for demos |

---

## 🔌 API overview (`/api`)

```
POST   /auth/register · /auth/login          GET /auth/me     PUT /auth/profile · /auth/password
GET    /users                                 (professor)
GET    /dashboard
GET    /quizzes?search&level&language&subject&mine&sort    POST /quizzes
GET    /quizzes/:id                           PUT /quizzes/:id    DELETE /quizzes/:id
GET    /quizzes/:id/full?mode=play|edit       (play strips correct answers)
POST   /quizzes/:id/questions                 POST /quizzes/:id/questions/bulk   (AI import)
PUT    /questions/:id                         DELETE /questions/:id
POST   /questions/:id/answers                 PUT /answers/:id    DELETE /answers/:id
POST   /quizzes/:id/attempts                  (server-side grading → saved score)
GET    /scores?scope=mine|all                 GET /scores/:id     DELETE /scores/:id
GET    /ai/status                             POST /ai/generate
```

All endpoints return `{ data }` or `{ error: { code, message } }`; protected
routes require `Authorization: Bearer <jwt>`.

---

## 🏗️ Structure

```
projet-full-stack/
├── client/                  # React 18 + Vite + React Router
│   └── src/
│       ├── api/             # fetch client + AI-key storage
│       ├── components/      # Icon set (inline SVG), UI kit, skeletons, modals
│       ├── context/         # Auth (JWT), Toasts
│       ├── i18n/            # FR / AR / EN dictionaries + RTL provider
│       ├── layouts/         # DashboardLayout (sidebar + topbar + drawer)
│       ├── pages/           # Login, Register, Dashboard, Quizzes,
│       │                    # QuizEditor (+ AI modal), QuizPlayer, Scores,
│       │                    # Students, Settings
│       └── styles.css       # hand-rolled design system (CSS variables, RTL-safe)
└── server/                  # Express (ESM)
    └── src/
        ├── controllers/     # auth, quizzes/questions/answers/attempts, scores, AI, dashboard
        ├── db/              # dialect adapter, MySQL & SQLite schemas, auto-seed
        ├── middleware/      # JWT auth, roles
        ├── services/ai.js   # Gemini + OpenAI REST, robust parsing, offline generator
        └── routes/          # REST API map
```

## 🔐 Permissions model

- **Student** — browse & take quizzes, manage **their own** quizzes/questions, view & delete their own scores, AI generation.
- **Professor** — everything above + view/delete **all** scores, students list, see all attempts per quiz.
- **Admin** — full access including editing any quiz.
