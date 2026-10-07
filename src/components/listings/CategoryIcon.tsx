import type { Category } from '../../utils/constants';
import {
  BikeIcon,
  BookIcon,
  CapIcon,
  ChairIcon,
  ComputerIcon,
  CubeIcon,
  HomeIcon,
  ShirtIcon,
  SparklesIcon,
  TrophyIcon,
} from '../ui/Icons';

// Each category gets its own SVG icon + pop colour (ink text on every tint for 4.5:1+).
const ICONS: Record<Category, (p: { className?: string }) => React.ReactElement> = {
  Electronics: ComputerIcon,
  Books: BookIcon,
  Furniture: ChairIcon,
  Vehicles: BikeIcon,
  Clothing: ShirtIcon,
  Accessories: SparklesIcon,
  Sports: TrophyIcon,
  'Hostel Essentials': HomeIcon,
  Academic: CapIcon,
  Other: CubeIcon,
};

// eslint-disable-next-line react-refresh/only-export-components
export const CATEGORY_TINT: Record<Category, string> = {
  Electronics: 'bg-sky',
  Books: 'bg-sun',
  Furniture: 'bg-tangerine',
  Vehicles: 'bg-mint',
  Clothing: 'bg-bubblegum',
  Accessories: 'bg-brand-300',
  Sports: 'bg-mint',
  'Hostel Essentials': 'bg-sky',
  Academic: 'bg-sun',
  Other: 'bg-bubblegum-soft',
};

export default function CategoryIcon({ category, className = 'size-4' }: { category: Category; className?: string }) {
  const Icon = ICONS[category] ?? CubeIcon;
  return <Icon className={className} />;
}

/** Small category sticker: coloured pill with icon + label. */
export function CategoryTag({ category, className = '' }: { category: Category; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold text-ink ${CATEGORY_TINT[category]} ${className}`}
    >
      <CategoryIcon category={category} className="size-3.5" />
      {category}
    </span>
  );
}
