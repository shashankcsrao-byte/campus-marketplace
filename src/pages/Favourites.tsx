import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useFavorites } from '../context/FavoritesContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getFavoriteListings } from '../services/favoriteService';
import { toUserMessage } from '../utils/errorMessages';
import ListingCard from '../components/listings/ListingCard';
import ListingGrid, { ListingSkeleton } from '../components/listings/ListingGrid';
import { EmptyState, ErrorState } from '../components/ui/States';
import { HeartIcon } from '../components/ui/Icons';
import type { ListingWithSeller } from '../types';

export default function Favourites() {
  useDocumentTitle('Favourites');
  const { ids } = useFavorites();
  const [listings, setListings] = useState<ListingWithSeller[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setListings(null);
    try {
      setListings(await getFavoriteListings());
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Un-favouriting on this page removes the card immediately.
  const visible = listings?.filter((l) => ids.has(l.id)) ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">
          Your <span className="marker">favourites</span>
        </h1>
        <p className="mt-1 font-medium text-slate-600">Items you've saved, most recent first.</p>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : listings === null ? (
        <ListingSkeleton count={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="size-7" />}
          title="No favourites yet."
          description={
            <Link to="/" className="font-bold text-brand-700 underline decoration-2 underline-offset-4 hover:bg-sun">
              Browse the marketplace →
            </Link>
          }
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
