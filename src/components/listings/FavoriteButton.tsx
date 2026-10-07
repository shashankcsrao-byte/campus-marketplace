import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { HeartIcon } from '../ui/Icons';

interface FavoriteButtonProps {
  listingId: string;
  sellerId: string;
  title: string;
  variant?: 'overlay' | 'button';
}

export default function FavoriteButton({ listingId, sellerId, title, variant = 'overlay' }: FavoriteButtonProps) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  if (user?.id === sellerId) return null; // not on your own listings

  const active = isFavorite(listingId);
  const onClick = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    toggle(listingId);
  };

  const label = active ? `Remove ${title} from favourites` : `Add ${title} to favourites`;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
          active ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
        }`}
      >
        <HeartIcon filled={active} className={`size-5 ${active ? 'text-rose-500' : ''}`} />
        {active ? 'Saved' : 'Favourite'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
    >
      <HeartIcon filled={active} className={`size-5 ${active ? 'text-rose-500' : 'text-slate-700'}`} />
    </button>
  );
}
