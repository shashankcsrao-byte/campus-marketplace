import { describe, expect, it } from 'vitest';
import { applyFilterPatch, DEFAULT_FILTERS, hasActiveFilters, parseFilters, priceRangeError, sanitizeSearch } from './filters';

describe('parseFilters', () => {
  it('reads valid params', () => {
    const f = parseFilters(new URLSearchParams('q=cycle&category=Vehicles&condition=used&min=100&max=5000&status=all&sort=price_asc'));
    expect(f).toEqual({ q: 'cycle', category: 'Vehicles', condition: 'used', min: '100', max: '5000', status: 'all', sort: 'price_asc' });
  });

  it('ignores invalid params instead of failing', () => {
    const f = parseFilters(new URLSearchParams('category=Pets&condition=mint&min=abc&max=-1&status=gone&sort=evil'));
    expect(f).toEqual(DEFAULT_FILTERS);
  });

  it('caps the search length', () => {
    expect(parseFilters(new URLSearchParams(`q=${'a'.repeat(300)}`)).q).toHaveLength(100);
  });
});

describe('applyFilterPatch', () => {
  it('sets values and drops defaults, keeping other params', () => {
    const next = applyFilterPatch(new URLSearchParams('q=desk&sort=price_asc'), { sort: 'newest', category: 'Furniture' });
    expect(next.toString()).toBe('q=desk&category=Furniture');
  });
});

describe('helpers', () => {
  it('detects active filters', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, condition: 'new' })).toBe(true);
  });

  it('validates the price range', () => {
    expect(priceRangeError('900', '100')).toBeDefined();
    expect(priceRangeError('100', '900')).toBeUndefined();
    expect(priceRangeError('', '900')).toBeUndefined();
  });

  it('strips characters that would break the PostgREST filter', () => {
    expect(sanitizeSearch('a,b(c)%_*"d\\e')).toBe('a b c d e');
    expect(sanitizeSearch('  mechanical   keyboard ')).toBe('mechanical keyboard');
  });
});
