export default function SoldRibbon({ large = false }: { large?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className={`absolute rotate-45 bg-red-600 text-center font-extrabold tracking-[0.3em] text-white shadow-md ${
          large ? 'top-8 -right-14 w-56 py-2 text-base' : 'top-5 -right-11 w-40 py-1 text-xs'
        }`}
      >
        SOLD
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: 'available' | 'sold' }) {
  return status === 'sold' ? (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Sold</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      <span className="size-1.5 rounded-full bg-emerald-500" /> Available
    </span>
  );
}
