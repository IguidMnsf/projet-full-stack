import config from '../env.js';

/* ------------------------------------------------------------------ */
/*  Prompt building                                                    */
/* ------------------------------------------------------------------ */

const LANG_NAME = { fr: 'français', en: 'English', ar: 'العربية (Arabic)' };
const LEVEL_HINT = {
  L1: 'first-year undergraduate (L1) — basic definitions and simple recall',
  L2: 'second-year undergraduate (L2) — core concepts with light application',
  L3: 'third-year undergraduate (L3) — solid conceptual understanding',
  M1: 'first-year master (M1) — advanced concepts and reasoning',
  M2: 'second-year master (M2) — expert-level nuance and synthesis',
};

export function buildPrompt({ text, count, language, level, subject }) {
  return `You are an expert university professor creating a multiple-choice quiz.

SOURCE MATERIAL (between <source> tags):
<source>
${text.slice(0, 12000)}
</source>

TASK: Write ${count} high-quality multiple-choice questions STRICTLY based on the source material above.

REQUIREMENTS:
- Write everything in ${LANG_NAME[language] || 'English'}. No other language anywhere in the output.
- Target audience: ${LEVEL_HINT[level] || LEVEL_HINT.L2}${subject ? ` — academic subject: ${subject}` : ''}.
- Each question has exactly 4 answer options and EXACTLY ONE correct answer (mark it with "is_correct": true).
- Distractors must be plausible, same topic, clearly wrong to someone who mastered the material.
- Vary question styles: definitions, "which statement is true/false", cause/effect, application.
- Each question includes a short "explanation" (1–3 sentences) justifying the correct answer.
- Do not number the questions. Do not mention "the text" unless the material is a reading passage.

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences:
{
  "questions": [
    {
      "text": "Question text?",
      "explanation": "Why the correct answer is right.",
      "answers": [
        { "text": "Option A", "is_correct": false },
        { "text": "Option B", "is_correct": true },
        { "text": "Option C", "is_correct": false },
        { "text": "Option D", "is_correct": false }
      ]
    }
  ]
}`;
}

/* ------------------------------------------------------------------ */
/*  Provider calls (Gemini / OpenAI)                                   */
/* ------------------------------------------------------------------ */

async function fetchJson(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
    }
    return JSON.parse(body);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini({ apiKey, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json', maxOutputTokens: 8192 },
    }),
  });
  const candidate = data?.candidates?.[0];
  const raw = candidate?.content?.parts?.map((p) => p.text || '').join('') || '';
  return raw;
}

async function callOpenAI({ apiKey, model, prompt }) {
  const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  return data?.choices?.[0]?.message?.content || '';
}

/* ------------------------------------------------------------------ */
/*  Response parsing                                                   */
/* ------------------------------------------------------------------ */

export function parseQuestions(raw) {
  if (!raw) throw new Error('Empty AI response');
  let cleaned = String(raw).trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start > 0 || end < cleaned.length - 1) cleaned = cleaned.slice(Math.max(0, start), end + 1);

  const parsed = JSON.parse(cleaned);
  const list = Array.isArray(parsed) ? parsed : parsed.questions || parsed.quiz?.questions || [];
  if (!Array.isArray(list) || list.length === 0) throw new Error('No questions in AI response');

  const questions = [];
  for (const q of list) {
    const text = String(q.text || q.question || '').trim();
    const explanation = String(q.explanation || q.rationale || '').trim() || null;
    const rawAnswers = q.answers || q.options || [];
    const answers = rawAnswers
      .map((a) =>
        typeof a === 'string'
          ? { text: a, isCorrect: false }
          : { text: String(a.text || a.answer || '').trim(), isCorrect: Boolean(a.is_correct ?? a.isCorrect ?? a.correct) }
      )
      .filter((a) => a.text.length > 0)
      .slice(0, 6);
    if (!text || answers.length < 2) continue;
    if (!answers.some((a) => a.isCorrect)) answers[0].isCorrect = true;
    // enforce a single correct answer
    let seen = false;
    for (const a of answers) {
      if (a.isCorrect && !seen) seen = true;
      else a.isCorrect = false;
    }
    questions.push({ text, explanation, answers });
  }
  if (questions.length === 0) throw new Error('AI response could not be normalized');
  return questions;
}

