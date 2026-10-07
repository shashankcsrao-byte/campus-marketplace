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
import { ArrowRightIcon, BikeIcon, BoltIcon, BookIcon, FilterIcon, PlusIcon, RupeeIcon, SearchIcon, ShieldIcon, SparklesIcon } from '../components/ui/Icons';
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
        <section className="relative mb-10 overflow-hidden rounded-[2rem] border-2 border-ink bg-brand-600 px-6 py-10 text-white shadow-pop-lg sm:px-10 sm:py-14">
          {/* decorative geometric blocks */}
          <span aria-hidden="true" className="absolute -top-10 -left-10 size-40 rounded-full border-2 border-ink bg-brand-500" />
          <span aria-hidden="true" className="absolute -right-8 -bottom-12 size-48 rotate-12 rounded-[2.5rem] border-2 border-ink bg-brand-700" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="mb-5 inline-flex -rotate-2 items-center gap-2 rounded-full border-2 border-ink bg-sun px-4 py-1.5 font-display text-sm font-semibold text-ink shadow-pop-sm">
                <SparklesIcon className="size-4" /> Student-to-student marketplace
              </p>
              <h1 className="text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
                Buy, sell &amp; <span className="inline-block -rotate-1 rounded-xl border-2 border-ink bg-sun px-2 text-ink shadow-pop-sm">swap</span> stuff on campus.
              </h1>
              <p className="mt-5 max-w-xl text-base font-medium text-brand-50 sm:text-lg">
                Textbooks, cycles, hostel essentials and more from students near you. Chat instantly, meet on campus, pay in person.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={user ? '/create' : '/register'} className={buttonClasses('secondary', 'lg', '!bg-sun hover:!bg-white')}>
                  <PlusIcon className="size-5" /> {user ? 'Sell an item' : 'Join free'}
                </Link>
                <a href="#listings" className={buttonClasses('secondary', 'lg')}>
                  Browse listings <ArrowRightIcon className="size-5 rotate-90" />
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-2 text-sm font-bold text-ink">
                <li className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mint px-3 py-1"><RupeeIcon className="size-4" /> Zero fees</li>
                <li className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sky px-3 py-1"><BoltIcon className="size-4" /> Live chat</li>
                <li className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-bubblegum px-3 py-1"><ShieldIcon className="size-4" /> Students only</li>
              </ul>
            </div>

            {/* Sticker collage (decorative) */}
            <div aria-hidden="true" className="relative hidden h-80 lg:block">
              <div className="absolute top-2 left-6 w-52 rotate-[-8deg] rounded-2xl border-2 border-ink bg-white p-3 text-ink shadow-pop-lg transition-transform hover:rotate-0">
                <div className="flex h-24 items-center justify-center rounded-xl border-2 border-ink bg-sky"><BookIcon className="size-12" /></div>
                <p className="mt-2 font-bold">Engineering Maths</p>
                <span className="mt-1 inline-block rounded-lg border-2 border-ink bg-sun px-2 font-display font-bold">₹350</span>
              </div>
              <div className="absolute top-20 right-0 w-52 rotate-[7deg] rounded-2xl border-2 border-ink bg-white p-3 text-ink shadow-pop-lg transition-transform hover:rotate-0">
                <div className="relative flex h-24 items-center justify-center rounded-xl border-2 border-ink bg-mint">
                  <BikeIcon className="size-12" />
                  <span className="absolute -rotate-12 rounded-lg border-[3px] border-red-600 bg-white/90 px-2 font-display text-lg font-bold text-red-600">SOLD!</span>
                </div>
                <p className="mt-2 font-bold">Hero Sprint cycle</p>
                <span className="mt-1 inline-block rounded-lg border-2 border-ink bg-slate-200 px-2 font-display font-bold text-slate-600 line-through">₹2,800</span>
              </div>
              <div className="absolute bottom-2 left-0 rotate-[-3deg] rounded-2xl rounded-bl-sm border-2 border-ink bg-white px-4 py-2.5 font-bold text-ink shadow-pop">
                Is it still available?
              </div>
              <div className="absolute right-16 bottom-0 rotate-[4deg] rounded-2xl rounded-br-sm border-2 border-ink bg-sun px-4 py-2.5 font-bold text-ink shadow-pop">
                Yes! Meet at the library?
              </div>
            </div>
          </div>
        </section>
      )}

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
