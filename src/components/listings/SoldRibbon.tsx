/** Rubber-stamp "SOLD" over the photo. */
export default function SoldRibbon({ large = false }: { large?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div
        className={`-rotate-12 rounded-xl border-4 border-red-600 bg-white/85 font-display font-bold tracking-[0.2em] text-red-600 shadow-[3px_3px_0_0_#dc2626] ${
          large ? 'px-6 py-2 text-4xl' : 'px-3 py-1 text-xl'
        }`}
      >
        SOLD!
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: 'available' | 'sold' }) {
  return status === 'sold' ? (
    <span className="inline-flex items-center rounded-full border-2 border-ink bg-red-300 px-2.5 py-0.5 text-xs font-bold text-ink">Sold</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mint px-2.5 py-0.5 text-xs font-bold text-ink">
      <span className="size-2 rounded-full border border-ink bg-white" /> Available
    </span>
  );
}
