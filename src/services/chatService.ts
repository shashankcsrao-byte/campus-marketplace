import { supabase } from '../lib/supabase';
import { UUID_RE } from '../utils/format';
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

/** The 50 most recent messages, oldest first. */
export async function getMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(50);
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
