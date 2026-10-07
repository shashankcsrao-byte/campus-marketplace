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
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-ink px-4 font-display text-sm font-semibold text-ink shadow-pop-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none motion-reduce:transform-none ${
          active ? 'bg-bubblegum' : 'bg-white hover:bg-bubblegum-soft'
        }`}
      >
        <HeartIcon key={String(active)} filled={active} className={`size-5 ${active ? 'animate-heart-pop text-ink' : ''}`} />
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
      className={`flex size-11 items-center justify-center rounded-full border-2 border-ink shadow-pop-sm transition-transform hover:scale-110 hover:-rotate-6 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none active:scale-95 motion-reduce:transform-none ${
        active ? 'bg-bubblegum' : 'bg-white'
      }`}
    >
      <HeartIcon key={String(active)} filled={active} className={`size-5 text-ink ${active ? 'animate-heart-pop' : ''}`} />
    </button>
  );
}
