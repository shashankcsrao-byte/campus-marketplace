export const APP_NAME = 'Campus Marketplace';

export const CATEGORIES = [
  'Electronics',
  'Books',
  'Furniture',
  'Vehicles',
  'Clothing',
  'Accessories',
  'Sports',
  'Hostel Essentials',
  'Academic',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<Category, string> = {
  Electronics: '💻',
  Books: '📚',
  Furniture: '🪑',
  Vehicles: '🚲',
  Clothing: '👕',
  Accessories: '⌚',
  Sports: '🏸',
  'Hostel Essentials': '🛏️',
  Academic: '📐',
  Other: '📦',
};

export const PAGE_SIZE = 20;

export const LISTING_IMAGES_BUCKET = 'listing-images';
export const MAX_IMAGES = 5;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // checked before compression
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const LIMITS = {
  titleMin: 3,
  titleMax: 100,
  descriptionMin: 10,
  descriptionMax: 2000,
  priceMax: 10_000_000,
  locationMax: 120,
  nameMin: 2,
  nameMax: 60,
  campusMax: 80,
  passwordMin: 8,
  messageMax: 2000,
} as const;
