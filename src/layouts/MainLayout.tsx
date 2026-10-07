import { Suspense, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import Navbar from '../components/Navbar';
import { FullPageSpinner } from '../components/ui/Spinner';
import { BagIcon } from '../components/ui/Icons';
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
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-xl focus:border-2 focus:border-ink focus:bg-sun focus:px-4 focus:py-2 focus:font-bold focus:shadow-pop"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<FullPageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="mt-10 border-t-2 border-ink bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 rotate-6 items-center justify-center rounded-xl border-2 border-white bg-sun text-ink">
              <BagIcon className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold">
                Campus<span className="text-sun">Mart</span>
              </p>
              <p className="text-sm text-white/75">
                © {new Date().getFullYear()} {APP_NAME}. Built for students, by students.
              </p>
            </div>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link to="/" className="rounded-full border-2 border-white/40 px-4 py-2 hover:border-sun hover:text-sun">
              Browse
            </Link>
            <Link to="/create" className="rounded-full border-2 border-white/40 px-4 py-2 hover:border-sun hover:text-sun">
              Sell an item
            </Link>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-2 border-white/40 px-4 py-2 hover:border-sun hover:text-sun"
            >
              Map data © OSM
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
