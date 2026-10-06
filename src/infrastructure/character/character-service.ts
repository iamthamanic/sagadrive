/**
 * character-service — Application facade over Supabase character repository.
 * Location: src/infrastructure/character/character-service.ts
 */
import type { CreateCharacterDto, UpdateCharacterDto } from '../../domains/character/contracts/character.commands';
import type { CharacterSummaryVm, CharacterVm } from '../../domains/character/contracts/character.views';
import { migrateLegacyInventory } from '../../domains/character/inventory-v2';
import type { InventoryState } from '../../domains/character/inventory-v2';
import { assertPersonalLookOverrideWrite } from '../../domains/look';
import { ENTITY_CACHE_KEYS, entityCache } from '../../lib/entityCache';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';
import { persistMigratedInventory } from '../inventory/inventory-persistence';
import { getLookProfile } from '../look';
import { projectService } from '../project/project-service';
import { characterAdventureArcService } from './character-adventure-arc-service';
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

  getCharacterByPublicId(publicId: string): Promise<CharacterVm> {
    return supabaseCharacterRepository.getCharacterByPublicId(publicId);
  }

  async createCharacter(payload: CreateCharacterDto): Promise<CharacterVm> {
    const created = await supabaseCharacterRepository.createCharacter(payload);
    invalidateCharacterListCaches();
    return created;
  }

  async updateCharacter(id: string, payload: UpdateCharacterDto): Promise<CharacterVm> {
    if (payload.appearance && 'personal_look_profile_id' in payload.appearance) {
      await this.assertPersonalLookWriteGate(
        id,
        payload.appearance.personal_look_profile_id ?? null,
      );
    }
    const updated = await supabaseCharacterRepository.updateCharacter(id, payload);
    invalidateCharacterListCaches();
    return updated;
  }

  /**
   * Persist personal Look override only (#351). Null clears override (inherit world/saga).
   * DB trigger re-checks; this is the client fail-closed preflight.
   */
  async updateCharacterPersonalLook(
    characterId: string,
    personalLookProfileId: string | null,
  ): Promise<CharacterVm> {
    await this.assertPersonalLookWriteGate(characterId, personalLookProfileId);
    const current = await supabaseCharacterRepository.getCharacterById(characterId);
    const updated = await supabaseCharacterRepository.updateCharacter(characterId, {
      appearance: {
        ...current.appearance,
        personal_look_profile_id: personalLookProfileId,
      },
    });
    invalidateCharacterListCaches();
    return updated;
  }

  private async assertPersonalLookWriteGate(
    characterId: string,
    personalLookProfileId: string | null,
  ): Promise<void> {
    const actorUserId = await getAuthenticatedUserId();
    // Owner-scoped fetch — proves the actor can access this character.
    await supabaseCharacterRepository.getCharacterById(characterId);

    let sagaAllows = true;
    try {
      const arcs = await characterAdventureArcService.listArcsForCharacter(characterId);
      const activeArcs = arcs.filter((arc) => arc.status === 'active');
      for (const arc of activeArcs) {
        const project = await projectService.getProjectById(arc.projectId);
        if (!project.allowPlayerCharacterLookOverride) {
          sagaAllows = false;
          break;
        }
      }
    } catch {
      sagaAllows = true;
    }

    let lookOwnerUserId: string | null = null;
    let lookStatus: string | null = null;
    if (personalLookProfileId) {
      const record = await getLookProfile(personalLookProfileId);
      lookOwnerUserId = record?.profile.ownerId ?? null;
      lookStatus = record?.status ?? null;
    }

    const gate = assertPersonalLookOverrideWrite({
      // getCharacterById is owner-scoped — successful fetch implies actor owns the character.
      characterOwnerUserId: actorUserId,
      actorUserId,
      personalLookProfileId,
      lookOwnerUserId,
      lookStatus,
      sagaAllowsPlayerOverrides: sagaAllows,
    });
    if (!gate.ok) {
      throw new Error(gate.messageDe);
    }
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
