import { useState } from 'react';
import { getPublicUrl } from '../../services/storageService';
import { PhotoIcon } from '../ui/Icons';

/** Listing photo with a placeholder if there is no image or it fails to load. */
export default function ListingImage({
  path,
  alt,
  className = '',
  sold = false,
  eager = false,
  fit = 'cover',
}: {
  path?: string;
  alt: string;
  className?: string;
  sold?: boolean;
  eager?: boolean;
  fit?: 'cover' | 'contain';
}) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const soldCls = sold ? 'grayscale opacity-60' : '';

  if (!path || failedPath === path) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${soldCls} ${className}`} role="img" aria-label={alt}>
        <PhotoIcon className="size-10" />
      </div>
    );
  }
  return (
    <img
      src={getPublicUrl(path)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedPath(path)}
      className={`bg-slate-100 ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${soldCls} ${className}`}
    />
  );
}
