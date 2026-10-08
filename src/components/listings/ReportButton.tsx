import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { hasReported, reportListing } from '../../services/reportService';
import { LIMITS, REPORT_REASONS } from '../../utils/constants';
import { toUserMessage } from '../../utils/errorMessages';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { FlagIcon } from '../ui/Icons';
import type { ReportReason } from '../../types';

/** "Report listing" link + dialog. Hidden from the seller; logged-out users are sent to log in. */
export default function ReportButton({ listingId, sellerId }: { listingId: string; sellerId: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    hasReported(listingId)
      .then((r) => active && setReported(r))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [listingId, user]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (user?.id === sellerId) return null;

  const start = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setError(null);
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return setError('Choose a reason.');
    setSending(true);
    try {
      await reportListing(listingId, reason, details);
      setReported(true);
      setOpen(false);
      showToast('Thanks. We will review this listing.');
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={reported}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-slate-600 underline decoration-2 underline-offset-4 hover:text-red-700 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none disabled:cursor-default disabled:no-underline disabled:hover:text-slate-600"
      >
        <FlagIcon className="size-4" /> {reported ? 'You reported this listing' : 'Report listing'}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="report-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!sending) setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current && !sending) setOpen(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md animate-slide-in rounded-3xl border-2 border-ink bg-white p-0 shadow-pop-lg motion-reduce:animate-none"
      >
        <form onSubmit={submit} className="p-6" noValidate>
          <h2 id="report-title" className="flex items-center gap-2 text-xl font-bold text-ink">
            <FlagIcon className="size-5 text-red-700" /> Report this listing
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">The seller won't see who reported it.</p>

          <fieldset className="mt-4 space-y-2">
            <legend className="mb-1 text-sm font-bold text-ink">What's wrong?</legend>
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 text-sm font-semibold text-ink focus-within:ring-4 focus-within:ring-sun ${
                  reason === r.value ? 'border-ink bg-sun-soft' : 'border-slate-200 hover:border-ink'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => {
                    setReason(r.value);
                    setError(null);
                  }}
                  className="size-4 accent-brand-600"
                />
                {r.label}
              </label>
            ))}
          </fieldset>

          <div className="mt-4">
            <Textarea
              label="Details (optional)"
              rows={3}
              maxLength={LIMITS.reportDetailsMax}
              showCount
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything that helps us check it"
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={sending} loadingText="Sending...">
              Send report
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
