import { Suspense, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import Navbar from '../components/Navbar';
import { FullPageSpinner } from '../components/ui/Spinner';
import { APP_NAME } from '../utils/constants';

export default function MainLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<FullPageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Built for students, by students.
          </p>
          <nav aria-label="Footer" className="flex gap-5">
            <Link to="/" className="hover:text-slate-800">
              Browse
            </Link>
            <Link to="/create" className="hover:text-slate-800">
              Sell an item
            </Link>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
              Map data © OSM
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
