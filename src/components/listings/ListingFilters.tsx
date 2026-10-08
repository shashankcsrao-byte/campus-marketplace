import { useEffect, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { CATEGORIES, CONDITIONS, type Category } from '../../utils/constants';
import CategoryIcon, { CATEGORY_TINT } from './CategoryIcon';
import { priceRangeError } from '../../utils/filters';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { XIcon } from '../ui/Icons';
import type { ListingCondition, ListingFilters as Filters, SortOption, StatusFilter } from '../../types';

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

/** Horizontally scrolling category chips (all screen sizes). */
export function CategoryChips({ value, onChange }: { value: Category | ''; onChange: (c: Category | '') => void }) {
  const chip = (active: boolean, tint = 'bg-brand-600 text-white') =>
    `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 border-ink px-4 font-display text-sm font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color] duration-150 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none motion-reduce:transform-none ${
      active ? `${tint} -translate-y-0.5 shadow-pop` : 'bg-white text-ink shadow-pop-sm hover:-translate-y-0.5 hover:bg-sun-soft'
    }`;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pt-1 pb-3 scrollbar-none sm:mx-0 sm:px-1" role="group" aria-label="Categories">
      <div className="flex gap-2.5">
        <button type="button" className={chip(!value)} aria-pressed={!value} onClick={() => onChange('')}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={chip(value === c, `${CATEGORY_TINT[c]} text-ink`)}
            aria-pressed={value === c}
            onClick={() => onChange(value === c ? '' : c)}
          >
            <span aria-hidden="true" className={`flex size-6 items-center justify-center rounded-full border-2 border-ink ${value === c ? 'bg-white' : CATEGORY_TINT[c]}`}>
              <CategoryIcon category={c} className="size-3.5" />
            </span>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Price / status / sort controls. Used in the desktop sidebar and the mobile drawer. */
export function FilterPanel({ filters, onChange, onClear }: Props) {
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);
  const dMin = useDebounce(min, 400);
  const dMax = useDebounce(max, 400);
  const error = priceRangeError(min, max);

  // URL → inputs (e.g. Clear filters)
  useEffect(() => {
    setMin(filters.min);
  }, [filters.min]);
  useEffect(() => {
    setMax(filters.max);
  }, [filters.max]);

  // inputs → URL, only when valid
  useEffect(() => {
    if (priceRangeError(dMin, dMax)) return;
    if (dMin !== filters.min || dMax !== filters.max) onChange({ min: dMin, max: dMax });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dMin, dMax]);

  const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 8);

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-1.5 text-sm font-bold text-ink">Price (₹)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Minimum price" placeholder="Min" inputMode="numeric" value={min} onChange={(e) => setMin(digitsOnly(e.target.value))} error={error ? ' ' : undefined} />
          <Input aria-label="Maximum price" placeholder="Max" inputMode="numeric" value={max} onChange={(e) => setMax(digitsOnly(e.target.value))} error={error ? ' ' : undefined} />
        </div>
        {error && <p className="mt-1.5 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      </fieldset>

      <Select label="Condition" value={filters.condition} onChange={(e) => onChange({ condition: e.target.value as ListingCondition | '' })}>
        <option value="">Any condition</option>
        {CONDITIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>

      <Select label="Status" value={filters.status} onChange={(e) => onChange({ status: e.target.value as StatusFilter })}>
        <option value="available">Available</option>
        <option value="sold">Sold</option>
        <option value="all">All</option>
      </Select>

      <Select label="Sort by" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as SortOption })}>
        <option value="newest">Newest first</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </Select>

      <Button variant="secondary" fullWidth onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

/** Slide-in panel for mobile. */
export function FilterDrawer({ open, onClose, ...props }: Props & { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="filters-title">
      <div className="absolute inset-0 animate-fade-in bg-ink/55 motion-reduce:animate-none" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm animate-drawer-in flex-col border-l-2 border-ink bg-cream motion-reduce:animate-none">
        <div className="flex items-center justify-between border-b-2 border-ink bg-sun px-5 py-4">
          <h2 id="filters-title" className="text-xl font-bold text-ink">
            Filters
          </h2>
          <button type="button" onClick={onClose} aria-label="Close filters" className="flex size-11 items-center justify-center rounded-xl border-2 border-ink bg-white shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <XIcon className="size-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <FilterPanel {...props} />
        </div>
        <div className="border-t-2 border-ink p-4">
          <Button fullWidth size="lg" onClick={onClose}>
            Show results
          </Button>
        </div>
      </div>
    </div>
  );
}
