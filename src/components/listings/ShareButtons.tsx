import { useToast } from '../../context/ToastContext';
import { formatPrice } from '../../utils/format';
import { PhoneIcon, ShareIcon } from '../ui/Icons';

const btn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-ink px-4 font-display text-sm font-semibold text-ink shadow-pop-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none motion-reduce:transform-none';

/** Native share sheet on phones (copy-link fallback elsewhere) plus a direct WhatsApp link. */
export default function ShareButtons({ title, price }: { title: string; price: number }) {
  const { showToast } = useToast();
  const url = window.location.origin + window.location.pathname;
  const text = `${title} for ${formatPrice(price)} on Campus Marketplace`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // Closing the share sheet throws AbortError: nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied. Paste it anywhere to share.', 'info');
    } catch {
      showToast("Couldn't copy the link. Copy it from the address bar instead.", 'error');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={share} className={`${btn} bg-white hover:bg-sky-soft`}>
        <ShareIcon className="size-4" /> Share
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} bg-mint-soft hover:bg-mint`}
      >
        <PhoneIcon className="size-4" /> WhatsApp
      </a>
    </div>
  );
}
