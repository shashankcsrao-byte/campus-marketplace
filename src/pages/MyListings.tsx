import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { deleteListing, getListingsBySeller, markAvailable, markSold } from '../services/listingService';
import { toUserMessage } from '../utils/errorMessages';
import ListingCard from '../components/listings/ListingCard';
import ListingGrid, { ListingSkeleton } from '../components/listings/ListingGrid';
import Button, { buttonClasses } from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorState } from '../components/ui/States';
import { EditIcon, PlusIcon, TagIcon, TrashIcon } from '../components/ui/Icons';
import type { ListingWithSeller } from '../types';

type Tab = 'all' | 'available' | 'sold';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'sold', label: 'Sold' },
];

export default function MyListings() {
  useDocumentTitle('My listings');
  const { user } = useAuth();
  const { showToast } = useToast();
  const [listings, setListings] = useState<ListingWithSeller[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ListingWithSeller | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    setListings(null);
    try {
      setListings(await getListingsBySeller(user.id));
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (l: ListingWithSeller) => {
    setBusyId(l.id);
    try {
      const updated = l.status === 'sold' ? await markAvailable(l.id) : await markSold(l.id);
      setListings((prev) => prev?.map((x) => (x.id === l.id ? updated : x)) ?? null);
      showToast(updated.status === 'sold' ? 'Marked as sold.' : 'Marked as available.');
    } catch (err) {
      showToast(toUserMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteListing(toDelete);
      setListings((prev) => prev?.filter((x) => x.id !== toDelete.id) ?? null);
      showToast('Listing deleted.');
      setToDelete(null);
    } catch (err) {
      showToast(toUserMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const counts = {
    all: listings?.length ?? 0,
    available: listings?.filter((l) => l.status === 'available').length ?? 0,
    sold: listings?.filter((l) => l.status === 'sold').length ?? 0,
  };
  const visible = listings?.filter((l) => tab === 'all' || l.status === tab) ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">My listings</h1>
          <p className="mt-1 font-medium text-slate-600">Manage what you're selling.</p>
        </div>
        <Link to="/create" className={buttonClasses()}>
          <PlusIcon className="size-4" /> New listing
        </Link>
      </header>

      <div role="tablist" aria-label="Filter by status" className="mb-6 inline-flex gap-1 rounded-2xl border-2 border-ink bg-white p-1 shadow-pop-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-10 rounded-xl border-2 px-4 font-display text-sm font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none ${
              tab === t.key ? 'border-ink bg-sun text-ink' : 'border-transparent text-ink hover:bg-sun-soft'
            }`}
          >
            {t.label}{' '}
            <span className="ml-1 rounded-full border-2 border-ink bg-white px-1.5 text-xs tabular-nums">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : listings === null ? (
        <ListingSkeleton count={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<TagIcon className="size-7" />}
          title={tab === 'all' ? "You haven't listed anything yet" : `No ${tab} listings`}
          description={tab === 'all' ? 'Turn your unused stuff into cash — it takes a minute.' : undefined}
          action={tab === 'all' ? <Link to="/create" className={buttonClasses()}>Post your first listing</Link> : undefined}
        />
      ) : (
        <ListingGrid>
          {visible.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              footer={
                <div className="grid grid-cols-3 gap-2">
                  <Link to={`/edit/${l.id}`} className={buttonClasses('secondary', 'sm')} aria-label={`Edit ${l.title}`}>
                    <EditIcon className="size-4" /> Edit
                  </Link>
                  <Button size="sm" variant="secondary" onClick={() => toggleStatus(l)} loading={busyId === l.id} aria-label={l.status === 'sold' ? `Mark ${l.title} available` : `Mark ${l.title} sold`}>
                    {l.status === 'sold' ? 'Relist' : 'Sold'}
                  </Button>
                  <Button size="sm" variant="ghost" className="!text-red-700 hover:!border-red-700 hover:!bg-red-50" onClick={() => setToDelete(l)} aria-label={`Delete ${l.title}`}>
                    <TrashIcon className="size-4" /> Delete
                  </Button>
                </div>
              }
            />
          ))}
        </ListingGrid>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete listing?"
        message="Are you sure you want to delete this listing? This cannot be undone."
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
