import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FALLBACK_LISTINGS,
  type Listing,
  type ListingsCache,
} from '../lib/sahibinden';

export type ListingsStatus =
  | { state: 'loading' }
  | { state: 'live'; updatedAt: string; count: number }
  | { state: 'fallback'; reason: string };

const CACHE_URL = '/ilanlar.json';
const POLL_MS = 5 * 60 * 1000; // 5 dakikada bir tazele

export function useListings() {
  const [listings, setListings] = useState<Listing[]>(FALLBACK_LISTINGS);
  const [status, setStatus] = useState<ListingsStatus>({ state: 'loading' });
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${CACHE_URL}?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ListingsCache;
      if (Array.isArray(data.listings) && data.listings.length > 0) {
        setListings(data.listings);
        setStatus({
          state: 'live',
          updatedAt: data.updatedAt,
          count: data.listings.length,
        });
      } else {
        setListings(FALLBACK_LISTINGS);
        setStatus({
          state: 'fallback',
          reason: 'önbellek boş — örnek ilanlar gösteriliyor',
        });
      }
    } catch (e) {
      setListings(FALLBACK_LISTINGS);
      setStatus({
        state: 'fallback',
        reason:
          e instanceof Error ? e.message : 'ilanlar.json okunamadı',
      });
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = window.setInterval(load, POLL_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [load]);

  return { listings, status, refresh: load };
}
