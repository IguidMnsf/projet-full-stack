const TOKEN_KEY = 'quizflow.token';

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
};

export class ApiClientError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Fetch wrapper for the QuizFlow API.
 * extraHeaders lets callers pass per-request AI keys (x-ai-key / x-ai-provider).
 */
export async function api(path, { method = 'GET', body, extraHeaders } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(extraHeaders || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK', 'Network unreachable');
  }

  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    const err = json?.error || {};
    throw new ApiClientError(res.status, err.code || 'ERROR', err.message || `Request failed (${res.status})`);
  }
  return json?.data;
}
