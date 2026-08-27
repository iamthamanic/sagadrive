import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { worldProfileService } from '../services/worldProfile.service';
import type {
  CreateWorldProfileDto,
  UpdateWorldProfileDto,
  WorldProfileVm,
} from '../types/world.types';

interface UseWorldProfilesReturn {
  worlds: WorldProfileVm[];
  isLoading: boolean;
  error: string | null;
  createWorld: (payload: CreateWorldProfileDto) => Promise<WorldProfileVm | null>;
  updateWorld: (id: string, payload: UpdateWorldProfileDto) => Promise<WorldProfileVm | null>;
  deleteWorld: (id: string) => Promise<boolean>;
  refreshWorlds: () => Promise<void>;
}

export function useWorldProfiles(): UseWorldProfilesReturn {
  const { user } = useAuth();
  const [worlds, setWorlds] = useState<WorldProfileVm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorlds = useCallback(async () => {
    if (!user) {
      setWorlds([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await worldProfileService.getUserWorldProfiles(user.id);
      setWorlds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Welten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchWorlds();
  }, [fetchWorlds]);

  const createWorld = useCallback(async (payload: CreateWorldProfileDto): Promise<WorldProfileVm | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const world = await worldProfileService.createWorldProfile(user.id, payload);
      setWorlds((current) => [world, ...current]);
      return world;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Welt konnte nicht erstellt werden.');
      return null;
    }
  }, [user]);

  const updateWorld = useCallback(async (
    id: string,
    payload: UpdateWorldProfileDto,
  ): Promise<WorldProfileVm | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const world = await worldProfileService.updateWorldProfile(user.id, id, payload);
      setWorlds((current) => current.map((entry) => entry.id === id ? world : entry));
      return world;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Welt konnte nicht gespeichert werden.');
      return null;
    }
  }, [user]);

  const deleteWorld = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      await worldProfileService.deleteWorldProfile(user.id, id);
      setWorlds((current) => current.filter((entry) => entry.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Welt konnte nicht gelöscht werden.');
      return false;
    }
  }, [user]);

  return {
    worlds,
    isLoading,
    error,
    createWorld,
    updateWorld,
    deleteWorld,
    refreshWorlds: fetchWorlds,
  };
}
