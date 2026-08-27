import { useEffect, useState } from 'react';
import { worldProfileService } from '../services/worldProfile.service';
import type { WorldProfileVm } from '../types/world.types';

export function useAccessibleWorldProfiles(worldProfileIds: string[]) {
  const key = Array.from(new Set(worldProfileIds.filter(Boolean))).sort().join(',');
  const [worlds, setWorlds] = useState<WorldProfileVm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) {
      setWorlds([]);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    void worldProfileService.getAccessibleWorldProfilesByIds(ids)
      .then((entries) => {
        if (active) setWorlds(entries);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Zugewiesene Welten konnten nicht geladen werden.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [key]);

  return { worlds, isLoading, error };
}
