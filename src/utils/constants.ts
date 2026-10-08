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

export const CONDITIONS = [
  { value: 'new', label: 'Brand new', hint: 'Unused, sealed or with tags' },
  { value: 'like_new', label: 'Like new', hint: 'Used a few times, no marks' },
  { value: 'used', label: 'Used', hint: 'Normal wear, works fine' },
  { value: 'for_parts', label: 'For parts', hint: 'Damaged or not working' },
] as const;

export type ConditionValue = (typeof CONDITIONS)[number]['value'];

export const CONDITION_LABEL: Record<ConditionValue, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.value, c.label]),
) as Record<ConditionValue, string>;

export const REPORT_REASONS = [
  { value: 'scam', label: 'Looks like a scam' },
  { value: 'prohibited', label: 'Prohibited or unsafe item' },
  { value: 'wrong_info', label: 'Wrong price, photos or category' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'already_sold', label: 'Already sold but still listed' },
  { value: 'other', label: 'Something else' },
] as const;

export const PAGE_SIZE = 20;
export const MESSAGE_PAGE_SIZE = 50;

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
  reportDetailsMax: 500,
} as const;
