/**
 * Hook for cached entity lists with stale-while-revalidate semantics.
 * Location: src/lib/useCachedEntityList.ts
 */

import { useCallback, useEffect, useState } from 'react';
import { entityCache } from './entityCache';

interface UseCachedEntityListOptions {
  enabled?: boolean;
}

interface UseCachedEntityListResult<T> {
  items: T;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCachedEntityList<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  initialValue: T,
  options: UseCachedEntityListOptions = {},
): UseCachedEntityListResult<T> {
  const { enabled = true } = options;
  const cached = entityCache.get<T>(cacheKey);

  const [items, setItems] = useState<T>(cached ?? initialValue);
  const [isLoading, setIsLoading] = useState(enabled && !entityCache.hasFresh(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    const fresh = entityCache.hasFresh(cacheKey);
    const existing = entityCache.get<T>(cacheKey);
    if (existing) {
      setItems(existing);
      if (fresh) {
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(!existing);
      setError(null);
      const data = await fetcher();
      entityCache.set(cacheKey, data);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, enabled, fetcher]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return { items, isLoading, error, refresh };
}
