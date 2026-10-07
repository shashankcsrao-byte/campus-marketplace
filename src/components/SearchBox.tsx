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
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink" />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search books, cycles, laptops..."
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border-2 border-ink bg-white pr-11 pl-11 text-base font-semibold text-ink shadow-pop-sm transition-[box-shadow] duration-150 placeholder:font-medium placeholder:text-slate-500 focus:shadow-[4px_4px_0_0_#7c3aed] focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-transparent text-ink hover:border-ink hover:bg-sun"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </form>
  );
}
