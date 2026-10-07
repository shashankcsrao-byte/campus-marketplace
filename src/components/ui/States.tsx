import type { ReactNode } from 'react';
import Button from './Button';
import { WarningIcon } from './Icons';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card-pop relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
      {/* decorative confetti blocks */}
      <span aria-hidden="true" className="absolute top-6 left-8 size-5 rotate-12 rounded-md border-2 border-ink bg-sun" />
      <span aria-hidden="true" className="absolute right-10 bottom-8 size-4 -rotate-12 rounded-full border-2 border-ink bg-bubblegum" />
      <span aria-hidden="true" className="absolute top-10 right-16 hidden size-3 rounded-sm border-2 border-ink bg-mint sm:block" />
      {icon && (
        <div className="mb-5 flex size-16 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-sun text-ink shadow-pop transition-transform hover:animate-wiggle">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm font-medium text-slate-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong. Try again.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="card-pop flex flex-col items-center justify-center !bg-red-50 px-6 py-12 text-center">
      <div className="mb-4 flex size-14 rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-red-400 text-ink shadow-pop">
        <WarningIcon className="size-7" />
      </div>
      <p className="font-display text-lg font-semibold text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
