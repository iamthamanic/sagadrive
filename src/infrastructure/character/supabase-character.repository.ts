/**
 * supabase-character.repository — Supabase persistence adapter for characters.
 * Location: src/infrastructure/character/supabase-character.repository.ts
 */
import { supabase } from '../../lib/supabase';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';
import { raceWithTimeoutReject, SUPABASE_QUERY_TIMEOUT_MS } from '../../lib/networkTimeout';
import { normalizeCharacterAppearance } from '../../modules/characters/avatar';
import type { CreateCharacterDto, UpdateCharacterDto } from '../../domains/character/contracts/character.commands';
import type { CharacterSummaryVm, CharacterVm } from '../../domains/character/contracts/character.views';
import { assertValidSagaDriveCharacterPersistence } from '../../domains/character/use-cases/assert-character-persistence';
import {
  normalizeAttributes,
  normalizeInventory,
  normalizeSagaDriveProfile,
  normalizeSkills,
  normalizeTextBlocks,
} from '../../domains/character/use-cases/normalize-character';
import type { CharacterDto } from './character.persistence';
import {
  assertWritableInventoryV2,
  readCharacterInventory,
} from '../inventory/inventory-persistence';

const CHARACTER_PORTRAIT_BUCKET = 'character-portraits';
const CHARACTER_PORTRAIT_MAX_BYTES = 5 * 1024 * 1024;
const CHARACTER_PORTRAIT_MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export class SupabaseCharacterRepository {
  private readonly tableName = 'characters';

  mapToViewModel(dto: CharacterDto): CharacterVm {
    const rulesetKey = dto.ruleset_key === 'dnd-5.5e' ? 'dnd-5.5e' : 'sagadrive-core';
    const inventoryRead = readCharacterInventory(dto);
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      class: dto.class,
      race: dto.race,
      rulesetKey,
      dndBackground: rulesetKey === 'dnd-5.5e' && typeof dto.dnd_background === 'string' ? dto.dnd_background : undefined,
      level: dto.level,
      backgroundStory: dto.background_story,
      notes: typeof dto.notes === 'string' ? dto.notes : '',
      personalityTraits: normalizeTextBlocks(dto.personality_traits),
      ideals: normalizeTextBlocks(dto.ideals),
      bonds: normalizeTextBlocks(dto.bonds),
      flaws: normalizeTextBlocks(dto.flaws),
      appearance: normalizeCharacterAppearance(dto.appearance),
      attributes: normalizeAttributes(dto.attributes),
      skills: normalizeSkills(dto.skills),
      sagaDriveProfile: normalizeSagaDriveProfile(dto.sagadrive_profile),
      abilities: dto.abilities || [],
      inventory: normalizeInventory(dto.inventory),
      inventoryV2: inventoryRead.state,
      inventorySchemaVersion: inventoryRead.authoritativeV2 ? 2 : 1,
      emotionProfiles: dto.emotion_profiles || [],
      portraitUrl: dto.portrait_url || undefined,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
    };
  }

  async getUserCharacterSummaries(): Promise<CharacterSummaryVm[]> {
    const userId = await getAuthenticatedUserId();
    const { data, error } = await raceWithTimeoutReject(
      supabase
        .from(this.tableName)
        .select('id, name, class, race, level, portrait_url')
        .eq('owner_user_id', userId)
        .eq('character_type', 'pc')
        .order('created_at', { ascending: false }),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Failed to fetch characters: request timed out',
    );
    if (error) throw new Error(`Failed to fetch characters: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: typeof row.name === 'string' ? row.name : '',
      class: typeof row.class === 'string' ? row.class : '',
      race: typeof row.race === 'string' ? row.race : '',
      level: typeof row.level === 'number' ? row.level : 1,
      portraitUrl: typeof row.portrait_url === 'string' ? row.portrait_url : undefined,
    }));
  }

  async getUserCharacters(): Promise<CharacterVm[]> {
    const userId = await getAuthenticatedUserId();
    const { data, error } = await raceWithTimeoutReject(
      supabase.from(this.tableName).select('*').eq('owner_user_id', userId).eq('character_type', 'pc').order('created_at', { ascending: false }),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Failed to fetch characters: request timed out',
    );
    if (error) throw new Error(`Failed to fetch characters: ${error.message}`);
    return (data || []).map((character) => this.mapToViewModel(character as CharacterDto));
  }

  async getCharacterById(id: string): Promise<CharacterVm> {
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).eq('owner_user_id', userId).single();
    if (error) throw new Error(`Failed to fetch character: ${error.message}`);
    if (!data) throw new Error('Character not found');
    return this.mapToViewModel(data as CharacterDto);
  }

  async createCharacter(payload: CreateCharacterDto): Promise<CharacterVm> {
    const userId = await getAuthenticatedUserId();
    const rulesetKey = payload.ruleset_key ?? 'sagadrive-core';
    const attributes = normalizeAttributes(payload.attributes);
    const level = payload.level || 1;
    const sagadriveProfile = rulesetKey === 'sagadrive-core' ? normalizeSagaDriveProfile(payload.sagadrive_profile) : null;
    const skills = normalizeSkills(payload.skills);
    if (sagadriveProfile) assertValidSagaDriveCharacterPersistence(attributes, skills, sagadriveProfile, level);
    const inventoryV2 = payload.inventory_v2
      ? await assertWritableInventoryV2(payload.inventory_v2, null)
      : undefined;
    const characterData: Partial<CharacterDto> = {
      owner_user_id: userId,
      character_type: 'pc',
      name: payload.name,
      description: payload.description,
      class: payload.class,
      race: payload.race,
      ruleset_key: rulesetKey,
      dnd_background: rulesetKey === 'dnd-5.5e' ? payload.dnd_background ?? null : null,
      level,
      background_story: payload.background_story,
      notes: payload.notes?.trim() || null,
      personality_traits: payload.personality_traits,
      ideals: payload.ideals,
      bonds: payload.bonds,
      flaws: payload.flaws,
      appearance: normalizeCharacterAppearance(payload.appearance),
      attributes,
      skills: normalizeSkills(payload.skills),
      sagadrive_profile: sagadriveProfile,
      abilities: payload.abilities ?? [],
      inventory: normalizeInventory(payload.inventory),
      ...(inventoryV2
        ? { inventory_v2: inventoryV2, inventory_schema_version: 2 as const }
        : { inventory_schema_version: 1 as const }),
      emotion_profiles: [],
      portrait_url: payload.portrait_url || undefined,
    };
    const { data, error } = await supabase.from(this.tableName).insert(characterData).select().single();
    if (error) throw new Error(`Failed to create character: ${error.message}`);
    return this.mapToViewModel(data as CharacterDto);
  }

  async updateCharacter(id: string, payload: UpdateCharacterDto): Promise<CharacterVm> {
    const userId = await getAuthenticatedUserId();
    const rulesetPatch = payload.ruleset_key
      ? { ruleset_key: payload.ruleset_key, dnd_background: payload.ruleset_key === 'dnd-5.5e' ? payload.dnd_background ?? null : null }
      : {};
    const attributes = payload.attributes ? normalizeAttributes(payload.attributes) : undefined;
    const sagadriveProfile = payload.sagadrive_profile ? normalizeSagaDriveProfile(payload.sagadrive_profile) : undefined;
    // Any SagaDrive-relevant field in the patch triggers validation of the full
    // effective future state (patch values merged over the stored character).
    const touchesSagaDriveState = Boolean(
      payload.attributes
        || payload.skills
        || payload.sagadrive_profile
        || typeof payload.level === 'number'
        || payload.ruleset_key,
    );
    if (touchesSagaDriveState) {
      // Loaded exactly once; owner-scoped, so foreign characters stay unreachable.
      const existing = await this.getCharacterById(id);
      const effectiveRuleset = payload.ruleset_key ?? existing.rulesetKey;
      if (effectiveRuleset === 'sagadrive-core') {
        assertValidSagaDriveCharacterPersistence(
          attributes ?? existing.attributes,
          payload.skills ? normalizeSkills(payload.skills) : existing.skills,
          sagadriveProfile ?? existing.sagaDriveProfile,
          typeof payload.level === 'number' ? payload.level : existing.level,
        );
      }
    }
    const {
      inventory_v2: inventoryV2Patch,
      inventory: inventoryPatch,
      // Callers must not flip the marker without a validated inventory_v2 write.
      inventory_schema_version: _ignoredSchemaVersion,
      ...safePayload
    } = payload as UpdateCharacterDto & { inventory_schema_version?: 1 | 2 };

    const inventoryV2 = inventoryV2Patch
      ? await assertWritableInventoryV2(inventoryV2Patch, id)
      : undefined;

    const updatePayload = {
      ...safePayload,
      ...rulesetPatch,
      ...(payload.appearance ? { appearance: normalizeCharacterAppearance(payload.appearance) } : {}),
      ...(attributes ? { attributes } : {}),
      ...(payload.skills ? { skills: normalizeSkills(payload.skills) } : {}),
      ...(sagadriveProfile ? { sagadrive_profile: sagadriveProfile } : {}),
      ...(inventoryPatch ? { inventory: normalizeInventory(inventoryPatch) } : {}),
      ...(inventoryV2
        ? { inventory_v2: inventoryV2, inventory_schema_version: 2 as const }
        : {}),
      ...(typeof payload.notes === 'string' ? { notes: payload.notes.trim() || null } : {}),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from(this.tableName).update(updatePayload).eq('id', id).eq('owner_user_id', userId).select().single();
    if (error) throw new Error(`Failed to update character: ${error.message}`);
    return this.mapToViewModel(data as CharacterDto);
  }

  async deleteCharacter(id: string): Promise<void> {
    const userId = await getAuthenticatedUserId();
    const { error } = await supabase.from(this.tableName).delete().eq('id', id).eq('owner_user_id', userId);
    if (error) throw new Error(`Failed to delete character: ${error.message}`);
  }

  async searchCharacters(query: string): Promise<CharacterVm[]> {
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase.from(this.tableName).select('*').eq('owner_user_id', userId).eq('character_type', 'pc').ilike('name', `%${query}%`).order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to search characters: ${error.message}`);
    return (data || []).map((character) => this.mapToViewModel(character as CharacterDto));
  }

  async uploadPortrait(file: File): Promise<string> {
    const userId = await getAuthenticatedUserId();
    const extension = CHARACTER_PORTRAIT_MIME_EXTENSIONS[file.type];
    if (!extension) throw new Error('Invalid file type. Only PNG, JPEG, WEBP and GIF images are allowed.');
    if (file.size > CHARACTER_PORTRAIT_MAX_BYTES) throw new Error('File too large. Maximum size is 5MB.');
    const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(CHARACTER_PORTRAIT_BUCKET).upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(`Failed to upload portrait: ${uploadError.message}`);
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(CHARACTER_PORTRAIT_BUCKET).createSignedUrl(filePath, 31_536_000);
    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(signedUrlError ? `Failed to create portrait URL: ${signedUrlError.message}` : 'Failed to create portrait URL');
    }
    return signedUrlData.signedUrl;
  }
}

export const supabaseCharacterRepository = new SupabaseCharacterRepository();
