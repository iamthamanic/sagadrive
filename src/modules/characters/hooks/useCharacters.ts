import { useState, useEffect, useCallback } from 'react';
import { characterService } from '../services/character.service';
import type { CharacterVm, CreateCharacterDto, UpdateCharacterDto } from '../types/character.types';

interface UseCharactersReturn {
  characters: CharacterVm[];
  isLoading: boolean;
  error: string | null;
  createCharacter: (data: CreateCharacterDto) => Promise<CharacterVm | null>;
  updateCharacter: (id: string, data: UpdateCharacterDto) => Promise<CharacterVm | null>;
  deleteCharacter: (id: string) => Promise<boolean>;
  refreshCharacters: () => Promise<void>;
}

/**
 * Custom hook for managing characters
 * Handles loading, error states, and CRUD operations
 */
export function useCharacters(): UseCharactersReturn {
  const [characters, setCharacters] = useState<CharacterVm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await characterService.getUserCharacters();
      setCharacters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch characters');
      console.error('Error fetching characters:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const createCharacter = useCallback(async (data: CreateCharacterDto): Promise<CharacterVm | null> => {
    try {
      setError(null);
      const newCharacter = await characterService.createCharacter(data);
      setCharacters(prev => [newCharacter, ...prev]);
      return newCharacter;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character');
      console.error('Error creating character:', err);
      return null;
    }
  }, []);

  const updateCharacter = useCallback(async (
    id: string,
    data: UpdateCharacterDto
  ): Promise<CharacterVm | null> => {
    try {
      setError(null);
      const updated = await characterService.updateCharacter(id, data);
      setCharacters(prev => prev.map(char => char.id === id ? updated : char));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update character');
      console.error('Error updating character:', err);
      return null;
    }
  }, []);

  const deleteCharacter = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      await characterService.deleteCharacter(id);
      setCharacters(prev => prev.filter(char => char.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete character');
      console.error('Error deleting character:', err);
      return false;
    }
  }, []);

  return {
    characters,
    isLoading,
    error,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    refreshCharacters: fetchCharacters,
  };
}

/**
 * Hook for single character
 */
export function useCharacter(id: string | null) {
  const [character, setCharacter] = useState<CharacterVm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setCharacter(null);
      return;
    }

    const fetchCharacter = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await characterService.getCharacterById(id);
        setCharacter(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch character');
        console.error('Error fetching character:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacter();
  }, [id]);

  return { character, isLoading, error };
}
