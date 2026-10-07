import { useEffect, useId, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useDebounce } from '../hooks/useDebounce';
import { applyFilterPatch } from '../utils/filters';
import { SearchIcon, XIcon } from './ui/Icons';

/** Navbar search, synced with the `q` URL param. Live (debounced) on the home page, submit elsewhere. */
export default function SearchBox({ className = '', onSubmitted }: { className?: string; onSubmitted?: () => void }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const urlQ = onHome ? (params.get('q') ?? '') : '';

  const inputId = useId();
  const [value, setValue] = useState(urlQ);
  const debounced = useDebounce(value, 300);

  // URL → input (e.g. "Clear filters", back button)
  useEffect(() => {
    setValue((v) => (v.trim() === urlQ ? v : urlQ));
  }, [urlQ]);

  // input → URL, only after the user stops typing
  useEffect(() => {
    if (!onHome || debounced.trim() === urlQ) return;
    setParams((p) => applyFilterPatch(p, { q: debounced.trim() }), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
    onSubmitted?.();
  };

  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Search listings
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-400" />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search books, cycles, laptops..."
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-slate-200 bg-slate-100 pr-10 pl-10 text-base text-slate-900 transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </form>
  );
}
