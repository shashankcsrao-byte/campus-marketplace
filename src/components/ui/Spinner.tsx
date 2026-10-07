const SIZES = { sm: 'size-4 border-2', md: 'size-7 border-[3px]', lg: 'size-12 border-4' };

export default function Spinner({ size = 'md', className = '' }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-current border-r-transparent text-brand-600 motion-reduce:animate-[spin_1.5s_linear_infinite] ${SIZES[size]} ${className}`}
    />
  );
}

export function FullPageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-ink">
      <div className="card-pop flex size-20 items-center justify-center bg-sun">
        <Spinner size="lg" className="!text-ink" />
      </div>
      <p className="font-display text-base font-semibold">{label}</p>
    </div>
  );
}
