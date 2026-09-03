import { generateMCQs, resolveProvider } from '../services/ai.js';
import config from '../env.js';
import { assert, cleanString, oneOf, LEVELS, LANGUAGES } from '../utils/validation.js';
import { asyncRoute } from '../middleware/auth.js';

export const createAiController = () => ({
  status: asyncRoute(async (req, res) => {
    const envProvider = config.geminiKey ? 'gemini' : config.openaiKey ? 'openai' : null;
    const resolved = resolveProvider(req.headers['x-ai-provider'], req.headers['x-ai-key']);
    res.json({
      data: {
        envProvider,
        effectiveProvider: resolved.provider,
        hasUserKey: Boolean(req.headers['x-ai-key']),
        models: { gemini: config.geminiModel, openai: config.openaiModel },
      },
    });
  }),

  generate: asyncRoute(async (req, res) => {
    const text = cleanString(req.body?.text, { max: 20000, min: 200, field: 'Source text (min. 200 characters)' });
    const count = Math.min(Math.max(Number(req.body?.count) || 5, 1), 10);
    const language = oneOf(req.body?.language, LANGUAGES, 'fr');
    const level = oneOf(req.body?.level, LEVELS, 'L2');
    const subject = req.body?.subject ? cleanString(req.body.subject, { max: 80, min: 1, field: 'Subject' }) : '';
    const provider = oneOf(String(req.headers['x-ai-provider'] || req.body?.provider || 'auto').toLowerCase(), ['auto', 'gemini', 'openai', 'demo'], 'auto');
    const apiKey = typeof req.headers['x-ai-key'] === 'string' && req.headers['x-ai-key'].trim().length > 10 ? req.headers['x-ai-key'].trim() : undefined;

    assert(text.split(/\s+/).length >= 30, 'Provide a longer text (at least ~30 words) so the AI has enough material');

    const result = await generateMCQs({ text, count, language, level, subject, provider, apiKey });
    res.json({ data: result });
  }),
});
