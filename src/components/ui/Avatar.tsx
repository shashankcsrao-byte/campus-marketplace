import { initials } from '../../utils/format';

const SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl' };

export default function Avatar({ name, size = 'md' }: { name?: string | null; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );
}
