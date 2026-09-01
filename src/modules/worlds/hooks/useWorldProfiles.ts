import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ENTITY_CACHE_KEYS, entityCache } from '../../../lib/entityCache';
import { useCachedEntityList } from '../../../lib/useCachedEntityList';
import { worldProfileService } from '../services/worldProfile.service';
import type {
  CreateWorldProfileDto,
  UpdateWorldProfileDto,
  WorldProfileVm,
} from '../types/world.types';

interface UseWorldProfilesOptions {
  enabled?: boolean;
}

interface UseWorldProfilesReturn {
  worlds: WorldProfileVm[];
  isLoading: boolean;
  error: string | null;
  createWorld: (payload: CreateWorldProfileDto) => Promise<WorldProfileVm | null>;
  updateWorld: (id: string, payload: UpdateWorldProfileDto) => Promise<WorldProfileVm | null>;
  deleteWorld: (id: string) => Promise<boolean>;
  refreshWorlds: () => Promise<void>;
}

export function useWorldProfiles(options: UseWorldProfilesOptions = {}): UseWorldProfilesReturn {
  const { enabled = true } = options;
  const { user } = useAuth();

  const fetcher = useCallback(async () => {
    if (!user) return [] as WorldProfileVm[];
    return worldProfileService.getUserWorldProfiles(user.id);
  }, [user]);

  const { items, isLoading, error, refresh } = useCachedEntityList<WorldProfileVm[]>(
    ENTITY_CACHE_KEYS.worldSummaries,
    fetcher,
    [],
    { enabled: enabled && Boolean(user) },
  );

  useEffect(() => {
    if (!user) {
      entityCache.invalidate(ENTITY_CACHE_KEYS.worldSummaries);
    }
  }, [user]);

  const createWorld = useCallback(async (payload: CreateWorldProfileDto): Promise<WorldProfileVm | null> => {
    if (!user) {
      return null;
    }

    try {
      const world = await worldProfileService.createWorldProfile(user.id, payload);
      entityCache.invalidate(ENTITY_CACHE_KEYS.worldSummaries);
      await refresh();
      return world;
    } catch (err) {
      console.error('Error creating world:', err);
      return null;
    }
  }, [refresh, user]);

  const updateWorld = useCallback(async (
    id: string,
    payload: UpdateWorldProfileDto,
  ): Promise<WorldProfileVm | null> => {
    if (!user) {
      return null;
    }

    try {
      const world = await worldProfileService.updateWorldProfile(user.id, id, payload);
      entityCache.invalidate(ENTITY_CACHE_KEYS.worldSummaries);
      await refresh();
      return world;
    } catch (err) {
      console.error('Error updating world:', err);
      return null;
    }
  }, [refresh, user]);

  const deleteWorld = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      await worldProfileService.deleteWorldProfile(user.id, id);
      entityCache.invalidate(ENTITY_CACHE_KEYS.worldSummaries);
      await refresh();
      return true;
    } catch (err) {
      console.error('Error deleting world:', err);
      return false;
    }
  }, [refresh, user]);

  return {
    worlds: items,
    isLoading,
    error,
    createWorld,
    updateWorld,
    deleteWorld,
    refreshWorlds: refresh,
  };
}
