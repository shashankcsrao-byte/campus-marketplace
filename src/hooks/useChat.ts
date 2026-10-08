import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMessages, sendMessage } from '../services/chatService';
import { MESSAGE_PAGE_SIZE } from '../utils/constants';
import { toUserMessage } from '../utils/errorMessages';
import type { Message } from '../types';

const addUnique = (prev: Message[], m: Message) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]);

export function useChat(chatId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setMessages([]);
    setHasOlder(false);

    getMessages(chatId)
      .then((initial) => {
        if (!active) return;
        setHasOlder(initial.length === MESSAGE_PAGE_SIZE);
        // Merge in case a realtime message arrived before the initial load finished.
        setMessages((prev) => prev.reduce(addUnique, initial));
      })
      .catch((err) => active && setError(toUserMessage(err)))
      .finally(() => active && setLoading(false));

    const ch = supabase
      .channel(`chat:${chatId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        ({ new: m }) => setMessages((prev) => addUnique(prev, m as Message)),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [chatId, reloadKey]);

  /** Prepends the page of messages before the oldest one shown. */
  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!chatId || !oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await getMessages(chatId, oldest.created_at);
      setHasOlder(page.length === MESSAGE_PAGE_SIZE);
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...page.filter((m) => !known.has(m.id)), ...prev];
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, loadingOlder]);

  const send = useCallback(
    async (body: string) => {
      if (!chatId) return;
      const m = await sendMessage(chatId, body);
      setMessages((prev) => addUnique(prev, m)); // the realtime echo is de-duplicated
    },
    [chatId],
  );

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  return { messages, loading, error, send, retry, hasOlder, loadingOlder, loadOlder };
}
