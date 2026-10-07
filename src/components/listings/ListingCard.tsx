import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ListingImage from './ListingImage';
import SoldRibbon from './SoldRibbon';
import FavoriteButton from './FavoriteButton';
import { CategoryTag } from './CategoryIcon';
import { ClockIcon, MapPinIcon } from '../ui/Icons';
import { formatPrice, timeAgo } from '../../utils/format';
import type { ListingWithSeller } from '../../types';

export default function ListingCard({ listing, footer }: { listing: ListingWithSeller; footer?: ReactNode }) {
  const sold = listing.status === 'sold';
  return (
    <article className="group card-pop press relative flex flex-col overflow-hidden">
      <Link
        to={`/listing/${listing.id}`}
        className="flex flex-1 flex-col rounded-[1.1rem] focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none focus-visible:ring-inset"
      >
        <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-ink">
          <ListingImage
            path={listing.image_paths[0]}
            alt={listing.title}
            sold={sold}
            className="size-full transition duration-300 group-hover:scale-[1.05] motion-reduce:transition-none"
          />
          {sold && <SoldRibbon />}
          <CategoryTag category={listing.category} className="absolute bottom-2.5 left-2.5 shadow-pop-sm" />
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="line-clamp-2 font-sans text-base leading-snug font-bold text-ink">{listing.title}</h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            {/* Price sticker */}
            <span
              className={`-rotate-2 rounded-lg border-2 border-ink px-2.5 py-0.5 font-display text-lg font-bold tabular-nums shadow-pop-sm transition-transform group-hover:rotate-2 motion-reduce:transition-none ${
                sold ? 'bg-slate-200 text-slate-600 line-through' : 'bg-sun text-ink'
              }`}
            >
              {formatPrice(listing.price)}
            </span>
            <time dateTime={listing.created_at} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600">
              <ClockIcon className="size-3.5" />
              {timeAgo(listing.created_at)}
            </time>
          </div>
          <p className="flex min-w-0 items-center gap-1 text-xs font-semibold text-slate-600">
            {listing.location_name ? (
              <>
                <MapPinIcon className="size-3.5 shrink-0 text-brand-600" />
                <span className="truncate">{listing.location_name}</span>
              </>
            ) : (
              <span className="truncate">{listing.seller?.campus ?? ''}</span>
            )}
          </p>
        </div>
      </Link>
      <div className="absolute top-2.5 right-2.5">
        <FavoriteButton listingId={listing.id} sellerId={listing.seller_id} title={listing.title} />
      </div>
      {footer && <div className="border-t-2 border-ink bg-cream p-3">{footer}</div>}
    </article>
  );
}
