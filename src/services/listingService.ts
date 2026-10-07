import { supabase } from '../lib/supabase';
import { appError } from '../utils/errorMessages';
import { UUID_RE } from '../utils/format';
import { removeImages, uploadListingImages } from './storageService';
import type {
  ImageItem,
  Listing,
  ListingFilters,
  ListingInput,
  ListingStatus,
  ListingWithSeller,
} from '../types';

const WITH_SELLER = '*, seller:profiles!listings_seller_id_fkey(name, campus)';

/** Characters that would break PostgREST's .or() syntax or act as wildcards. */
export const sanitizeSearch = (s: string) => s.replace(/[,()%_\\*"]/g, ' ').replace(/\s+/g, ' ').trim();

export async function getListings(
  filters: ListingFilters,
  from: number,
  to: number,
): Promise<{ data: ListingWithSeller[]; count: number }> {
  let q = supabase.from('listings').select(WITH_SELLER, { count: 'exact' });

  const s = sanitizeSearch(filters.q);
  if (s) q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
  if (filters.category) q = q.eq('category', filters.category);
  if (filters.min) q = q.gte('price', Number(filters.min));
  if (filters.max) q = q.lte('price', Number(filters.max));
  if (filters.status !== 'all') q = q.eq('status', filters.status);

  q =
    filters.sort === 'price_asc'
      ? q.order('price', { ascending: true })
      : filters.sort === 'price_desc'
        ? q.order('price', { ascending: false })
        : q.order('created_at', { ascending: false });
  q = q.order('id'); // stable pagination when values tie

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { data: (data ?? []) as ListingWithSeller[], count: count ?? 0 };
}

export async function getListing(id: string): Promise<ListingWithSeller | null> {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase.from('listings').select(WITH_SELLER).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ListingWithSeller | null;
}

export async function getMyListings(userId: string): Promise<ListingWithSeller[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(WITH_SELLER)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ListingWithSeller[];
}

/** Uploads images first, then inserts the row. Removes the uploads if the insert fails. */
export async function createListing(
  userId: string,
  input: ListingInput,
  files: File[],
  onProgress?: (label: string) => void,
): Promise<Listing> {
  const id = crypto.randomUUID();
  const paths = await uploadListingImages(userId, id, files, (done, total) =>
    onProgress?.(`Uploading images (${done}/${total})...`),
  );
  onProgress?.('Publishing...');
  // seller_id is filled in by the database (default auth.uid()).
  const { data, error } = await supabase
    .from('listings')
    .insert({ id, ...input, image_paths: paths })
    .select()
    .single();
  if (error) {
    await removeImages(paths).catch(() => {});
    throw error;
  }
  return data as Listing;
}

/** RLS reports a refused update as "0 rows", so we turn that into NOT_ALLOWED. */
export async function updateListing(
  id: string,
  fields: Partial<ListingInput> & { image_paths?: string[]; status?: ListingStatus },
): Promise<ListingWithSeller> {
  const { data, error } = await supabase.from('listings').update(fields).eq('id', id).select(WITH_SELLER);
  if (error) throw error;
  if (!data?.length) throw appError('NOT_ALLOWED');
  return data[0] as ListingWithSeller;
}

/** Edit flow: upload new images → update row → delete removed images. */
export async function saveListingEdits(
  listing: Listing,
  input: ListingInput,
  images: ImageItem[],
  onProgress?: (label: string) => void,
): Promise<ListingWithSeller> {
  const newFiles = images.flatMap((img) => (img.kind === 'new' ? [img.file] : []));
  const uploaded = newFiles.length
    ? await uploadListingImages(listing.seller_id, listing.id, newFiles, (done, total) =>
        onProgress?.(`Uploading images (${done}/${total})...`),
      )
    : [];

  let u = 0;
  const finalPaths = images.map((img) => (img.kind === 'existing' ? img.path : uploaded[u++]));

  onProgress?.('Saving...');
  let updated: ListingWithSeller;
  try {
    updated = await updateListing(listing.id, { ...input, image_paths: finalPaths });
  } catch (err) {
    await removeImages(uploaded).catch(() => {});
    throw err;
  }

  const removed = listing.image_paths.filter((p) => !finalPaths.includes(p));
  removeImages(removed).catch((err) => console.warn('Could not remove old images', err));
  return updated;
}

export const markSold = (id: string) => updateListing(id, { status: 'sold' });
export const markAvailable = (id: string) => updateListing(id, { status: 'available' });

export async function deleteListing(listing: Pick<Listing, 'id' | 'image_paths'>): Promise<void> {
  const { data, error } = await supabase.from('listings').delete().eq('id', listing.id).select('id');
  if (error) throw error;
  if (data?.length !== 1) throw appError('NOT_ALLOWED');
  // The row is gone; failing to clean files is not the user's problem.
  removeImages(listing.image_paths).catch((err) => console.warn('Could not remove images', err));
}
