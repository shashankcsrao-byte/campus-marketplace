import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getListing, saveListingEdits } from '../services/listingService';
import { toUserMessage } from '../utils/errorMessages';
import ListingForm from '../components/listings/ListingForm';
import { buttonClasses } from '../components/ui/Button';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { WarningIcon } from '../components/ui/Icons';
import type { ImageItem, ListingInput, ListingWithSeller } from '../types';

export default function EditListing() {
  useDocumentTitle('Edit listing');
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [listing, setListing] = useState<ListingWithSeller | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('Saving...');

  const load = useCallback(async () => {
    setError(null);
    setListing(undefined);
    try {
      setListing(await getListing(id));
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (listing === undefined) return <FullPageSpinner label="Loading listing..." />;
  if (listing === null)
    return (
      <EmptyState
        icon={<WarningIcon className="size-7" />}
        title="This listing doesn't exist or was removed."
        action={<Link to="/my-listings" className={buttonClasses()}>My listings</Link>}
      />
    );
  // UX only — the database (RLS) is what actually blocks other users.
  if (listing.seller_id !== user?.id)
    return (
      <EmptyState
        icon={<WarningIcon className="size-7" />}
        title="You can't edit this listing"
        description="Only the seller who posted it can make changes."
        action={<Link to={`/listing/${listing.id}`} className={buttonClasses('secondary')}>View listing</Link>}
      />
    );

  const handleSubmit = async (input: ListingInput, images: ImageItem[]) => {
    await saveListingEdits(listing, input, images, setProgress);
    showToast('Listing updated.');
    navigate(`/listing/${listing.id}`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">Edit listing</h1>
        <p className="mt-1 truncate font-medium text-slate-600">{listing.title}</p>
      </header>
      <ListingForm initial={listing} submitLabel="Save changes" progressLabel={progress} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
    </div>
  );
}
