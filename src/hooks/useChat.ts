import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMessages, sendMessage } from '../services/chatService';
import { toUserMessage } from '../utils/errorMessages';
import type { Message } from '../types';

const addUnique = (prev: Message[], m: Message) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]);

export function useChat(chatId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!chatId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setMessages([]);

    getMessages(chatId)
      .then((initial) => {
        if (!active) return;
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

  const send = useCallback(
    async (body: string) => {
      if (!chatId) return;
      const m = await sendMessage(chatId, body);
      setMessages((prev) => addUnique(prev, m)); // the realtime echo is de-duplicated
    },
    [chatId],
  );

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  return { messages, loading, error, send, retry };
}
