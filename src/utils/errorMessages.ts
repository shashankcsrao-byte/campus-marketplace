const GENERIC = 'Something went wrong. Try again.';
const NETWORK = 'Network error. Check your connection.';
const PERMISSION = "You don't have permission to do that.";

const BY_CODE: Record<string, string> = {
  // Supabase Auth
  invalid_credentials: 'Incorrect email or password.',
  user_already_exists: 'An account with this email already exists.',
  email_exists: 'An account with this email already exists.',
  weak_password: 'Password must be at least 6 characters.',
  over_email_send_rate_limit: 'Too many attempts. Try again later.',
  over_request_rate_limit: 'Too many attempts. Try again later.',
  email_not_confirmed: 'Please confirm your email before signing in.',
  // Postgres
  '23505': 'This already exists.',
  '42501': PERMISSION,
  '23514': 'Some values are invalid. Check the form and try again.',
  '23503': 'This item no longer exists.',
  '22P02': 'Invalid request.',
  PGRST116: 'Not found.',
  // App-level codes
  NOT_ALLOWED: PERMISSION,
  NOT_FOUND: "This listing doesn't exist or was removed.",
  COMPRESS_FAILED: "Couldn't process one of the images. Try a different photo.",
  GEOCODE_HTTP: 'Location service unavailable. Your listing will be saved without a map pin.',
  EMAIL_CONFIRMATION_REQUIRED: 'Account created. Check your email to confirm it, then sign in.',
};

/** Creates an Error whose code is understood by toUserMessage. */
export function appError(code: keyof typeof BY_CODE | string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

/** Turns any thrown value (Supabase, Postgres, fetch, app) into friendly text. */
export function toUserMessage(error: unknown): string {
  if (!error) return GENERIC;
  if (typeof error === 'string') return BY_CODE[error] ?? error;

  const e = error as { code?: unknown; message?: unknown; name?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const msg = typeof e.message === 'string' ? e.message : '';

  if (code && BY_CODE[code]) return BY_CODE[code];
  if (msg && BY_CODE[msg]) return BY_CODE[msg];

  if (e.name === 'AbortError') return NETWORK;
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(msg)) return NETWORK;
  if (/row-level security|row level security|permission denied/i.test(msg)) return PERMISSION;
  if (/invalid login credentials/i.test(msg)) return BY_CODE.invalid_credentials;
  if (/already registered|already exists/i.test(msg)) return BY_CODE.user_already_exists;
  if (/password should be at least/i.test(msg)) return BY_CODE.weak_password;
  if (/rate limit/i.test(msg)) return BY_CODE.over_email_send_rate_limit;
  if (/exceeded the maximum allowed size|payload too large/i.test(msg)) return 'Image is too large.';
  if (/mime type/i.test(msg)) return 'Only JPG, PNG and WebP images are allowed.';

  return GENERIC;
}
