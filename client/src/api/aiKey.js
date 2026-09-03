/**
 * Client-side AI key storage (Settings page).
 * The key lives only in this browser's localStorage and is sent per-request
 * to /api/ai/generate via headers — the server never persists it.
 */
const KEY = 'quizflow.aiKey';
const PROVIDER = 'quizflow.aiProvider';

export const getAiKey = () => {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
};
export const getAiProvider = () => {
  try { return localStorage.getItem(PROVIDER) || 'auto'; } catch { return 'auto'; }
};
export const setAiKey = (value) => {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
};
export const setAiProvider = (value) => {
  try { localStorage.setItem(PROVIDER, value); } catch { /* ignore */ }
};

/** Headers to attach to AI requests (only when the user saved a key). */
export const aiHeaders = () => {
  const key = getAiKey();
  if (!key) return {};
  return { 'x-ai-key': key, 'x-ai-provider': getAiProvider() };
};
