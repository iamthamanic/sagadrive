/**
 * character-service — Application facade over Supabase character repository.
 * Location: src/infrastructure/character/character-service.ts
 */
import type { CreateCharacterDto, UpdateCharacterDto } from '../../domains/character/contracts/character.commands';
import type { CharacterSummaryVm, CharacterVm } from '../../domains/character/contracts/character.views';
import { supabaseCharacterRepository } from './supabase-character.repository';

class CharacterService {
  getUserCharacterSummaries(): Promise<CharacterSummaryVm[]> {
    return supabaseCharacterRepository.getUserCharacterSummaries();
  }

  getUserCharacters(): Promise<CharacterVm[]> {
    return supabaseCharacterRepository.getUserCharacters();
  }

  getCharacterById(id: string): Promise<CharacterVm> {
    return supabaseCharacterRepository.getCharacterById(id);
  }

  createCharacter(payload: CreateCharacterDto): Promise<CharacterVm> {
    return supabaseCharacterRepository.createCharacter(payload);
  }

  updateCharacter(id: string, payload: UpdateCharacterDto): Promise<CharacterVm> {
    return supabaseCharacterRepository.updateCharacter(id, payload);
  }

  deleteCharacter(id: string): Promise<void> {
    return supabaseCharacterRepository.deleteCharacter(id);
  }

  searchCharacters(query: string): Promise<CharacterVm[]> {
    return supabaseCharacterRepository.searchCharacters(query);
  }

  uploadPortrait(file: File): Promise<string> {
    return supabaseCharacterRepository.uploadPortrait(file);
  }
}

export const characterService = new CharacterService();