/* ------------------------------------------------------------------ */
/*  Built-in offline generator (demo fallback)                         */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  (
    'le la les un une des du de d au aux et ou mais donc or ni car que qui quoi dont où dans sur sous pour par avec sans ' +
    'this that these those the a an and or but if then else of in on at to for with without from by as is are was were ' +
    'be been being have has had do does did can could should would may might will shall not no nor so than too very ' +
    'il elle ils elles nous vous je tu on se sa son ses leur leurs ce cet cette ces cela ca être avoir fait faire plus ' +
    'في من على إلى عن أن إن كان كانت هذا هذه ذلك تلك التي الذي ما لا و ثم أو حتى بين عند كل بعض غير حيث كما قد لقد مع ' +
    'text texte نصaccording according entre aussi ainsi très plus moins bien'
  ).split(/\s+/)
);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashCode = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
};
const shuffleWith = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const truncate = (s, n = 110) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const uniqBy = (arr, keyFn) => {
  const seen = new Set();
  return arr.filter((x) => {
    const k = keyFn(x).toLowerCase().slice(0, 80);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const STEMS = {
  fr: {
    definition: (t) => `D'après le texte, qu'est-ce que « ${t} » désigne ?`,
    cloze: (s) => `Complétez la phrase du texte : « ${s} »`,
    explanation: (s) => `D'après le texte : « ${truncate(s, 220)} »`,
    generic: (t) => `Quel concept le texte présente-t-il principalement à propos de « ${t} » ?`,
  },
  en: {
    definition: (t) => `According to the text, what is "${t}"?`,
    cloze: (s) => `Fill in the blank from the text: "${s}"`,
    explanation: (s) => `According to the text: "${truncate(s, 220)}"`,
    generic: (t) => `Which concept does the text mainly present about "${t}"?`,
  },
  ar: {
    definition: (t) => `حسب النص، ما الذي يشير إليه «${t}»؟`,
    cloze: (s) => `أكمل الفراغ في الجملة التالية من النص: «${s}»`,
    explanation: (s) => `حسب النص: «${truncate(s, 220)}»`,
    generic: (t) => `ما المفهوم الرئيسي الذي يقدمه النص حول «${t}»؟`,
  },
};

const DEFINITION_RE = {
  fr: /^(?:la\s+|le\s+|les\s+|l'|un\s+|une\s+|L'|L\s)?([\p{L}][\p{L}\s'’-]{2,45}?)\s+(?:est|sont|désigne|désignent|définit|désigne|correspond à|signifie|se définit comme)\s+(.{18,})$/iu,
  en: /^(?:the\s+|a\s+|an\s+)?([\p{L}][\p{L}\s'’-]{2,45}?)\s+(?:is|are|refers to|means|denotes|describes|consists of)\s+(.{18,})$/iu,
  ar: /^([\u0600-\u06FF]{3,40}(?:\s+[\u0600-\u06FF]{3,30})?)\s+(?:هو|هي|تعني|يعني|يشير إلى|يُقصد به|يعد|تعد)\s+(.{18,})$/u,
};

function splitSentences(text) {
  return String(text)
    .replace(/\r/g, '')
    .split(/(?<=[.!?؟…])\s+|\n+|•\s*/u)
    .map((s) => s.trim().replace(/^[-–—*\d.)\s]+/, ''))
    .filter((s) => s.split(/\s+/).length >= 5 && s.length >= 35);
}

function keywords(text) {
  const words = String(text).match(/[\p{L}]{4,}/gu) || [];
  const freq = new Map();
  for (const w of words) {
    const lower = w.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    freq.set(lower, (freq.get(lower) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
}

/**
 * Deterministic extractive MCQ generator used when no AI key is configured
 * (or when the provider fails). Produces definition + fill-in-the-blank
 * questions grounded in the pasted text, with explanations.
 */
export function localGenerate({ text, count, language, level, subject }) {
  const lang = STEMS[language] ? language : 'en';
  const stems = STEMS[lang];
  const rng = mulberry32(hashCode(text) + count);
  const sentences = splitSentences(text);
  const topKeywords = keywords(text);

  const questions = [];
  const defs = [];

  for (const sentence of sentences.slice(0, 40)) {
    const m = sentence.match(DEFINITION_RE[lang]);
    if (m && m[1] && m[2]) {
      defs.push({ term: m[1].trim(), definition: cap(m[2].trim().replace(/[.؛;]$/, '')), sentence });
    }
  }

  // 1) Definition questions
  for (const d of uniqBy(defs, (x) => x.term)) {
    if (questions.length >= count) break;
    const distractors = shuffleWith(
      uniqBy(
        defs.filter((o) => o.term !== d.term).map((o) => o.definition),
        (x) => x
      ),
      rng
    ).slice(0, 3);
    while (distractors.length < 3) {
      const filler = sentences.find((s) => !defs.some((dd) => dd.sentence === s) && !distractors.some((x) => x.includes(s.slice(0, 30))));
      if (!filler) break;
      distractors.push(truncate(cap(filler.replace(/[.؛;]$/, ''))));
    }
    if (distractors.length < 3) continue;
    const answers = shuffleWith(
      [{ text: truncate(d.definition, 120), isCorrect: true }, ...distractors.map((t) => ({ text: truncate(t, 120), isCorrect: false }))],
      rng
    );
    questions.push({ text: stems.definition(d.term), explanation: stems.explanation(d.sentence), answers });
  }

  // 2) Cloze questions
  if (questions.length < count) {
    for (const sentence of sentences) {
      if (questions.length >= count) break;
      const kw = topKeywords.find(
        (k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'iu').test(sentence) && !questions.some((q) => q.explanation?.includes(sentence.slice(0, 40)))
      );
      if (!kw) continue;
      const masked = sentence.replace(new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'iu'), '______');
      const distractors = topKeywords
        .filter((k) => k !== kw && k.slice(0, 3) !== kw.slice(0, 3))
        .sort(() => rng() - 0.5)
        .slice(0, 3);
      if (distractors.length < 3) continue;
      questions.push({
        text: stems.cloze(masked.length > 220 ? truncate(masked, 220) : masked),
        explanation: stems.explanation(sentence),
        answers: shuffleWith([{ text: kw, isCorrect: true }, ...distractors.map((k) => ({ text: k, isCorrect: false }))], rng),
      });
    }
  }

  // 3) Fallback: main-concept question from the most frequent keywords
  while (questions.length < Math.min(count, 3) && topKeywords.length >= 4) {
    const [correct, ...rest] = topKeywords.filter((k) => !questions.some((q) => q.answers.some((a) => a.text === k)));
    if (!correct) break;
    questions.push({
      text: stems.generic(cap(correct)),
      explanation: stems.explanation(sentences.find((s) => s.toLowerCase().includes(correct)) || text.slice(0, 200)),
      answers: shuffleWith(
        [{ text: correct, isCorrect: true }, ...rest.slice(0, 3).map((k) => ({ text: k, isCorrect: false }))],
        rng
      ),
    });
  }

  return questions.slice(0, Math.max(1, Math.min(count, 10)));
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

export function resolveProvider(requestedProvider, headerKey) {
  const provider = (requestedProvider || config.aiProvider || 'auto').toLowerCase();
  const envKey =
    provider === 'gemini' ? config.geminiKey : provider === 'openai' ? config.openaiKey : config.geminiKey || config.openaiKey;
  const apiKey = headerKey || envKey;
  let effective = provider === 'auto' ? (headerKey ? (config.geminiKey && !headerKey ? 'gemini' : config.geminiKey && config.openaiKey ? 'gemini' : config.geminiKey ? 'gemini' : 'openai') : config.geminiKey ? 'gemini' : config.openaiKey ? 'openai' : 'demo') : provider;
  if (!apiKey && effective !== 'demo') effective = 'demo';
  return { provider: effective, apiKey };
}

export async function generateMCQs({ text, count = 5, language = 'fr', level = 'L2', subject = '', provider, apiKey }) {
  const resolved = resolveProvider(provider, apiKey);
  const opts = { text, count, language, level, subject };

  if (resolved.provider === 'demo') {
    const questions = localGenerate(opts);
    return {
      provider: 'demo-generator',
      fallback: true,
      notice:
        'Generated by the built-in offline generator (no AI key configured). Add a Gemini or OpenAI key in Settings to use a real AI model.',
      questions,
    };
  }

  const prompt = buildPrompt({ ...opts, count });
  try {
    const raw =
      resolved.provider === 'gemini'
        ? await callGemini({ apiKey: resolved.apiKey, model: config.geminiModel, prompt })
        : await callOpenAI({ apiKey: resolved.apiKey, model: config.openaiModel, prompt });
    const questions = parseQuestions(raw).slice(0, Math.min(count, 10));
    return { provider: resolved.provider, fallback: false, notice: null, questions };
  } catch (err) {
    console.warn(`[ai] ${resolved.provider} failed (${err.message.slice(0, 160)}) — using built-in generator instead.`);
    const questions = localGenerate(opts);
    return {
      provider: 'demo-generator',
      fallback: true,
      notice: `${resolved.provider} call failed (${String(err.message).slice(0, 120)}). Generated locally instead.`,
      questions,
    };
  }
}
