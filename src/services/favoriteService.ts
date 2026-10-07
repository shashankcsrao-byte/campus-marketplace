import { supabase } from '../lib/supabase';
import type { ListingWithSeller } from '../types';

export async function getFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from('favorites').select('listing_id');
  if (error) throw error;
  return (data ?? []).map((r) => r.listing_id as string);
}

export async function addFavorite(listingId: string): Promise<void> {
  const { error } = await supabase.from('favorites').insert({ listing_id: listingId });
  // 23505 = already favourited (e.g. a fast double click) → that's fine.
  if (error && error.code !== '23505') throw error;
}

export async function removeFavorite(listingId: string): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('listing_id', listingId);
  if (error) throw error;
}

export async function getFavoriteListings(): Promise<ListingWithSeller[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('created_at, listing:listings(*, seller:profiles!listings_seller_id_fkey(name, campus))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.listing as unknown as ListingWithSeller | null)
    .filter((l): l is ListingWithSeller => !!l);
}
