import { Link } from 'react-router';
import ListingImage from '../listings/ListingImage';
import { formatChatTime } from '../../utils/format';
import type { ChatSummary } from '../../types';

interface ChatListProps {
  chats: ChatSummary[];
  me: string;
  activeId?: string;
}

export default function ChatList({ chats, me, activeId }: ChatListProps) {
  return (
    <ul className="space-y-2 p-3">
      {chats.map((c) => {
        const iAmBuyer = c.buyer_id === me;
        const other = iAmBuyer ? c.seller?.name : c.buyer?.name;
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <Link
              to={`/messages/${c.id}`}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 transition-[transform,box-shadow,background-color] duration-150 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none motion-reduce:transform-none ${
                active ? 'border-ink bg-sun shadow-pop-sm' : 'border-transparent hover:-translate-y-0.5 hover:border-ink hover:bg-white hover:shadow-pop-sm'
              }`}
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border-2 border-ink">
                <ListingImage path={c.listing?.image_paths[0]} alt={c.listing?.title ?? 'Listing'} sold={c.listing?.status === 'sold'} className="size-full" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-display text-base font-bold text-ink">{other ?? 'Student'}</p>
                  <time dateTime={c.last_message_at} className="shrink-0 text-xs font-semibold text-slate-600">
                    {formatChatTime(c.last_message_at)}
                  </time>
                </div>
                <p className="truncate text-sm font-medium text-slate-700">{c.listing?.title ?? 'Listing removed'}</p>
                <p className="mt-1 flex gap-1.5">
                  <span className={`rounded-full border-2 border-ink px-2 text-[11px] font-bold text-ink ${iAmBuyer ? 'bg-sky-soft' : 'bg-mint-soft'}`}>
                    {iAmBuyer ? 'Buying' : 'Selling'}
                  </span>
                  {c.listing?.status === 'sold' && (
                    <span className="rounded-full border-2 border-ink bg-red-300 px-2 text-[11px] font-bold text-ink">Sold</span>
                  )}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
