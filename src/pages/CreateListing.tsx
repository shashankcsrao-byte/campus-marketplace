import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { createListing } from '../services/listingService';
import ListingForm from '../components/listings/ListingForm';
import type { ImageItem, ListingInput } from '../types';

export default function CreateListing() {
  useDocumentTitle('Sell an item');
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [progress, setProgress] = useState('Publishing...');

  const handleSubmit = async (input: ListingInput, images: ImageItem[]) => {
    const files = images.flatMap((i) => (i.kind === 'new' ? [i.file] : []));
    const listing = await createListing(user!.id, input, files, setProgress);
    showToast('Listing created successfully.');
    navigate(`/listing/${listing.id}`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">
          Sell <span className="marker">something</span>
        </h1>
        <p className="mt-1 font-medium text-slate-600">Good photos and a clear description sell faster.</p>
      </header>
      <ListingForm submitLabel="Publish listing" progressLabel={progress} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
    </div>
  );
}
