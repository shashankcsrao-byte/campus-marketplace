import { Link } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buttonClasses } from '../components/ui/Button';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-slate-500">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className={buttonClasses('primary', 'lg', 'mt-8')}>
        Back to marketplace
      </Link>
    </div>
  );
}
