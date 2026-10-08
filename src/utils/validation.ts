import { CATEGORIES, CONDITIONS, LIMITS, MAX_IMAGES } from './constants';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export interface ListingFormInput {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  location_name: string;
  imageCount: number;
}

/** Rules mirror the database CHECK constraints exactly. */
export function validateListing(input: ListingFormInput): FieldErrors<keyof ListingFormInput> {
  const errors: FieldErrors<keyof ListingFormInput> = {};
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) errors.title = 'Title is required.';
  else if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax)
    errors.title = `Title must be ${LIMITS.titleMin}–${LIMITS.titleMax} characters.`;

  if (!description) errors.description = 'Description is required.';
  else if (description.length < LIMITS.descriptionMin || description.length > LIMITS.descriptionMax)
    errors.description = `Description must be ${LIMITS.descriptionMin}–${LIMITS.descriptionMax} characters.`;

  const priceText = input.price.trim();
  const price = Number(priceText);
  if (!priceText) errors.price = 'Price is required.';
  else if (!Number.isInteger(price)) errors.price = 'Price must be a whole number of rupees.';
  else if (price <= 0) errors.price = 'Price must be greater than ₹0.';
  else if (price > LIMITS.priceMax) errors.price = 'Price can be at most ₹1,00,00,000.';

  if (!(CATEGORIES as readonly string[]).includes(input.category)) errors.category = 'Choose a category.';

  if (!CONDITIONS.some((c) => c.value === input.condition)) errors.condition = 'Choose the condition.';

  if (input.location_name.trim().length > LIMITS.locationMax)
    errors.location_name = `Location must be at most ${LIMITS.locationMax} characters.`;

  if (input.imageCount < 1) errors.imageCount = 'Add at least one photo.';
  else if (input.imageCount > MAX_IMAGES) errors.imageCount = `You can add up to ${MAX_IMAGES} photos.`;

  return errors;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function validateName(name: string): string | undefined {
  const n = name.trim();
  if (n.length < LIMITS.nameMin || n.length > LIMITS.nameMax)
    return `Name must be ${LIMITS.nameMin}–${LIMITS.nameMax} characters.`;
}

export function validateCampus(campus: string): string | undefined {
  if (campus.trim().length > LIMITS.campusMax) return `Campus must be at most ${LIMITS.campusMax} characters.`;
}
