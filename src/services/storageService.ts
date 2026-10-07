import { supabase } from '../lib/supabase';
import { LISTING_IMAGES_BUCKET } from '../utils/constants';
import { appError } from '../utils/errorMessages';

const MAX_DIMENSION = 1600;

/** Resizes to max 1600px and re-encodes as WebP (JPEG fallback for browsers without WebP encoding). */
export async function compressImage(file: File): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw appError('COMPRESS_FAILED');
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();

  const encode = (type: string, quality: number) =>
    new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(appError('COMPRESS_FAILED'))), type, quality),
    );

  const webp = await encode('image/webp', 0.82);
  // Older Safari silently returns PNG when WebP encoding is unsupported.
  return webp.type === 'image/webp' ? webp : encode('image/jpeg', 0.85);
}

/** Compresses and uploads files to `${userId}/${listingId}/...`. Cleans up on partial failure. */
export async function uploadListingImages(
  userId: string,
  listingId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const paths: string[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      onProgress?.(i + 1, files.length);
      const blob = await compressImage(files[i]);
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      const rand = Math.random().toString(36).slice(2, 8);
      const path = `${userId}/${listingId}/${i}-${Date.now()}-${rand}.${ext}`;
      const { error } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      if (error) throw error;
      paths.push(path);
    }
    return paths;
  } catch (err) {
    await removeImages(paths).catch(() => {});
    throw err;
  }
}

export async function removeImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(paths);
  if (error) throw error;
}

export function getPublicUrl(path: string): string {
  return supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}
