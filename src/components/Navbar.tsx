import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFavorites } from '../context/FavoritesContext';
import { useUnread } from '../context/UnreadContext';
import SearchBox from './SearchBox';
import Avatar from './ui/Avatar';
import { buttonClasses } from './ui/Button';
import { BagIcon, ChatIcon, HeartIcon, ListIcon, LogoutIcon, MenuIcon, PlusIcon, UserIcon, XIcon } from './ui/Icons';
import { APP_NAME } from '../utils/constants';
import { toUserMessage } from '../utils/errorMessages';

/** Red count bubble for unread messages. */
function UnreadBadge({ count, className = '' }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={`inline-flex min-w-5 items-center justify-center rounded-full border-2 border-ink bg-red-500 px-1 text-[11px] leading-4 font-bold text-white tabular-nums ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 font-display text-sm font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none ${
    isActive ? 'border-ink bg-sun text-ink shadow-pop-sm' : 'border-transparent text-ink hover:border-ink hover:bg-white'
  }`;

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { ids: favoriteIds } = useFavorites();
  const { total: unread } = useUnread();
  const unreadLabel = unread ? `, ${unread} unread` : '';
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
    <header data-sc-shot-fixed className="sticky top-0 z-40 border-b-2 border-ink bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
        <Link to="/" className="group flex shrink-0 items-center gap-2 rounded-xl focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none" aria-label={`${APP_NAME} home`}>
          <span className="flex size-10 -rotate-6 items-center justify-center rounded-xl border-2 border-ink bg-sun text-ink shadow-pop-sm transition-transform group-hover:rotate-6 motion-reduce:transition-none">
            <BagIcon className="size-5" />
          </span>
          <span className="hidden font-display text-xl font-bold tracking-tight text-ink sm:inline">
            Campus<span className="text-brand-600">Mart</span>
          </span>
        </Link>

        <SearchBox className="hidden flex-1 md:block md:max-w-md lg:max-w-lg" />

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <NavLink to="/messages" className={navLinkClass} aria-label={`Messages${unreadLabel}`}>
                <ChatIcon /> <span className="hidden lg:inline">Messages</span>
                <UnreadBadge count={unread} />
              </NavLink>
              <NavLink to="/favourites" className={navLinkClass}>
                <HeartIcon /> <span className="hidden lg:inline">Favourites</span>
                <span className="sr-only lg:hidden">Favourites</span>
                {favoriteIds.size > 0 && (
                  <span className="rounded-full border-2 border-ink bg-bubblegum px-1.5 text-xs font-bold text-ink">{favoriteIds.size}</span>
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
                  className="flex min-h-11 items-center rounded-full p-0.5 transition-transform hover:-rotate-6 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none motion-reduce:transition-none"
                >
                  <Avatar name={displayName} />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 mt-3 w-64 animate-slide-in overflow-hidden rounded-2xl border-2 border-ink bg-white py-1 shadow-pop motion-reduce:animate-none">
                    <div className="mx-1 mb-1 rounded-xl bg-sun-soft px-4 py-3">
                      <p className="truncate font-display text-base font-bold text-ink">{profile?.name ?? 'Student'}</p>
                      <p className="truncate text-xs font-medium text-slate-600">{user.email}</p>
                    </div>
                    <MenuItem to="/my-listings" icon={<ListIcon className="size-4" />}>My Listings</MenuItem>
                    <MenuItem to="/profile" icon={<UserIcon className="size-4" />}>Profile</MenuItem>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-3 border-t-2 border-dashed border-slate-200 px-4 py-3 text-left text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
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
          aria-label={mobileOpen ? 'Close menu' : `Open menu${unreadLabel}`}
          className="relative ml-auto flex size-11 items-center justify-center rounded-xl border-2 border-ink bg-white text-ink shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none md:hidden"
        >
          {mobileOpen ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
          {!mobileOpen && <UnreadBadge count={unread} className="absolute -top-2 -right-2" />}
        </button>
      </div>

      {/* Mobile search always visible under the bar */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBox onSubmitted={() => setMobileOpen(false)} />
      </div>

      {mobileOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="animate-fade-in border-t-2 border-ink bg-cream px-4 py-4 motion-reduce:animate-none md:hidden">
          {user ? (
            <div className="flex flex-col gap-1">
              <div className="card-pop mb-3 flex items-center gap-3 !bg-sun-soft px-3 py-3">
                <Avatar name={displayName} />
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold">{profile?.name ?? 'Student'}</p>
                  <p className="truncate text-xs font-medium text-slate-600">{user.email}</p>
                </div>
              </div>
              <Link to="/create" className={buttonClasses('primary', 'md', 'mb-2')}>
                <PlusIcon className="size-4" /> Sell an item
              </Link>
              <NavLink to="/messages" className={navLinkClass} aria-label={`Messages${unreadLabel}`}>
                <ChatIcon /> Messages <UnreadBadge count={unread} />
              </NavLink>
              <NavLink to="/favourites" className={navLinkClass}><HeartIcon /> Favourites</NavLink>
              <NavLink to="/my-listings" className={navLinkClass}><ListIcon /> My Listings</NavLink>
              <NavLink to="/profile" className={navLinkClass}><UserIcon /> Profile</NavLink>
              <button type="button" onClick={handleLogout} className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-transparent px-3 font-display text-sm font-semibold text-red-700 hover:border-red-700 hover:bg-red-50">
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
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
    >
      <span className="text-brand-600">{icon}</span>
      {children}
    </Link>
  );
}
