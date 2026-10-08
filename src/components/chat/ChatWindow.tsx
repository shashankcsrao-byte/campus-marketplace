import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useChat } from '../../hooks/useChat';
import { useToast } from '../../context/ToastContext';
import { useUnread } from '../../context/UnreadContext';
import { getChat } from '../../services/chatService';
import { markSold } from '../../services/listingService';
import { toUserMessage } from '../../utils/errorMessages';
import { formatPrice, formatTime, formatDate } from '../../utils/format';
import { LIMITS } from '../../utils/constants';
import ListingImage from '../listings/ListingImage';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { ErrorState } from '../ui/States';
import { CheckIcon, ChevronLeftIcon, SendIcon, ShieldIcon, XIcon } from '../ui/Icons';
import type { ChatSummary } from '../../types';

const TIPS_KEY = 'cm:safety-tips-hidden';
const readTipsHidden = () => {
  try {
    return localStorage.getItem(TIPS_KEY) === '1';
  } catch {
    return false;
  }
};

export default function ChatWindow({ chatId, me }: { chatId: string; me: string }) {
  const { messages, loading, error, send, retry, hasOlder, loadingOlder, loadOlder } = useChat(chatId);
  const { showToast } = useToast();
  const { markRead } = useUnread();
  const [chat, setChat] = useState<ChatSummary | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);
  const [tipsHidden, setTipsHidden] = useState(readTipsHidden);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prependAnchor = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setChat(undefined);
    getChat(chatId)
      .then((c) => active && setChat(c))
      .catch(() => active && setChat(null));
    return () => {
      active = false;
    };
  }, [chatId]);

  const lastId = messages.at(-1)?.id;

  // Keep the newest message in view (but not when older messages are prepended).
  useEffect(() => {
    if (prependAnchor.current === null) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  // After prepending older messages, keep the reader where they were.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && prependAnchor.current !== null) {
      el.scrollTop = el.scrollHeight - prependAnchor.current;
      prependAnchor.current = null;
    }
  }, [messages.length]);

  // Opening the chat, or a new message arriving while it's open and visible, marks it read.
  useEffect(() => {
    if (loading) return;
    const markIfVisible = () => document.visibilityState === 'visible' && markRead(chatId);
    markIfVisible();
    document.addEventListener('visibilitychange', markIfVisible);
    return () => document.removeEventListener('visibilitychange', markIfVisible);
  }, [chatId, lastId, loading, markRead]);

  const showOlder = async () => {
    const el = scrollRef.current;
    prependAnchor.current = el ? el.scrollHeight - el.scrollTop : null;
    try {
      await loadOlder();
    } catch (err) {
      prependAnchor.current = null;
      showToast(toUserMessage(err), 'error');
    }
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      await send(body);
    } catch (err) {
      setDraft(body); // restore the text so nothing is lost
      showToast(toUserMessage(err), 'error');
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const setTips = (hidden: boolean) => {
    setTipsHidden(hidden);
    try {
      localStorage.setItem(TIPS_KEY, hidden ? '1' : '0');
    } catch {
      /* storage blocked: the choice lasts until reload */
    }
  };

  if (chat === null) {
    return <div className="p-6"><ErrorState message="This conversation doesn't exist or you don't have access to it." /></div>;
  }

  const iAmSeller = chat?.seller_id === me;
  const otherId = chat ? (iAmSeller ? chat.buyer_id : chat.seller_id) : undefined;
  const other = chat ? (iAmSeller ? chat.buyer?.name : chat.seller?.name) : '';
  const canMarkSold = iAmSeller && chat?.listing?.status === 'available';

  const handleMarkSold = async () => {
    if (!chat?.listing) return;
    setMarkingSold(true);
    try {
      await markSold(chat.listing.id);
      setChat({ ...chat, listing: { ...chat.listing, status: 'sold' } });
      showToast('Marked as sold. You can relist it from My listings.');
    } catch (err) {
      showToast(toUserMessage(err), 'error');
    } finally {
      setMarkingSold(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b-2 border-ink bg-white px-3 py-3 sm:gap-3 sm:px-4">
        <Link to="/messages" aria-label="Back to conversations" className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-white shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none lg:hidden">
          <ChevronLeftIcon className="size-5" />
        </Link>
        {chat?.listing ? (
          <>
            {otherId && (
              <Link to={`/u/${otherId}`} aria-label={`View ${other ?? 'student'}'s profile`} className="hidden shrink-0 rounded-full focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none sm:block">
                <Avatar name={other} />
              </Link>
            )}
            <Link to={`/listing/${chat.listing.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 hover:bg-sun-soft focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none">
              <div className="size-12 shrink-0 overflow-hidden rounded-xl border-2 border-ink">
                <ListingImage path={chat.listing.image_paths[0]} alt={chat.listing.title} sold={chat.listing.status === 'sold'} className="size-full" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold text-ink">{chat.listing.title}</p>
                <p className="truncate text-sm font-semibold text-slate-600">
                  {other} · {formatPrice(chat.listing.price)}
                  {chat.listing.status === 'sold' && <span className="ml-1 font-bold text-red-700">· Sold</span>}
                </p>
              </div>
            </Link>
            {canMarkSold && (
              <Button size="sm" variant="secondary" className="shrink-0" onClick={handleMarkSold} loading={markingSold} loadingText="Saving..." aria-label={`Mark ${chat.listing.title} as sold`}>
                <CheckIcon className="size-4" /> <span className="hidden sm:inline">Mark sold</span>
              </Button>
            )}
            {tipsHidden && (
              <button
                type="button"
                onClick={() => setTips(false)}
                aria-label="Show safety tips"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-mint-soft text-ink shadow-pop-sm hover:bg-mint focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none"
              >
                <ShieldIcon className="size-5" />
              </button>
            )}
          </>
        ) : (
          <div className="h-12 flex-1 animate-pulse rounded-xl bg-brand-100" />
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-cream bg-[radial-gradient(rgb(26_16_51/0.07)_1px,transparent_1px)] bg-[length:18px_18px] px-3 py-4 sm:px-5">
        {!tipsHidden && (
          <aside aria-label="Safety tips" className="relative mb-4 rounded-2xl border-2 border-ink bg-mint-soft p-3 pr-12 text-sm text-ink shadow-pop-sm">
            <p className="flex items-center gap-2 font-display font-bold">
              <ShieldIcon className="size-5" /> Stay safe when you meet
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 font-medium">
              <li>Meet in a busy, public spot on campus, in daylight.</li>
              <li>Check the item works before you pay.</li>
              <li>Never pay in advance, and never share an OTP or UPI PIN.</li>
            </ul>
            <button
              type="button"
              onClick={() => setTips(true)}
              aria-label="Hide safety tips"
              className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full border-2 border-transparent hover:border-ink hover:bg-white focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none"
            >
              <XIcon className="size-4" />
            </button>
          </aside>
        )}

        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-sm">
            <span aria-hidden="true" className="mb-3 flex size-14 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-sun font-display text-2xl font-bold shadow-pop">
              Hi!
            </span>
            <p className="font-display text-lg font-bold text-ink">No messages yet</p>
            <p className="mt-1 font-medium text-slate-600">Say hi and ask about the item.</p>
          </div>
        ) : (
          <>
            {hasOlder && (
              <div className="mb-3 flex justify-center">
                <Button size="sm" variant="secondary" onClick={showOlder} loading={loadingOlder} loadingText="Loading...">
                  Load older messages
                </Button>
              </div>
            )}
            <ol className="space-y-2" aria-live="polite" aria-relevant="additions">
              {messages.map((m, i) => {
                const mine = m.sender_id === me;
                const day = formatDate(m.created_at);
                const showDay = i === 0 || day !== formatDate(messages[i - 1].created_at);
                return (
                  <li key={m.id}>
                    {showDay && (
                      <p className="my-4 text-center">
                        <span className="rounded-full border-2 border-ink bg-white px-3 py-0.5 text-xs font-bold text-ink">{day}</span>
                      </p>
                    )}
                    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] animate-pop-in rounded-2xl border-2 border-ink px-3.5 py-2 text-sm font-medium shadow-pop-sm sm:max-w-[70%] ${
                          mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-white text-ink'
                        }`}
                      >
                        <p className="break-words whitespace-pre-wrap">{m.body}</p>
                        <p className={`mt-1 text-right text-[11px] font-semibold ${mine ? 'text-brand-100' : 'text-slate-500'}`}>
                          <time dateTime={m.created_at}>{formatTime(m.created_at)}</time>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-end gap-2 border-t-2 border-ink bg-white p-3">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={LIMITS.messageMax}
          disabled={sending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message…  (Shift+Enter for new line)"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 text-base font-medium shadow-pop-sm field-sizing-content placeholder:text-slate-500 focus:bg-brand-50 focus:shadow-[3px_3px_0_0_#7c3aed] focus:outline-none disabled:bg-slate-100 sm:text-sm"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-brand-600 text-white shadow-pop-sm transition-[transform,box-shadow] hover:-rotate-6 hover:bg-brand-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none disabled:opacity-50 disabled:hover:rotate-0 motion-reduce:transform-none"
        >
          {sending ? <Spinner size="sm" className="text-white" /> : <SendIcon className="size-5" />}
        </button>
      </form>
    </div>
  );
}
