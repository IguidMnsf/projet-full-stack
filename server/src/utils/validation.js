/** Small validation helpers shared by controllers. */

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message) => new ApiError(400, 'BAD_REQUEST', message);
export const notFound = (message = 'Resource not found') => new ApiError(404, 'NOT_FOUND', message);
export const forbidden = (message = 'Permission denied') => new ApiError(403, 'FORBIDDEN', message);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function assert(condition, message) {
  if (!condition) throw badRequest(message);
}

export function cleanString(value, { max = 500, min = 1, field = 'Field' } = {}) {
  const str = typeof value === 'string' ? value.trim() : '';
  assert(str.length >= min, `${field} is required`);
  assert(str.length <= max, `${field} must be ${max} characters or fewer`);
  return str;
}

export function validEmail(value) {
  const str = typeof value === 'string' ? value.trim().toLowerCase() : '';
  assert(EMAIL_RE.test(str), 'Please provide a valid email address');
  return str;
}

export const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2'];
export const LANGUAGES = ['fr', 'en', 'ar'];
export const ROLES = ['student', 'professor'];

export const oneOf = (value, list, fallback) => (list.includes(value) ? value : fallback);
