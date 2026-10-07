import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ListingImage from './ListingImage';
import SoldRibbon from './SoldRibbon';
import FavoriteButton from './FavoriteButton';
import { MapPinIcon } from '../ui/Icons';
import { CATEGORY_EMOJI } from '../../utils/constants';
import { formatPrice, timeAgo } from '../../utils/format';
import type { ListingWithSeller } from '../../types';

export default function ListingCard({ listing, footer }: { listing: ListingWithSeller; footer?: ReactNode }) {
  const sold = listing.status === 'sold';
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link
        to={`/listing/${listing.id}`}
        className="flex flex-1 flex-col focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none focus-visible:ring-inset"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <ListingImage path={listing.image_paths[0]} alt={listing.title} sold={sold} className="size-full transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
          {sold && <SoldRibbon />}
          <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
            {CATEGORY_EMOJI[listing.category]} {listing.category}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className={`text-lg font-bold ${sold ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{formatPrice(listing.price)}</p>
          <h3 className="line-clamp-2 font-medium text-slate-800">{listing.title}</h3>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-slate-500">
            <span className="flex min-w-0 items-center gap-1">
              {listing.location_name ? (
                <>
                  <MapPinIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{listing.location_name}</span>
                </>
              ) : (
                <span className="truncate">{listing.seller?.campus ?? ''}</span>
              )}
            </span>
            <time dateTime={listing.created_at} className="shrink-0">
              {timeAgo(listing.created_at)}
            </time>
          </div>
        </div>
      </Link>
      <div className="absolute top-2 right-2">
        <FavoriteButton listingId={listing.id} sellerId={listing.seller_id} title={listing.title} />
      </div>
      {footer && <div className="border-t border-slate-100 p-3">{footer}</div>}
    </article>
  );
}
