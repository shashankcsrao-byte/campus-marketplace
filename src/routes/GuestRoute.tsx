import { Navigate, Outlet, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { FullPageSpinner } from '../components/ui/Spinner';

/** Only allow internal paths, so ?redirect= can't send users to another site. */
// eslint-disable-next-line react-refresh/only-export-components
export function safeRedirect(value: string | null): string {
  // Browsers treat a backslash like "/", so "/\evil.com" would also leave the site.
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

/** Login / Register: logged-in users are sent on to where they were going. */
export default function GuestRoute() {
  const { user, initializing } = useAuth();
  const [params] = useSearchParams();
  if (initializing) return <FullPageSpinner />;
  if (user) return <Navigate to={safeRedirect(params.get('redirect'))} replace />;
  return <Outlet />;
}
