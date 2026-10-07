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
    <ul className="divide-y divide-slate-100">
      {chats.map((c) => {
        const iAmBuyer = c.buyer_id === me;
        const other = iAmBuyer ? c.seller?.name : c.buyer?.name;
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <Link
              to={`/messages/${c.id}`}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 transition focus-visible:bg-slate-50 focus-visible:outline-none ${
                active ? 'bg-brand-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                <ListingImage path={c.listing?.image_paths[0]} alt={c.listing?.title ?? 'Listing'} sold={c.listing?.status === 'sold'} className="size-full" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold text-slate-900">{other ?? 'Student'}</p>
                  <time dateTime={c.last_message_at} className="shrink-0 text-xs text-slate-500">
                    {formatChatTime(c.last_message_at)}
                  </time>
                </div>
                <p className="truncate text-sm text-slate-600">{c.listing?.title ?? 'Listing removed'}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {iAmBuyer ? 'You’re buying' : 'You’re selling'}
                  {c.listing?.status === 'sold' && ' · Sold'}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
