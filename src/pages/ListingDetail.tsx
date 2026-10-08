import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { deleteListing, getListing, markAvailable, markSold } from '../services/listingService';
import { getOrCreateChat } from '../services/chatService';
import { toUserMessage } from '../utils/errorMessages';
import { formatDate, formatPrice, osmUrl } from '../utils/format';
import ImageGallery from '../components/listings/ImageGallery';
import FavoriteButton from '../components/listings/FavoriteButton';
import ShareButtons from '../components/listings/ShareButtons';
import ReportButton from '../components/listings/ReportButton';
import { CONDITION_LABEL } from '../utils/constants';
import { StatusBadge } from '../components/listings/SoldRibbon';
import { CategoryTag } from '../components/listings/CategoryIcon';
import Button, { buttonClasses } from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Avatar from '../components/ui/Avatar';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { ArrowRightIcon, ChatIcon, CheckIcon, ChevronLeftIcon, EditIcon, ExternalIcon, MapPinIcon, TrashIcon, WarningIcon } from '../components/ui/Icons';
import type { ListingWithSeller } from '../types';

export default function ListingDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [listing, setListing] = useState<ListingWithSeller | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'status' | 'delete' | 'chat' | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useDocumentTitle(listing?.title ?? (listing === null ? 'Not found' : 'Listing'));

  const load = useCallback(async () => {
    setError(null);
    try {
      setListing(await getListing(id));
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, [id]);

  useEffect(() => {
    setListing(undefined);
    load();
  }, [load]);

  // Live updates to this listing (e.g. edited or marked sold in another window).
  useEffect(() => {
    if (!listing?.id) return;
    const ch = supabase
      .channel(`listing:${listing.id}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings', filter: `id=eq.${listing.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [listing?.id, load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (listing === undefined) return <FullPageSpinner label="Loading listing..." />;
  if (listing === null)
    return (
      <EmptyState
        icon={<WarningIcon className="size-7" />}
        title="This listing doesn't exist or was removed."
        action={<Link to="/" className={buttonClasses()}>Browse marketplace</Link>}
      />
    );

  const isOwner = user?.id === listing.seller_id;
  const sold = listing.status === 'sold';

  const toggleStatus = async () => {
    setBusy('status');
    try {
      const updated = sold ? await markAvailable(listing.id) : await markSold(listing.id);
      setListing(updated);
      showToast(sold ? 'Listing marked as available.' : 'Listing marked as sold.');
    } catch (err) {
      showToast(toUserMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy('delete');
    try {
      await deleteListing(listing);
      showToast('Listing deleted.');
      navigate('/my-listings', { replace: true });
    } catch (err) {
      showToast(toUserMessage(err), 'error');
      setBusy(null);
      setConfirmOpen(false);
    }
  };

  const contactSeller = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setBusy('chat');
    try {
      const chatId = await getOrCreateChat(listing, user.id);
      navigate(`/messages/${chatId}`);
    } catch (err) {
      showToast(toUserMessage(err), 'error');
      setBusy(null);
    }
  };

  const hasPin = listing.latitude !== null && listing.longitude !== null;

  return (
    <div>
      <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 font-display text-sm font-semibold text-ink shadow-pop-sm transition-transform hover:-translate-x-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none motion-reduce:transform-none">
        <ChevronLeftIcon className="size-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <ImageGallery paths={listing.image_paths} title={listing.title} sold={sold} />

        <div className="space-y-6">
          <div className="card-pop p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={listing.status} />
              <Link
                to={`/?category=${encodeURIComponent(listing.category)}`}
                className="rounded-full transition-transform hover:-rotate-3 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none motion-reduce:transition-none"
              >
                <CategoryTag category={listing.category} />
              </Link>
              {listing.condition && (
                <span className="inline-flex items-center rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-bold text-ink">
                  {CONDITION_LABEL[listing.condition]}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-bold break-words text-ink sm:text-4xl">{listing.title}</h1>
            <p
              className={`mt-4 inline-block -rotate-2 rounded-xl border-2 border-ink px-4 py-1 font-display text-3xl font-bold tabular-nums shadow-pop ${
                sold ? 'bg-slate-200 text-slate-600 line-through' : 'bg-sun text-ink'
              }`}
            >
              {formatPrice(listing.price)}
            </p>
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Posted on <time dateTime={listing.created_at}>{formatDate(listing.created_at)}</time>
              {listing.updated_at !== listing.created_at && <> · Updated {formatDate(listing.updated_at)}</>}
            </p>

            {listing.location_name && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-2 border-dashed border-ink bg-mint-soft px-3 py-2 text-sm font-semibold text-ink">
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-4 text-brand-600" /> {listing.location_name}
                </span>
                {hasPin && (
                  <span className="inline-flex items-center gap-2">
                    <a
                      href={osmUrl(listing.latitude!, listing.longitude!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-white px-2.5 font-bold text-ink hover:bg-sun"
                    >
                      View map <ExternalIcon className="size-3.5" />
                    </a>
                    <span className="text-xs font-medium text-slate-600">© OpenStreetMap contributors</span>
                  </span>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {isOwner ? (
                <>
                  <Link to={`/edit/${listing.id}`} className={buttonClasses('secondary', 'md', 'sm:flex-1')}>
                    <EditIcon className="size-4" /> Edit
                  </Link>
                  <Button variant={sold ? 'secondary' : 'primary'} className="sm:flex-1" onClick={toggleStatus} loading={busy === 'status'} loadingText="Saving...">
                    <CheckIcon className="size-4" /> {sold ? 'Mark Available' : 'Mark as Sold'}
                  </Button>
                  <Button variant="danger" className="sm:flex-1" onClick={() => setConfirmOpen(true)} disabled={busy !== null}>
                    <TrashIcon className="size-4" /> Delete
                  </Button>
                </>
              ) : (
                <>
                  {!sold && (
                    <Button size="lg" className="sm:flex-1" onClick={contactSeller} loading={busy === 'chat'} loadingText="Opening chat...">
                      <ChatIcon /> Contact Seller
                    </Button>
                  )}
                  <FavoriteButton listingId={listing.id} sellerId={listing.seller_id} title={listing.title} variant="button" />
                </>
              )}
            </div>
            {sold && !isOwner && (
              <p className="mt-4 rounded-xl border-2 border-ink bg-red-300 px-3 py-2 text-sm font-bold text-ink">This item has been sold.</p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-slate-200 pt-4">
              <ShareButtons title={listing.title} price={listing.price} />
              <ReportButton listingId={listing.id} sellerId={listing.seller_id} />
            </div>
          </div>

          <div className="card-pop p-5 sm:p-6">
            <h2 className="text-xl font-bold text-ink">
              <span className="marker">Description</span>
            </h2>
            <p className="mt-3 text-base leading-relaxed font-medium break-words whitespace-pre-line text-slate-800">{listing.description}</p>
          </div>

          <Link
            to={`/u/${listing.seller_id}`}
            className="card-pop press group flex items-center gap-4 !bg-sky-soft p-5 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none"
          >
            <span className="-rotate-6">
              <Avatar name={listing.seller?.name} size="lg" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="inline-block rounded-full border-2 border-ink bg-white px-2 text-xs font-bold tracking-wide text-ink uppercase">Seller</p>
              <p className="mt-1 truncate font-display text-xl font-bold text-ink">
                {listing.seller?.name ?? 'Student'} {isOwner && <span className="text-sm font-semibold text-slate-600">(you)</span>}
              </p>
              {listing.seller?.campus && <p className="truncate text-sm font-semibold text-slate-700">{listing.seller.campus}</p>}
              <p className="mt-1 text-sm font-bold text-brand-700 underline decoration-2 underline-offset-4">See profile and other listings</p>
            </div>
            <ArrowRightIcon className="size-5 shrink-0 text-ink transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete listing?"
        message="Are you sure you want to delete this listing? This cannot be undone."
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        loading={busy === 'delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
