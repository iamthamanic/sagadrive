/**
 * Cached character summaries for Bibliothek/Dashboard list views.
 * Location: src/modules/characters/hooks/useCharacterSummaries.ts
 */

import { useCallback } from 'react';
import { ENTITY_CACHE_KEYS, entityCache } from '../../../lib/entityCache';
import { useCachedEntityList } from '../../../lib/useCachedEntityList';
import { characterService } from '../services/character.service';
import type { CharacterSummaryVm } from '../types/character.types';

interface UseCharacterSummariesOptions {
  enabled?: boolean;
}

export function useCharacterSummaries(options: UseCharacterSummariesOptions = {}) {
  const { enabled = true } = options;

  const fetcher = useCallback(() => characterService.getUserCharacterSummaries(), []);

  const { items, isLoading, error, refresh } = useCachedEntityList<CharacterSummaryVm[]>(
    ENTITY_CACHE_KEYS.characterSummaries,
    fetcher,
    [],
    { enabled },
  );

  const deleteCharacter = useCallback(async (id: string): Promise<boolean> => {
    try {
      await characterService.deleteCharacter(id);
      entityCache.invalidate(ENTITY_CACHE_KEYS.characterSummaries);
      await refresh({ force: true });
      return true;
    } catch (err) {
      console.error('Error deleting character:', err);
      return false;
    }
  }, [refresh]);

  return {
    characters: items,
    isLoading,
    error,
    deleteCharacter,
    refreshCharacters: refresh,
  };
}
