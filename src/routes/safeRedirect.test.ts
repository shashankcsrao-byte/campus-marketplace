import { describe, expect, it } from 'vitest';
import { safeRedirect } from './GuestRoute';

describe('safeRedirect', () => {
  it.each([
    ['/create', '/create'],
    ['/listing/abc?x=1', '/listing/abc?x=1'],
    [null, '/'],
    ['', '/'],
    ['https://evil.com', '/'],
    ['//evil.com', '/'],
    ['/\\evil.com', '/'],
    ['javascript:alert(1)', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });
});
