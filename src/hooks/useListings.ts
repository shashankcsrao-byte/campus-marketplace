import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getListings } from '../services/listingService';
import { PAGE_SIZE } from '../utils/constants';
import { toUserMessage } from '../utils/errorMessages';
import type { ListingFilters, ListingWithSeller } from '../types';

/**
 * Paginated marketplace feed with live updates.
 * Any insert/update/delete on `listings` re-runs the current query after a 500 ms pause.
 */
export function useListings(filters: ListingFilters) {
  const key = JSON.stringify(filters);
  const [items, setItems] = useState<ListingWithSeller[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersRef = useRef(filters);
  const sizeRef = useRef(PAGE_SIZE); // how many rows are currently loaded
  const requestRef = useRef(0); // ignore responses from stale requests

  /** Fetches rows 0..size-1 for the current filters. */
  const fetchRows = useCallback(async (size: number, mode: 'initial' | 'more' | 'background') => {
    const id = ++requestRef.current;
    if (mode === 'initial') {
      setLoading(true);
      setError(null);
    }
    if (mode === 'more') setLoadingMore(true);
    try {
      const { data, count } = await getListings(filtersRef.current, 0, size - 1);
      if (id !== requestRef.current) return;
      sizeRef.current = size;
      setItems(data);
      setCount(count);
      setError(null);
    } catch (err) {
      if (id !== requestRef.current) return;
      if (mode === 'initial') setError(toUserMessage(err));
      else if (mode === 'more') setError(toUserMessage(err));
    } finally {
      if (id === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Any filter change → back to page 1.
  useEffect(() => {
    filtersRef.current = JSON.parse(key) as ListingFilters;
    fetchRows(PAGE_SIZE, 'initial');
  }, [key, fetchRows]);

  // Realtime: one channel per mount, removed on cleanup (unique name avoids StrictMode collisions).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchRows(sizeRef.current, 'background'), 500);
    };
    const ch = supabase
      .channel(`listings-feed-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, scheduleRefetch)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [fetchRows]);

  const loadMore = useCallback(() => fetchRows(sizeRef.current + PAGE_SIZE, 'more'), [fetchRows]);
  const retry = useCallback(() => fetchRows(PAGE_SIZE, 'initial'), [fetchRows]);

  const hasMore = count !== null && items.length < count;
  return { items, count, loading, loadingMore, error, hasMore, loadMore, retry };
}
