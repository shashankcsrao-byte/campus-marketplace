import { useState } from 'react';
import ListingImage from './ListingImage';
import SoldRibbon from './SoldRibbon';

export default function ImageGallery({ paths, title, sold }: { paths: string[]; title: string; sold: boolean }) {
  const [index, setIndex] = useState(0);
  const current = paths[Math.min(index, paths.length - 1)];

  return (
    <div>
      <div className="card-pop relative aspect-[4/3] overflow-hidden !bg-brand-50">
        <ListingImage path={current} alt={title} sold={sold} eager fit="contain" className="size-full" />
        {sold && <SoldRibbon large />}
        {paths.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-bold text-ink shadow-pop-sm">
            {index + 1} / {paths.length}
          </span>
        )}
      </div>
      {paths.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto p-1 pb-2 scrollbar-none" role="tablist" aria-label="Photos">
          {paths.map((p, i) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 border-ink transition-[transform,box-shadow] sm:size-20 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none ${
                i === index ? '-rotate-3 shadow-pop ring-4 ring-brand-500' : 'opacity-75 hover:-translate-y-0.5 hover:opacity-100'
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
