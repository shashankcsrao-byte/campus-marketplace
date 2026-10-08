import { describe, expect, it } from 'vitest';
import { appError, toUserMessage } from './errorMessages';

describe('toUserMessage', () => {
  it('maps Supabase auth and Postgres codes', () => {
    expect(toUserMessage({ code: 'invalid_credentials', message: 'x' })).toBe('Incorrect email or password.');
    expect(toUserMessage({ code: '23514', message: 'violates check' })).toMatch(/invalid/);
    expect(toUserMessage({ code: '42501', message: 'denied' })).toMatch(/permission/);
  });

  it('maps rate-limit errors raised by database triggers', () => {
    expect(toUserMessage({ code: 'P0001', message: 'RATE_LIMIT_LISTINGS' })).toMatch(/10 listings/);
    expect(toUserMessage({ code: 'P0001', message: 'RATE_LIMIT_MESSAGES' })).toMatch(/too fast/);
  });

  it('recognises network failures', () => {
    expect(toUserMessage(new TypeError('Failed to fetch'))).toMatch(/Network/);
  });

  it('never leaks raw messages', () => {
    expect(toUserMessage(new Error('relation "secret_table" does not exist'))).toBe('Something went wrong. Try again.');
  });

  it('understands app error codes', () => {
    expect(toUserMessage(appError('NOT_ALLOWED'))).toMatch(/permission/);
  });
});
