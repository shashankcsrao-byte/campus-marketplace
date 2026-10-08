import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getListings } from '../services/listingService';
import { PAGE_SIZE } from '../utils/constants';
import { toUserMessage } from '../utils/errorMessages';
import type { ListingFilters, ListingWithSeller } from '../types';

/** Appends rows, skipping any already shown (offsets can shift when listings are added). */
const appendUnique = (prev: ListingWithSeller[], next: ListingWithSeller[]) => {
  const seen = new Set(prev.map((l) => l.id));
  return [...prev, ...next.filter((l) => !seen.has(l.id))];
};

/**
 * Paginated marketplace feed with live updates.
 * "Load more" fetches only the next page. Any insert/update/delete on `listings`
 * re-runs the rows currently on screen after a 500 ms pause.
 */
export function useListings(filters: ListingFilters) {
  const key = JSON.stringify(filters);
  const [items, setItems] = useState<ListingWithSeller[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersRef = useRef(filters);
  const sizeRef = useRef(0); // how many rows the feed has asked for so far
  const versionRef = useRef(0); // bumps on filter change / retry; older responses are ignored

  const loadFirstPage = useCallback(async () => {
    const version = ++versionRef.current;
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await getListings(filtersRef.current, 0, PAGE_SIZE - 1);
      if (version !== versionRef.current) return;
      sizeRef.current = PAGE_SIZE;
      setItems(data);
      setCount(count);
    } catch (err) {
      if (version === versionRef.current) setError(toUserMessage(err));
    } finally {
      if (version === versionRef.current) setLoading(false);
    }
  }, []);

  // Any filter change → back to page 1.
  useEffect(() => {
    filtersRef.current = JSON.parse(key) as ListingFilters;
    loadFirstPage();
  }, [key, loadFirstPage]);

  const loadMore = useCallback(async () => {
    const version = versionRef.current;
    const from = sizeRef.current;
    setLoadingMore(true);
    try {
      const { data, count } = await getListings(filtersRef.current, from, from + PAGE_SIZE - 1);
      if (version !== versionRef.current) return;
      sizeRef.current = from + PAGE_SIZE;
      setItems((prev) => appendUnique(prev, data));
      setCount(count);
      setError(null);
    } catch (err) {
      if (version === versionRef.current) setError(toUserMessage(err));
    } finally {
      if (version === versionRef.current) setLoadingMore(false);
    }
  }, []);

  // Realtime: one channel per mount, removed on cleanup (unique name avoids StrictMode collisions).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refreshVisible = async () => {
      const version = versionRef.current;
      const size = sizeRef.current;
      if (!size) return;
      try {
        const { data, count } = await getListings(filtersRef.current, 0, size - 1);
        // Skip if the filters changed or "Load more" ran meanwhile.
        if (version !== versionRef.current || size !== sizeRef.current) return;
        setItems(data);
        setCount(count);
      } catch {
        // Background refresh: keep showing what we have.
      }
    };
    const ch = supabase
      .channel(`listings-feed-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        clearTimeout(timer);
        timer = setTimeout(refreshVisible, 500);
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, []);

  const hasMore = count !== null && items.length < count;
  return { items, count, loading, loadingMore, error, hasMore, loadMore, retry: loadFirstPage };
}
