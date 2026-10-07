import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useListings } from '../hooks/useListings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/listings/ListingCard';
import ListingGrid, { ListingSkeleton } from '../components/listings/ListingGrid';
import { CategoryChips, FilterDrawer, FilterPanel } from '../components/listings/ListingFilters';
import Button, { buttonClasses } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/States';
import { FilterIcon, PlusIcon, SearchIcon } from '../components/ui/Icons';
import { applyFilterPatch, hasActiveFilters, parseFilters } from '../utils/filters';
import type { ListingFilters } from '../types';

export default function Home() {
  useDocumentTitle('Buy & sell on campus');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);
  const { items, count, loading, loadingMore, error, hasMore, loadMore, retry } = useListings(filters);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const update = useCallback(
    (patch: Partial<ListingFilters>) => setParams((p) => applyFilterPatch(p, patch), { replace: true }),
    [setParams],
  );
  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const active = hasActiveFilters(filters);

  return (
    <div>
      {!active && (
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-72 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase">Student-to-student</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Buy & sell on campus, the easy way.</h1>
            <p className="mt-3 text-base text-brand-100 sm:text-lg">
              Textbooks, cycles, hostel essentials and more — from students near you. Chat directly, meet on campus.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={user ? '/create' : '/register'} className={buttonClasses('secondary', 'lg', '!border-white !bg-white !text-brand-700 hover:!bg-brand-50')}>
                <PlusIcon className="size-5" /> {user ? 'Sell an item' : 'Join free'}
              </Link>
              <a href="#listings" className={buttonClasses('ghost', 'lg', '!text-white hover:!bg-white/10')}>
                Browse listings ↓
              </a>
            </div>
          </div>
        </section>
      )}

      <div id="listings" className="scroll-mt-32 space-y-4">
        <CategoryChips value={filters.category} onChange={(category) => update({ category })} />

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {filters.q ? <>Results for “{filters.q}”</> : filters.category || 'Latest listings'}
            </h2>
            <p className="text-sm text-slate-500" aria-live="polite">
              {loading ? 'Loading listings...' : count !== null ? `${count} ${count === 1 ? 'listing' : 'listings'} found` : ''}
            </p>
          </div>
          <Button variant="secondary" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
            <FilterIcon /> Filters
            {active && <span className="size-2 rounded-full bg-brand-600" aria-label="(active)" />}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-slate-900">Filters</h3>
              <FilterPanel filters={filters} onChange={update} onClear={clear} />
            </div>
          </aside>

          <section aria-label="Listings">
            {loading ? (
              <ListingSkeleton count={6} withSidebar />
            ) : error && items.length === 0 ? (
              <ErrorState message="Something went wrong. Try again." onRetry={retry} />
            ) : items.length === 0 ? (
              active ? (
                <EmptyState
                  icon={<SearchIcon className="size-7" />}
                  title="No listings match your filters"
                  description="Try a different search or remove a few filters."
                  action={<Button onClick={clear}>Clear filters</Button>}
                />
              ) : (
                <EmptyState
                  icon={<PlusIcon className="size-7" />}
                  title="No listings found."
                  description="Be the first to sell something on campus!"
                  action={<Link to="/create" className={buttonClasses()}>Post a listing</Link>}
                />
              )
            ) : (
              <>
                <ListingGrid withSidebar>
                  {items.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </ListingGrid>
                {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <Button variant="secondary" size="lg" onClick={loadMore} loading={loadingMore} loadingText="Loading...">
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <FilterDrawer open={drawerOpen} onClose={closeDrawer} filters={filters} onChange={update} onClear={clear} />
    </div>
  );
}
