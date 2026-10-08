import { supabase } from '../lib/supabase';
import { UUID_RE } from '../utils/format';
import { MESSAGE_PAGE_SIZE } from '../utils/constants';
import type { ChatSummary, Listing, Message } from '../types';

const CHAT_SELECT =
  'id, buyer_id, seller_id, last_message_at, listing:listings(id,title,image_paths,status,price),' +
  'buyer:profiles!chats_buyer_id_fkey(name), seller:profiles!chats_seller_id_fkey(name)';

/** Returns the existing chat for (listing, me) or creates it. Safe against double clicks. */
export async function getOrCreateChat(listing: Pick<Listing, 'id' | 'seller_id'>, me: string): Promise<string> {
  const find = () =>
    supabase.from('chats').select('id').eq('listing_id', listing.id).eq('buyer_id', me).maybeSingle();

  const existing = await find();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id as string;

  const { data, error } = await supabase
    .from('chats')
    .insert({ listing_id: listing.id, seller_id: listing.seller_id })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      const again = await find();
      if (again.data) return again.data.id as string;
    }
    throw error;
  }
  return data.id as string;
}

export async function getMyChats(): Promise<ChatSummary[]> {
  const { data, error } = await supabase
    .from('chats')
    .select(CHAT_SELECT)
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ChatSummary[];
}

export async function getChat(chatId: string): Promise<ChatSummary | null> {
  if (!UUID_RE.test(chatId)) return null;
  const { data, error } = await supabase.from('chats').select(CHAT_SELECT).eq('id', chatId).maybeSingle();
  if (error) throw error;
  return data as unknown as ChatSummary | null;
}

/** One page of messages, oldest first: the newest page, or the page before `before`. */
export async function getMessages(chatId: string, before?: string): Promise<Message[]> {
  let q = supabase.from('messages').select('*').eq('chat_id', chatId);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(MESSAGE_PAGE_SIZE);
  if (error) throw error;
  return ((data ?? []) as Message[]).reverse();
}

export async function sendMessage(chatId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, body: body.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

/** Unread message count per chat for the current user. */
export async function getUnreadCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('my_unread_counts');
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as { chat_id: string; unread: number }[]).map((r) => [r.chat_id, Number(r.unread)]));
}

/** Marks everything in a chat as read for the current user. */
export async function markChatRead(chatId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_chat_read', { p_chat_id: chatId });
  if (error) throw error;
}
