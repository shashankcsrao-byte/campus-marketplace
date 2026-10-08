import { describe, expect, it } from 'vitest';
import { isEmail, validateCampus, validateListing, validateName } from './validation';

const valid = {
  title: 'Casio fx-991EX calculator',
  description: 'Works perfectly, comes with cover.',
  price: '650',
  category: 'Academic',
  condition: 'like_new',
  location_name: 'NMIT Library',
  imageCount: 2,
};

describe('validateListing', () => {
  it('accepts a complete listing', () => {
    expect(validateListing(valid)).toEqual({});
  });

  it('flags every missing field', () => {
    const errors = validateListing({ title: ' ', description: '', price: '', category: '', condition: '', location_name: '', imageCount: 0 });
    expect(Object.keys(errors).sort()).toEqual(['category', 'condition', 'description', 'imageCount', 'price', 'title']);
  });

  it.each([
    ['0', 'Price must be greater than ₹0.'],
    ['-5', 'Price must be greater than ₹0.'],
    ['12.5', 'Price must be a whole number of rupees.'],
    ['10000001', 'Price can be at most ₹1,00,00,000.'],
  ])('rejects price %s', (price, message) => {
    expect(validateListing({ ...valid, price }).price).toBe(message);
  });

  it('mirrors the database length limits', () => {
    expect(validateListing({ ...valid, title: 'ab' }).title).toMatch(/3–100/);
    expect(validateListing({ ...valid, title: 'a'.repeat(101) }).title).toMatch(/3–100/);
    expect(validateListing({ ...valid, description: 'too short' }).description).toMatch(/10–2000/);
    expect(validateListing({ ...valid, location_name: 'x'.repeat(121) }).location_name).toMatch(/120/);
  });

  it('allows 1–5 photos only', () => {
    expect(validateListing({ ...valid, imageCount: 5 }).imageCount).toBeUndefined();
    expect(validateListing({ ...valid, imageCount: 6 }).imageCount).toMatch(/up to 5/);
  });

  it('rejects unknown categories and conditions', () => {
    expect(validateListing({ ...valid, category: 'Pets' }).category).toBeDefined();
    expect(validateListing({ ...valid, condition: 'mint' }).condition).toBeDefined();
  });
});

describe('account fields', () => {
  it('checks emails', () => {
    expect(isEmail('student@nmit.ac.in')).toBe(true);
    expect(isEmail('not-an-email')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
  });
  it('checks name and campus length', () => {
    expect(validateName('A')).toBeDefined();
    expect(validateName('  Asha  ')).toBeUndefined();
    expect(validateCampus('x'.repeat(81))).toBeDefined();
    expect(validateCampus('')).toBeUndefined();
  });
});
