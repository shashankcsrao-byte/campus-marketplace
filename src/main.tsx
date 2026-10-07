import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

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
  Promise.all([
    import('react-router'),
    import('./App'),
    import('./context/ToastContext'),
    import('./context/AuthContext'),
    import('./context/FavoritesContext'),
  ]).then(([{ BrowserRouter }, { default: App }, { ToastProvider }, { AuthProvider }, { FavoritesProvider }]) => {
    root.render(
      <StrictMode>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </StrictMode>,
    );
  });
}
