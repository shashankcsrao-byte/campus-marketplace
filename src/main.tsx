import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { reloadForNewVersion } from './utils/chunkReload';

const root = createRoot(document.getElementById('root')!);

// Check config before loading the app, so a missing .env shows a clear message instead of a blank page.
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  root.render(
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div role="alert" className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-red-700">Missing Supabase env vars. Copy .env.example to .env</h1>
        <p className="mt-3 text-sm text-slate-600">
          Fill in <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> from Supabase → Project Settings → API,
          then restart <code className="rounded bg-slate-100 px-1">npm run dev</code>.
        </p>
      </div>
    </div>,
  );
} else {
  // After a redeploy, files from the old version are gone: reload once to get the new one.
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });

  Promise.all([
    import('react-router'),
    import('./App'),
    import('./context/ToastContext'),
    import('./context/AuthContext'),
    import('./context/FavoritesContext'),
    import('./context/UnreadContext'),
  ])
    .then(([{ BrowserRouter }, { default: App }, { ToastProvider }, { AuthProvider }, { FavoritesProvider }, { UnreadProvider }]) => {
      root.render(
        <StrictMode>
          <ErrorBoundary>
            <ToastProvider>
              <AuthProvider>
                <FavoritesProvider>
                  <UnreadProvider>
                    <BrowserRouter>
                      <App />
                    </BrowserRouter>
                  </UnreadProvider>
                </FavoritesProvider>
              </AuthProvider>
            </ToastProvider>
          </ErrorBoundary>
        </StrictMode>,
      );
    })
    .catch((err) => {
      if (reloadForNewVersion()) return;
      console.error(err);
      root.render(
        <ErrorBoundary>
          <Crash error={err} />
        </ErrorBoundary>,
      );
    });
}

function Crash({ error }: { error: unknown }): never {
  throw error;
}
