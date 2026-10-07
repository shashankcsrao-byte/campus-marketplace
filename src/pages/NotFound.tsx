import { Link } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buttonClasses } from '../components/ui/Button';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <p aria-hidden="true" className="flex gap-2 font-display text-7xl font-bold text-ink sm:text-8xl">
        <span className="-rotate-6 rounded-2xl border-2 border-ink bg-sun px-3 shadow-pop">4</span>
        <span className="rotate-3 rounded-2xl border-2 border-ink bg-bubblegum px-3 shadow-pop">0</span>
        <span className="-rotate-3 rounded-2xl border-2 border-ink bg-sky px-3 shadow-pop">4</span>
      </p>
      <h1 className="mt-8 text-3xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm font-medium text-slate-600">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className={buttonClasses('primary', 'lg', 'mt-8')}>
        Back to marketplace
      </Link>
    </div>
  );
}
