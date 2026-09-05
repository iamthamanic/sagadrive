/**
 * character-service — Application facade over Supabase character repository.
 * Location: src/infrastructure/character/character-service.ts
 */
import type { CreateCharacterDto, UpdateCharacterDto } from '../../domains/character/contracts/character.commands';
import type { CharacterSummaryVm, CharacterVm } from '../../domains/character/contracts/character.views';
import { migrateLegacyInventory } from '../../domains/character/inventory-v2';
import type { InventoryState } from '../../domains/character/inventory-v2';
import { ENTITY_CACHE_KEYS, entityCache } from '../../lib/entityCache';
import { persistMigratedInventory } from '../inventory/inventory-persistence';
import { supabaseCharacterRepository } from './supabase-character.repository';

function invalidateCharacterListCaches(): void {
  entityCache.invalidate(ENTITY_CACHE_KEYS.characterSummaries);
}

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

  async createCharacter(payload: CreateCharacterDto): Promise<CharacterVm> {
    const created = await supabaseCharacterRepository.createCharacter(payload);
    invalidateCharacterListCaches();
    return created;
  }

  async updateCharacter(id: string, payload: UpdateCharacterDto): Promise<CharacterVm> {
    const updated = await supabaseCharacterRepository.updateCharacter(id, payload);
    invalidateCharacterListCaches();
    return updated;
  }

  /**
   * One-shot migration of a character's legacy ItemDto[] into Inventory v2.
   * Creates Personal definitions first, then persists inventory_v2 and flips
   * inventory_schema_version to 2. Idempotent when already on schema 2.
   */
  async migrateCharacterInventoryToV2(characterId: string): Promise<InventoryState> {
    const character = await supabaseCharacterRepository.getCharacterById(characterId);
    if (character.inventorySchemaVersion === 2) {
      return character.inventoryV2;
    }
    const migration = migrateLegacyInventory(character.inventory);
    const state = await persistMigratedInventory(characterId, migration);
    invalidateCharacterListCaches();
    return state;
  }

  async deleteCharacter(id: string): Promise<void> {
    await supabaseCharacterRepository.deleteCharacter(id);
    invalidateCharacterListCaches();
  }

  searchCharacters(query: string): Promise<CharacterVm[]> {
    return supabaseCharacterRepository.searchCharacters(query);
  }

  uploadPortrait(file: File): Promise<string> {
    return supabaseCharacterRepository.uploadPortrait(file);
  }
}

export const characterService = new CharacterService();
