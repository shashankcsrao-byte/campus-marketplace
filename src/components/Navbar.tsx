import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFavorites } from '../context/FavoritesContext';
import SearchBox from './SearchBox';
import Avatar from './ui/Avatar';
import { buttonClasses } from './ui/Button';
import { BagIcon, ChatIcon, HeartIcon, ListIcon, LogoutIcon, MenuIcon, PlusIcon, UserIcon, XIcon } from './ui/Icons';
import { APP_NAME } from '../utils/constants';
import { toUserMessage } from '../utils/errorMessages';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { ids: favoriteIds } = useFavorites();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on navigation
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Close the avatar menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('You have been logged out.', 'info');
      navigate('/');
    } catch (err) {
      showToast(toUserMessage(err), 'error');
    }
  };

  const displayName = profile?.name ?? user?.email ?? '';
  const loginHref = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" aria-label={`${APP_NAME} home`}>
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <BagIcon className="size-5" />
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-slate-900 sm:inline">
            Campus<span className="text-brand-600">Mart</span>
          </span>
        </Link>

        <SearchBox className="hidden flex-1 md:block md:max-w-md lg:max-w-lg" />

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <NavLink to="/messages" className={navLinkClass}>
                <ChatIcon /> <span className="hidden lg:inline">Messages</span>
                <span className="sr-only lg:hidden">Messages</span>
              </NavLink>
              <NavLink to="/favourites" className={navLinkClass}>
                <HeartIcon /> <span className="hidden lg:inline">Favourites</span>
                <span className="sr-only lg:hidden">Favourites</span>
                {favoriteIds.size > 0 && (
                  <span className="rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">{favoriteIds.size}</span>
                )}
              </NavLink>
              <Link to="/create" className={buttonClasses('primary', 'md', 'ml-2')}>
                <PlusIcon className="size-4" /> Sell
              </Link>
              <div className="relative ml-2" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  className="flex min-h-11 items-center rounded-full p-0.5 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                >
                  <Avatar name={displayName} />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-60 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl motion-reduce:animate-none">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">{profile?.name ?? 'Student'}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <MenuItem to="/my-listings" icon={<ListIcon className="size-4" />}>My Listings</MenuItem>
                    <MenuItem to="/profile" icon={<UserIcon className="size-4" />}>Profile</MenuItem>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
                    >
                      <LogoutIcon className="size-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to={loginHref} className={buttonClasses('ghost')}>
                Login
              </Link>
              <Link to="/register" className={buttonClasses('primary')}>
                Register
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          className="ml-auto flex size-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none md:hidden"
        >
          {mobileOpen ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </button>
      </div>

      {/* Mobile search always visible under the bar */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBox onSubmitted={() => setMobileOpen(false)} />
      </div>

      {mobileOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="animate-fade-in border-t border-slate-200 bg-white px-4 py-3 motion-reduce:animate-none md:hidden">
          {user ? (
            <div className="flex flex-col gap-1">
              <div className="mb-2 flex items-center gap-3 px-3 py-2">
                <Avatar name={displayName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{profile?.name ?? 'Student'}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <Link to="/create" className={buttonClasses('primary', 'md', 'mb-2')}>
                <PlusIcon className="size-4" /> Sell an item
              </Link>
              <NavLink to="/messages" className={navLinkClass}><ChatIcon /> Messages</NavLink>
              <NavLink to="/favourites" className={navLinkClass}><HeartIcon /> Favourites</NavLink>
              <NavLink to="/my-listings" className={navLinkClass}><ListIcon /> My Listings</NavLink>
              <NavLink to="/profile" className={navLinkClass}><UserIcon /> Profile</NavLink>
              <button type="button" onClick={handleLogout} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50">
                <LogoutIcon /> Logout
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link to={loginHref} className={buttonClasses('secondary')}>Login</Link>
              <Link to="/register" className={buttonClasses('primary')}>Register</Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}

function MenuItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      <span className="text-slate-400">{icon}</span>
      {children}
    </Link>
  );
}
