import { Suspense, lazy, useCallback, useState } from 'react';
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

// The motion landing is only for signed-out visitors, so it loads on demand.
const Landing = lazy(() => import('../landing/Landing'));

function WelcomeStrip({ name }: { name?: string }) {
  return (
    <section className="mb-8 flex flex-col gap-4 rounded-[1.75rem] border-2 border-ink bg-m3-primary-container px-6 py-6 text-m3-on-primary-container shadow-pop sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Hi {name?.split(' ')[0] ?? 'there'}, find something good today.</h1>
        <p className="mt-1 font-semibold opacity-90">New listings from students land here as they are posted.</p>
      </div>
      <Link to="/create" className={buttonClasses('secondary', 'lg', 'shrink-0 !bg-sun')}>
        <PlusIcon className="size-5" /> Sell an item
      </Link>
    </section>
  );
}

export default function Home() {
  useDocumentTitle('Buy & sell on campus');
  const { user, profile } = useAuth();
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
  const browse = useCallback(() => {
    document.getElementById('listings')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  return (
    <div>
      {!active &&
        (user ? (
          <WelcomeStrip name={profile?.name} />
        ) : (
          <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
            <Landing onBrowse={browse} />
          </Suspense>
        ))}

      <div id="listings" className="scroll-mt-32 space-y-5">
        <CategoryChips value={filters.category} onChange={(category) => update({ category })} />

        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">
              {filters.q ? (
                <>
                  Results for <span className="marker">“{filters.q}”</span>
                </>
              ) : (
                <span className="marker">{filters.category || 'Fresh drops'}</span>
              )}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600" aria-live="polite">
              {loading ? 'Loading listings...' : count !== null ? `${count} ${count === 1 ? 'listing' : 'listings'} found` : ''}
            </p>
          </div>
          <Button variant="secondary" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
            <FilterIcon /> Filters
            {active && <span className="size-2.5 rounded-full border border-ink bg-bubblegum" aria-label="(active)" />}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="card-pop sticky top-24 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                <span className="flex size-8 -rotate-6 items-center justify-center rounded-lg border-2 border-ink bg-sun">
                  <FilterIcon className="size-4" />
                </span>
                Filters
              </h3>
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
                {error && <p className="mt-4 text-center text-sm font-semibold text-red-700">{error}</p>}
                {hasMore && (
                  <div className="mt-10 flex justify-center">
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
