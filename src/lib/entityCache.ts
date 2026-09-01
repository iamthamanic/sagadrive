/**
 * In-memory stale-while-revalidate cache for list summaries (Dashboard ↔ Bibliothek).
 * Location: src/lib/entityCache.ts
 */

const DEFAULT_STALE_MS = 30_000;

type CacheEntry = {
  data: unknown;
  fetchedAt: number;
};

const store = new Map<string, CacheEntry>();

export const entityCache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    return entry ? (entry.data as T) : null;
  },

  hasFresh(key: string, staleMs = DEFAULT_STALE_MS): boolean {
    const entry = store.get(key);
    if (!entry) return false;
    return Date.now() - entry.fetchedAt < staleMs;
  },

  set<T>(key: string, data: T): void {
    store.set(key, { data, fetchedAt: Date.now() });
  },

  invalidate(key: string): void {
    store.delete(key);
  },

  invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};

export const ENTITY_CACHE_KEYS = {
  characterSummaries: 'characters:summary',
  projectSummaries: 'projects:summary',
  worldSummaries: 'worlds:summary',
} as const;
