import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError, reloadForNewVersion } from '../utils/chunkReload';
import { WarningIcon } from './ui/Icons';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render errors so one broken screen doesn't blank the whole app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // A page file that failed to download (network drop, or an older deployment): reload once.
    if (isChunkLoadError(error) && reloadForNewVersion()) return;
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const outdated = isChunkLoadError(this.state.error);
    return (
      <div role="alert" className="mx-auto my-16 max-w-md rounded-3xl border-2 border-ink bg-white p-8 text-center shadow-pop-lg">
        <span className="mx-auto mb-5 flex size-14 rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-red-300 text-ink shadow-pop">
          <WarningIcon className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-bold text-ink">{outdated ? "This page didn't load" : 'Something went wrong'}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {outdated
            ? 'Your connection may have dropped, or the site was just updated. Check your internet and reload.'
            : 'This page hit an unexpected error. Reloading usually fixes it.'}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink bg-brand-600 px-5 font-display text-sm font-semibold text-white shadow-pop-sm hover:bg-brand-700 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none"
          >
            Reload page
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink bg-white px-5 font-display text-sm font-semibold text-ink shadow-pop-sm hover:bg-sun-soft focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none"
          >
            Go to marketplace
          </a>
        </div>
      </div>
    );
  }
}
