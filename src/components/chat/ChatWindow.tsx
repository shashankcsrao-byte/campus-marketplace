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
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
        <Link to="/messages" aria-label="Back to conversations" className="flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden">
          <ChevronLeftIcon className="size-5" />
        </Link>
        {chat?.listing ? (
          <Link to={`/listing/${chat.listing.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
            <div className="size-11 shrink-0 overflow-hidden rounded-lg">
              <ListingImage path={chat.listing.image_paths[0]} alt={chat.listing.title} sold={chat.listing.status === 'sold'} className="size-full" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{chat.listing.title}</p>
              <p className="truncate text-sm text-slate-500">
                {other} · {formatPrice(chat.listing.price)}
                {chat.listing.status === 'sold' && <span className="ml-1 font-semibold text-red-600">· Sold</span>}
              </p>
            </div>
          </Link>
        ) : (
          <div className="h-12 flex-1 animate-pulse rounded-lg bg-slate-100" />
        )}
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-5" aria-live="polite">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
            <p className="font-medium text-slate-700">No messages yet</p>
            <p className="mt-1">Say hi and ask about the item 👋</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {messages.map((m, i) => {
              const mine = m.sender_id === me;
              const day = formatDate(m.created_at);
              const showDay = i === 0 || day !== formatDate(messages[i - 1].created_at);
              return (
                <li key={m.id}>
                  {showDay && <p className="my-3 text-center text-xs font-medium text-slate-400">{day}</p>}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%] ${
                        mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200'
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-1 text-right text-[11px] ${mine ? 'text-brand-100' : 'text-slate-400'}`}>
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
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
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
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base field-sizing-content focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50 sm:text-sm"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {sending ? <Spinner size="sm" className="text-white" /> : <SendIcon className="size-5" />}
        </button>
      </form>
    </div>
  );
}
