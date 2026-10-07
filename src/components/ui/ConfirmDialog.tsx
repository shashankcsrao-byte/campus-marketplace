import { useEffect, useRef } from 'react';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Native <dialog>: focus trapping and Escape handling for free. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  loadingLabel,
  loading = false,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !loading) onCancel(); // backdrop click
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md animate-slide-in rounded-3xl border-2 border-ink bg-white p-0 shadow-pop-lg motion-reduce:animate-none"
    >
      <div className="p-6">
        <div aria-hidden="true" className={`mb-4 flex size-12 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink text-2xl font-bold shadow-pop-sm ${danger ? 'bg-red-400' : 'bg-sun'}`}>
          !
        </div>
        <h2 id="confirm-title" className="text-xl font-bold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-700">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={loading} autoFocus>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} loadingText={loadingLabel}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
