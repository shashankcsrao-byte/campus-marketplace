import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getMyChats } from '../services/chatService';
import { toUserMessage } from '../utils/errorMessages';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import Spinner from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { buttonClasses } from '../components/ui/Button';
import { ChatIcon } from '../components/ui/Icons';
import type { ChatSummary } from '../types';

export default function Messages() {
  useDocumentTitle('Messages');
  const { chatId } = useParams();
  const { user } = useAuth();
  const me = user!.id;
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (background = false) => {
    if (!background) setError(null);
    try {
      setChats(await getMyChats());
    } catch (err) {
      if (!background) setError(toUserMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-load the list when a chat is created or bumped by a new message.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const ch = supabase
      .channel(`my-chats:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => load(true), 300);
      })
      .subscribe();
    return () => {
      clearTimeout(timer.current);
      supabase.removeChannel(ch);
    };
  }, [load]);

  // A chat just created may not be in the list yet.
  useEffect(() => {
    if (chatId && chats && !chats.some((c) => c.id === chatId)) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const list = error ? (
    <div className="p-4"><ErrorState message={error} onRetry={() => load()} /></div>
  ) : chats === null ? (
    <div className="flex justify-center p-10"><Spinner /></div>
  ) : chats.length === 0 ? (
    <div className="p-4">
      <EmptyState
        icon={<ChatIcon className="size-7" />}
        title="No conversations yet"
        description="Find something you like and tap “Contact Seller” to start chatting."
        action={<Link to="/" className={buttonClasses()}>Browse listings</Link>}
      />
    </div>
  ) : (
    <ChatList chats={chats} me={me} activeId={chatId} />
  );

  return (
    <div>
      <h1 className={`mb-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl ${chatId ? 'hidden lg:block' : ''}`}>Messages</h1>
      <div className="grid h-[calc(100dvh-13rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:h-[calc(100dvh-12rem)] lg:grid-cols-[340px_1fr]">
        {/* List: always on desktop, only without an open chat on mobile */}
        <aside aria-label="Conversations" className={`min-h-0 overflow-y-auto border-slate-200 lg:block lg:border-r ${chatId ? 'hidden' : 'block'}`}>
          {list}
        </aside>
        <section aria-label="Conversation" className={`min-h-0 ${chatId ? 'block' : 'hidden lg:block'}`}>
          {chatId ? (
            <ChatWindow key={chatId} chatId={chatId} me={me} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500">
              <ChatIcon className="mb-3 size-10 text-slate-300" />
              <p className="font-medium text-slate-700">Select a conversation</p>
              <p className="mt-1 text-sm">Choose a chat from the list to start messaging.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
