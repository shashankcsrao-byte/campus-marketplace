import { CATEGORIES, type Category } from './constants';
import type { ListingFilters, SortOption, StatusFilter } from '../types';

export const DEFAULT_FILTERS: ListingFilters = {
  q: '',
  category: '',
  min: '',
  max: '',
  status: 'available',
  sort: 'newest',
};

const SORTS: SortOption[] = ['newest', 'price_asc', 'price_desc'];
const STATUSES: StatusFilter[] = ['available', 'sold', 'all'];
const digits = (v: string | null) => (v && /^\d{1,8}$/.test(v) ? v : '');

/** Reads filters from the URL, ignoring anything invalid. */
export function parseFilters(params: URLSearchParams): ListingFilters {
  const category = params.get('category') ?? '';
  const status = params.get('status') as StatusFilter;
  const sort = params.get('sort') as SortOption;
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    category: (CATEGORIES as readonly string[]).includes(category) ? (category as Category) : '',
    min: digits(params.get('min')),
    max: digits(params.get('max')),
    status: STATUSES.includes(status) ? status : DEFAULT_FILTERS.status,
    sort: SORTS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

/** Writes a patch into URL params, dropping values equal to the defaults. */
export function applyFilterPatch(params: URLSearchParams, patch: Partial<ListingFilters>): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [k, v] of Object.entries(patch) as [keyof ListingFilters, string][]) {
    if (!v || v === DEFAULT_FILTERS[k]) next.delete(k);
    else next.set(k, v);
  }
  return next;
}

export function hasActiveFilters(f: ListingFilters): boolean {
  return (Object.keys(DEFAULT_FILTERS) as (keyof ListingFilters)[]).some((k) => f[k] !== DEFAULT_FILTERS[k]);
}

export function priceRangeError(min: string, max: string): string | undefined {
  if (min && max && Number(min) > Number(max)) return 'Min price can’t be more than max price.';
}
