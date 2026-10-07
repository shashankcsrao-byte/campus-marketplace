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
import { CATEGORY_EMOJI } from '../utils/constants';
import ImageGallery from '../components/listings/ImageGallery';
import FavoriteButton from '../components/listings/FavoriteButton';
import { StatusBadge } from '../components/listings/SoldRibbon';
import Button, { buttonClasses } from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Avatar from '../components/ui/Avatar';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { ChatIcon, CheckIcon, ChevronLeftIcon, EditIcon, ExternalIcon, MapPinIcon, TrashIcon, WarningIcon } from '../components/ui/Icons';
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
      <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg pr-3 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ChevronLeftIcon className="size-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <ImageGallery paths={listing.image_paths} title={listing.title} sold={sold} />

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={listing.status} />
              <Link
                to={`/?category=${encodeURIComponent(listing.category)}`}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {CATEGORY_EMOJI[listing.category]} {listing.category}
              </Link>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight break-words text-slate-900 sm:text-3xl">{listing.title}</h1>
            <p className={`mt-2 text-3xl font-extrabold ${sold ? 'text-slate-400 line-through' : 'text-brand-700'}`}>{formatPrice(listing.price)}</p>
            <p className="mt-2 text-sm text-slate-500">
              Posted on <time dateTime={listing.created_at}>{formatDate(listing.created_at)}</time>
              {listing.updated_at !== listing.created_at && <> · Updated {formatDate(listing.updated_at)}</>}
            </p>

            {listing.location_name && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-4 text-slate-400" /> {listing.location_name}
                </span>
                {hasPin && (
                  <span className="inline-flex items-center gap-2">
                    <a
                      href={osmUrl(listing.latitude!, listing.longitude!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      View map <ExternalIcon className="size-3.5" />
                    </a>
                    <span className="text-xs text-slate-400">© OpenStreetMap contributors</span>
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
            {sold && !isOwner && <p className="mt-3 text-sm text-slate-500">This item has been sold.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-slate-900">Description</h2>
            <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-line text-slate-700">{listing.description}</p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Avatar name={listing.seller?.name} size="md" />
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Seller</p>
              <p className="truncate font-semibold text-slate-900">
                {listing.seller?.name ?? 'Student'} {isOwner && <span className="text-sm font-normal text-slate-500">(you)</span>}
              </p>
              {listing.seller?.campus && <p className="truncate text-sm text-slate-500">{listing.seller.campus}</p>}
            </div>
          </div>
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
