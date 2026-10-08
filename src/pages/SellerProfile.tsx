import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getProfile } from '../services/authService';
import { getListingsBySeller } from '../services/listingService';
import { toUserMessage } from '../utils/errorMessages';
import { formatDate, UUID_RE } from '../utils/format';
import ListingCard from '../components/listings/ListingCard';
import ListingGrid, { ListingSkeleton } from '../components/listings/ListingGrid';
import Avatar from '../components/ui/Avatar';
import { buttonClasses } from '../components/ui/Button';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { EditIcon, TagIcon, WarningIcon } from '../components/ui/Icons';
import type { ListingWithSeller, Profile } from '../types';

type Tab = 'available' | 'sold';

/** Public seller page: who they are and everything they have listed. */
export default function SellerProfile() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [listings, setListings] = useState<ListingWithSeller[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('available');

  useDocumentTitle(profile?.name ?? (profile === null ? 'Seller not found' : 'Seller'));

  const load = useCallback(async () => {
    setError(null);
    setProfile(undefined);
    setListings(null);
    if (!UUID_RE.test(id)) return setProfile(null);
    try {
      const [p, l] = await Promise.all([getProfile(id), getListingsBySeller(id)]);
      setProfile(p);
      setListings(l);
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (profile === undefined) return <FullPageSpinner label="Loading seller..." />;
  if (profile === null)
    return (
      <EmptyState
        icon={<WarningIcon className="size-7" />}
        title="This seller doesn't exist."
        action={<Link to="/" className={buttonClasses()}>Browse marketplace</Link>}
      />
    );

  const isMe = user?.id === profile.id;
  const available = listings?.filter((l) => l.status === 'available') ?? [];
  const sold = listings?.filter((l) => l.status === 'sold') ?? [];
  const visible = tab === 'available' ? available : sold;

  return (
    <div>
      <section className="card-pop relative mb-8 flex flex-col gap-5 overflow-hidden !bg-m3-primary-container p-6 text-m3-on-primary-container sm:flex-row sm:items-center sm:p-8">
        <span aria-hidden="true" className="absolute -top-10 -right-10 size-40 rounded-full border-2 border-ink bg-sun" />
        <span className="relative -rotate-6 self-start sm:self-center">
          <Avatar name={profile.name} size="lg" />
        </span>
        <div className="relative min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl font-bold sm:text-4xl">{profile.name}</h1>
          {profile.campus && <p className="mt-1 truncate font-semibold opacity-90">{profile.campus}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink">
            <span className="rounded-full border-2 border-ink bg-white px-2.5 py-0.5">Member since {formatDate(profile.created_at)}</span>
            <span className="rounded-full border-2 border-ink bg-mint px-2.5 py-0.5">{available.length} for sale</span>
            <span className="rounded-full border-2 border-ink bg-white px-2.5 py-0.5">{sold.length} sold</span>
          </div>
        </div>
        {isMe && (
          <Link to="/profile" className={buttonClasses('secondary', 'md', 'relative shrink-0')}>
            <EditIcon className="size-4" /> Edit profile
          </Link>
        )}
      </section>

      <div role="tablist" aria-label="Listings by status" className="mb-6 inline-flex gap-1 rounded-2xl border-2 border-ink bg-white p-1 shadow-pop-sm">
        {(['available', 'sold'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-10 rounded-xl border-2 px-4 font-display text-sm font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none ${
              tab === t ? 'border-ink bg-sun text-ink' : 'border-transparent text-ink hover:bg-sun-soft'
            }`}
          >
            {t === 'available' ? 'For sale' : 'Sold'}{' '}
            <span className="ml-1 rounded-full border-2 border-ink bg-white px-1.5 text-xs tabular-nums">{t === 'available' ? available.length : sold.length}</span>
          </button>
        ))}
      </div>

      {listings === null ? (
        <ListingSkeleton count={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<TagIcon className="size-7" />}
          title={tab === 'available' ? (isMe ? "You don't have anything for sale" : 'Nothing for sale right now') : 'No sold items yet'}
          action={isMe && tab === 'available' ? <Link to="/create" className={buttonClasses()}>Post a listing</Link> : undefined}
        />
      ) : (
        <ListingGrid>
          {visible.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </ListingGrid>
      )}
    </div>
  );
}
