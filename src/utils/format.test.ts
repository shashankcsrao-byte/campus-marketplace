import { describe, expect, it } from 'vitest';
import { formatPrice, initials, timeAgo, UUID_RE } from './format';

describe('format', () => {
  it('formats rupees the Indian way', () => {
    expect(formatPrice(125000)).toBe('₹1,25,000');
  });
  it('builds initials', () => {
    expect(initials('asha rao kumar')).toBe('AR');
    expect(initials('')).toBe('?');
    expect(initials(null)).toBe('?');
  });
  it('describes recent times', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
    expect(timeAgo(new Date(Date.now() - 3 * 86400e3).toISOString())).toBe('3 days ago');
  });
  it('recognises UUIDs', () => {
    expect(UUID_RE.test('dd166032-eda7-467a-b8b8-e049e7b88adf')).toBe(true);
    expect(UUID_RE.test('not-a-uuid')).toBe(false);
  });
});
