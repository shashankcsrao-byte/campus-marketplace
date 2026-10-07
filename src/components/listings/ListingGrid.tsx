import type { ReactNode } from 'react';

const GRID_CLASSES = 'stagger-children grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4';
// Next to the filter sidebar there's less room, so stop at 3 columns.
const GRID_WITH_SIDEBAR = 'stagger-children grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3';

const gridClass = (withSidebar?: boolean) => (withSidebar ? GRID_WITH_SIDEBAR : GRID_CLASSES);

export default function ListingGrid({ children, withSidebar }: { children: ReactNode; withSidebar?: boolean }) {
  return <div className={gridClass(withSidebar)}>{children}</div>;
}

export function ListingSkeleton({ count = 8, withSidebar }: { count?: number; withSidebar?: boolean }) {
  return (
    <div className={gridClass(withSidebar)} aria-busy="true" aria-label="Loading listings...">
      <span className="sr-only">Loading listings...</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card-pop overflow-hidden">
          <div className="aspect-[4/3] animate-pulse border-b-2 border-ink bg-brand-100 motion-reduce:animate-none" />
          <div className="space-y-3 p-4">
            <div className="h-6 w-1/3 animate-pulse rounded-full bg-sun-soft motion-reduce:animate-none" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
