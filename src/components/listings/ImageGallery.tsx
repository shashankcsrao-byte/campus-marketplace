import { useState } from 'react';
import ListingImage from './ListingImage';
import SoldRibbon from './SoldRibbon';

export default function ImageGallery({ paths, title, sold }: { paths: string[]; title: string; sold: boolean }) {
  const [index, setIndex] = useState(0);
  const current = paths[Math.min(index, paths.length - 1)];

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <ListingImage path={current} alt={title} sold={sold} eager fit="contain" className="size-full" />
        {sold && <SoldRibbon large />}
        {paths.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white">
            {index + 1} / {paths.length}
          </span>
        )}
      </div>
      {paths.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Photos">
          {paths.map((p, i) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition sm:size-20 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${
                i === index ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <ListingImage path={p} alt={`${title} photo ${i + 1}`} className="size-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
