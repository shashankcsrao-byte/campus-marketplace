import { initials } from '../../utils/format';

const SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl' };

export default function Avatar({ name, size = 'md' }: { name?: string | null; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink bg-bubblegum font-display font-bold text-ink ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );
}
