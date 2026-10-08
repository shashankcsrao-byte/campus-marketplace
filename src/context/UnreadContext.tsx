import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getUnreadCounts, markChatRead } from '../services/chatService';

interface UnreadContextValue {
  /** Unread messages per chat id. Chats with nothing unread are absent. */
  counts: Record<string, number>;
  total: number;
  markRead: (chatId: string) => void;
}

const UnreadContext = createContext<UnreadContextValue | null>(null);

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeUser = useRef<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const forUser = activeUser.current;
    if (!forUser) return;
    try {
      const next = await getUnreadCounts();
      if (activeUser.current === forUser) setCounts(next);
    } catch (err) {
      console.warn('Could not load unread counts', err);
    }
  }, []);

  // Load on login, then follow new messages and read-marks live (RLS limits events to my chats).
  useEffect(() => {
    activeUser.current = userId;
    setCounts({});
    if (!userId) return;
    refresh();
    const schedule = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(refresh, 400);
    };
    const ch = supabase
      .channel(`unread:${userId}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, schedule)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats' }, schedule)
      .subscribe();
    return () => {
      clearTimeout(timer.current);
      supabase.removeChannel(ch);
    };
  }, [userId, refresh]);

  const markRead = useCallback(
    (chatId: string) => {
      setCounts((prev) => {
        if (!prev[chatId]) return prev;
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
      markChatRead(chatId)
        .catch((err) => console.warn('Could not mark chat read', err))
        .finally(refresh);
    },
    [refresh],
  );

  const value = useMemo(() => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total, markRead };
  }, [counts, markRead]);

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error('useUnread must be used inside <UnreadProvider>');
  return ctx;
}
