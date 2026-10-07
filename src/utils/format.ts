const priceFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const shortDateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const relFmt = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });

export const formatPrice = (n: number) => priceFmt.format(n);
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

export function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
  if (abs < 3600) return relFmt.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relFmt.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return relFmt.format(Math.round(seconds / 86400), 'day');
  return formatDate(iso);
}

/** Chat list timestamp: time today, otherwise short date. */
export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString() ? formatTime(iso) : shortDateFmt.format(d);
}

export const initials = (name?: string | null) =>
  (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

export const osmUrl = (lat: number, lon: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
