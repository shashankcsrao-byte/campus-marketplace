import type { Category } from '../utils/constants';

export type ListingStatus = 'available' | 'sold';

export interface Profile {
  id: string;
  name: string;
  campus: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  image_paths: string[];
  status: ListingStatus;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListingWithSeller extends Listing {
  seller: { name: string; campus: string | null } | null;
}

/** Fields the user can edit. seller_id / timestamps are set by the database. */
export interface ListingInput {
  title: string;
  description: string;
  price: number;
  category: Category;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type SortOption = 'newest' | 'price_asc' | 'price_desc';
export type StatusFilter = 'available' | 'sold' | 'all';

export interface ListingFilters {
  q: string;
  category: Category | '';
  min: string;
  max: string;
  status: StatusFilter;
  sort: SortOption;
}

export type ImageItem =
  | { kind: 'existing'; key: string; path: string }
  | { kind: 'new'; key: string; file: File; preview: string };

export interface LocationValue {
  location_name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface ChatSummary {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listing: Pick<Listing, 'id' | 'title' | 'image_paths' | 'status' | 'price'> | null;
  buyer: { name: string } | null;
  seller: { name: string } | null;
}
