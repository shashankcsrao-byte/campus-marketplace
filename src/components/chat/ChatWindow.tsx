import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useChat } from '../../hooks/useChat';
import { useToast } from '../../context/ToastContext';
import { getChat } from '../../services/chatService';
import { toUserMessage } from '../../utils/errorMessages';
import { formatPrice, formatTime, formatDate } from '../../utils/format';
import { LIMITS } from '../../utils/constants';
import ListingImage from '../listings/ListingImage';
import Spinner from '../ui/Spinner';
import { ErrorState } from '../ui/States';
import { ChevronLeftIcon, SendIcon } from '../ui/Icons';
import type { ChatSummary } from '../../types';

export default function ChatWindow({ chatId, me }: { chatId: string; me: string }) {
  const { messages, loading, error, send, retry } = useChat(chatId);
  const { showToast } = useToast();
  const [chat, setChat] = useState<ChatSummary | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

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

  if (chat === null) {
    return <div className="p-6"><ErrorState message="This conversation doesn't exist or you don't have access to it." /></div>;
  }

  const other = chat ? (chat.buyer_id === me ? chat.seller?.name : chat.buyer?.name) : '';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b-2 border-ink bg-white px-3 py-3 sm:px-4">
        <Link to="/messages" aria-label="Back to conversations" className="flex size-11 items-center justify-center rounded-xl border-2 border-ink bg-white shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none lg:hidden">
          <ChevronLeftIcon className="size-5" />
        </Link>
        {chat?.listing ? (
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
        ) : (
          <div className="h-12 flex-1 animate-pulse rounded-xl bg-brand-100" />
        )}
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-cream bg-[radial-gradient(rgb(26_16_51/0.07)_1px,transparent_1px)] bg-[length:18px_18px] px-3 py-4 sm:px-5" aria-live="polite">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm">
            <span aria-hidden="true" className="mb-3 flex size-14 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-sun font-display text-2xl font-bold shadow-pop">
              Hi!
            </span>
            <p className="font-display text-lg font-bold text-ink">No messages yet</p>
            <p className="mt-1 font-medium text-slate-600">Say hi and ask about the item.</p>
          </div>
        ) : (
          <ol className="space-y-2">
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
