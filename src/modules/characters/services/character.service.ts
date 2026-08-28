import { supabase } from '../../../lib/supabase';
import { isLocalAdminSession, LOCAL_ADMIN_USER_ID } from '../../../lib/localAdmin';
import {
  createEmptySagaDriveSkillRanks,
  isSagaDriveArchetypeKey,
  isSagaDriveEssenceKey,
  isSagaDriveSkillKey,
  isSagaDriveSpeciesTraitKey,
  sagaDriveSkillDefinitions,
  type SagaDriveSkillKey,
  type SagaDriveSpeciesTraitKey,
} from '../../rulesets/characterCreation';
import {
  getSagaDriveSpeciesTraitOptionCatalog,
  normalizeSagaDriveSpeciesTraitOptionKey,
} from '../../rulesets/speciesTraitOptions';
import { normalizeCharacterAppearance } from '../avatar';
import type {
  CharacterAttributeStorageDto,
  CharacterAttributesDto,
  CharacterDto,
  CharacterVm,
  CreateCharacterDto,
  ItemDto,
  SagaDriveBackgroundDto,
  SagaDriveProfileDto,
  SagaDriveSpeciesProfileDto,
  SagaDriveSpeciesTraitDetailsDto,
  SagaDriveSpeciesTraitInstanceDto,
  UpdateCharacterDto,
} from '../types/character.types';

const CHARACTER_PORTRAIT_BUCKET = 'character-portraits';
const CHARACTER_PORTRAIT_MAX_BYTES = 5 * 1024 * 1024;
const CHARACTER_PORTRAIT_MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const DEFAULT_ATTRIBUTES: CharacterAttributesDto = { strength: 4, dexterity: 3, endurance: 3, mind: 2, perception: 2, charisma: 1 };

function createEmptyBackground(): SagaDriveBackgroundDto {
  return { name: '', skillPool: [], trainedSkills: [], milieuAccess: '', contact: '', complication: '', communication: '' };
}

function createDefaultSagaDriveProfile(): SagaDriveProfileDto {
  return { speciesTraitInstances: [], background: createEmptyBackground(), drive: 3, momentum: 0 };
}

function clampInteger(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Math.round(value))); }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAttributes(value?: CharacterAttributeStorageDto): CharacterAttributesDto {
  return {
    strength: typeof value?.strength === 'number' ? value.strength : DEFAULT_ATTRIBUTES.strength,
    dexterity: typeof value?.dexterity === 'number' ? value.dexterity : DEFAULT_ATTRIBUTES.dexterity,
    endurance: typeof value?.endurance === 'number' ? value.endurance : typeof value?.constitution === 'number' ? value.constitution : DEFAULT_ATTRIBUTES.endurance,
    mind: typeof value?.mind === 'number' ? value.mind : typeof value?.intelligence === 'number' ? value.intelligence : DEFAULT_ATTRIBUTES.mind,
    perception: typeof value?.perception === 'number' ? value.perception : typeof value?.wisdom === 'number' ? value.wisdom : DEFAULT_ATTRIBUTES.perception,
    charisma: typeof value?.charisma === 'number' ? value.charisma : DEFAULT_ATTRIBUTES.charisma,
  };
}

function normalizeSkills(value?: Partial<Record<SagaDriveSkillKey, number>>): Record<SagaDriveSkillKey, number> {
  const result = createEmptySagaDriveSkillRanks();
  for (const skill of sagaDriveSkillDefinitions) {
    const rank = value?.[skill.key];
    if (typeof rank === 'number') result[skill.key] = clampInteger(rank, 0, 5);
  }
  return result;
}

function normalizeSagaDriveBackground(value?: Partial<SagaDriveBackgroundDto>): SagaDriveBackgroundDto {
  const skillPool = Array.isArray(value?.skillPool) ? value.skillPool.filter(isSagaDriveSkillKey).slice(0, 4) : [];
  const trainedSkills = Array.isArray(value?.trainedSkills) ? value.trainedSkills.filter((skill) => isSagaDriveSkillKey(skill) && skillPool.includes(skill)).slice(0, 2) : [];
  const specialization = value?.specialization && isSagaDriveSkillKey(value.specialization.skill) && typeof value.specialization.name === 'string' ? { skill: value.specialization.skill, name: value.specialization.name.trim() } : undefined;
  return {
    name: typeof value?.name === 'string' ? value.name : '',
    skillPool,
    trainedSkills,
    specialization,
    milieuAccess: typeof value?.milieuAccess === 'string' ? value.milieuAccess : '',
    contact: typeof value?.contact === 'string' ? value.contact : '',
    complication: typeof value?.complication === 'string' ? value.complication : '',
    communication: typeof value?.communication === 'string' ? value.communication : '',
  };
}

function normalizeSpeciesTraitDetails(value: unknown): SagaDriveSpeciesTraitDetailsDto {
  if (!isRecord(value)) return {};
  const result: SagaDriveSpeciesTraitDetailsDto = {};
  for (const [key, detail] of Object.entries(value)) {
    if (!isSagaDriveSpeciesTraitKey(key) || typeof detail !== 'string') continue;
    const normalized = detail.trim();
    if (normalized) result[key] = normalized;
  }
  return result;
}

function normalizeLegacySpeciesTraitInstances(
  traits: unknown,
  details: unknown,
): SagaDriveSpeciesTraitInstanceDto[] {
  if (!Array.isArray(traits)) return [];
  const normalizedDetails = normalizeSpeciesTraitDetails(details);
  const result: SagaDriveSpeciesTraitInstanceDto[] = [];

  for (const trait of traits) {
    if (!isSagaDriveSpeciesTraitKey(trait)) continue;
    const detail = normalizedDetails[trait];
    const option = detail ? normalizeSagaDriveSpeciesTraitOptionKey(trait, detail) : undefined;
    result.push({
      trait,
      ...(option ? { option } : detail ? { legacyDetail: detail } : {}),
      source: 'species-creation',
      acquiredAtLevel: 1,
    });
  }

  return result;
}

function normalizeSpeciesTraitInstances(
  value: unknown,
  legacyTraits: unknown,
  legacyDetails: unknown,
): SagaDriveSpeciesTraitInstanceDto[] {
  const candidates: SagaDriveSpeciesTraitInstanceDto[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!isRecord(entry) || typeof entry.trait !== 'string' || !isSagaDriveSpeciesTraitKey(entry.trait)) continue;
      const trait = entry.trait;
      const rawOption = typeof entry.option === 'string' ? entry.option : '';
      const option = rawOption ? normalizeSagaDriveSpeciesTraitOptionKey(trait, rawOption) : undefined;
      const legacyDetail = typeof entry.legacyDetail === 'string' ? entry.legacyDetail.trim() : '';
      candidates.push({
        trait,
        ...(option ? { option } : legacyDetail ? { legacyDetail } : {}),
        source: 'species-creation',
        acquiredAtLevel: typeof entry.acquiredAtLevel === 'number' ? clampInteger(entry.acquiredAtLevel, 1, 20) : 1,
      });
    }
  } else {
    candidates.push(...normalizeLegacySpeciesTraitInstances(legacyTraits, legacyDetails));
  }

  const result: SagaDriveSpeciesTraitInstanceDto[] = [];
  for (const candidate of candidates) {
    const repeatable = Boolean(getSagaDriveSpeciesTraitOptionCatalog(candidate.trait));
    if (!repeatable && result.some((entry) => entry.trait === candidate.trait)) continue;
    if (candidate.option && result.some((entry) => entry.trait === candidate.trait && entry.option === candidate.option)) continue;
    if (!candidate.option && !candidate.legacyDetail && repeatable && result.some((entry) => entry.trait === candidate.trait && !entry.option && !entry.legacyDetail)) continue;
    result.push(candidate);
  }
  return result;
}

function normalizeSpeciesProfile(value: unknown): SagaDriveSpeciesProfileDto | undefined {
  if (!isRecord(value)) return undefined;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return undefined;
  return {
    name,
    bodyDescription: typeof value.bodyDescription === 'string' ? value.bodyDescription.trim() : '',
  };
}

function normalizeSagaDriveProfile(value?: Partial<SagaDriveProfileDto> | null): SagaDriveProfileDto {
  return {
    archetype: value?.archetype && isSagaDriveArchetypeKey(value.archetype) ? value.archetype : undefined,
    essence: value?.essence && isSagaDriveEssenceKey(value.essence) ? value.essence : undefined,
    speciesTraitInstances: normalizeSpeciesTraitInstances(value?.speciesTraitInstances, value?.speciesTraits, value?.speciesTraitDetails),
    speciesProfile: normalizeSpeciesProfile(value?.speciesProfile),
    background: normalizeSagaDriveBackground(value?.background),
    archetypeTrainingSkill: value?.archetypeTrainingSkill && isSagaDriveSkillKey(value.archetypeTrainingSkill) ? value.archetypeTrainingSkill : undefined,
    drive: typeof value?.drive === 'number' ? clampInteger(value.drive, 0, 5) : 3,
    momentum: typeof value?.momentum === 'number' ? clampInteger(value.momentum, 0, 3) : 0,
  };
}

function normalizeInventory(items?: ItemDto[]): ItemDto[] {
  return (items ?? []).map((item) => ({ ...item, quantity: Math.max(1, Math.round(item.quantity || 1)), load: item.load ?? 1, traits: item.traits ?? [] }));
}

class CharacterService {
  private readonly tableName = 'characters';

  private normalizeTextBlocks(value: unknown): string[] {
    if (Array.isArray(value)) return Array.from(new Set(value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)));
    if (typeof value === 'string') { const normalized = value.trim(); return normalized ? [normalized] : []; }
    return [];
  }

  private mapToViewModel(dto: CharacterDto): CharacterVm {
    const rulesetKey = dto.ruleset_key === 'dnd-5.5e' ? 'dnd-5.5e' : 'sagadrive-core';
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
      personalityTraits: this.normalizeTextBlocks(dto.personality_traits),
      ideals: this.normalizeTextBlocks(dto.ideals),
      bonds: this.normalizeTextBlocks(dto.bonds),
      flaws: this.normalizeTextBlocks(dto.flaws),
      appearance: normalizeCharacterAppearance(dto.appearance),
      attributes: normalizeAttributes(dto.attributes),
      skills: normalizeSkills(dto.skills),
      sagaDriveProfile: normalizeSagaDriveProfile(dto.sagadrive_profile),
      abilities: dto.abilities || [],
      inventory: normalizeInventory(dto.inventory),
      emotionProfiles: dto.emotion_profiles || [],
      portraitUrl: dto.portrait_url || undefined,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
    };
  }

  private async getAuthenticatedUserId(): Promise<string> {
    if (isLocalAdminSession()) {
      return LOCAL_ADMIN_USER_ID;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
  }

  async getUserCharacters(): Promise<CharacterVm[]> {
    const userId = await this.getAuthenticatedUserId();
    const { data, error } = await supabase.from(this.tableName).select('*').eq('owner_user_id', userId).eq('character_type', 'pc').order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch characters: ${error.message}`);
    return (data || []).map((character) => this.mapToViewModel(character as CharacterDto));
  }

  async getCharacterById(id: string): Promise<CharacterVm> {
    const userId = await this.getAuthenticatedUserId();
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).eq('owner_user_id', userId).single();
    if (error) throw new Error(`Failed to fetch character: ${error.message}`);
    if (!data) throw new Error('Character not found');
    return this.mapToViewModel(data as CharacterDto);
  }

  async createCharacter(payload: CreateCharacterDto): Promise<CharacterVm> {
    const userId = await this.getAuthenticatedUserId();
    const rulesetKey = payload.ruleset_key ?? 'sagadrive-core';
    const characterData: Partial<CharacterDto> = {
      owner_user_id: userId,
      character_type: 'pc',
      name: payload.name,
      description: payload.description,
      class: payload.class,
      race: payload.race,
      ruleset_key: rulesetKey,
      dnd_background: rulesetKey === 'dnd-5.5e' ? payload.dnd_background ?? null : null,
      level: payload.level || 1,
      background_story: payload.background_story,
      notes: payload.notes?.trim() || null,
      personality_traits: payload.personality_traits,
      ideals: payload.ideals,
      bonds: payload.bonds,
      flaws: payload.flaws,
      appearance: normalizeCharacterAppearance(payload.appearance),
      attributes: normalizeAttributes(payload.attributes),
      skills: normalizeSkills(payload.skills),
      sagadrive_profile: rulesetKey === 'sagadrive-core' ? normalizeSagaDriveProfile(payload.sagadrive_profile) : null,
      abilities: payload.abilities ?? [],
      inventory: normalizeInventory(payload.inventory),
      emotion_profiles: [],
      portrait_url: payload.portrait_url || undefined,
    };
    const { data, error } = await supabase.from(this.tableName).insert(characterData).select().single();
    if (error) throw new Error(`Failed to create character: ${error.message}`);
    return this.mapToViewModel(data as CharacterDto);
  }

  async updateCharacter(id: string, payload: UpdateCharacterDto): Promise<CharacterVm> {
    const userId = await this.getAuthenticatedUserId();
    const rulesetPatch = payload.ruleset_key ? { ruleset_key: payload.ruleset_key, dnd_background: payload.ruleset_key === 'dnd-5.5e' ? payload.dnd_background ?? null : null } : {};
    const updatePayload = {
      ...payload,
      ...rulesetPatch,
      ...(payload.appearance ? { appearance: normalizeCharacterAppearance(payload.appearance) } : {}),
      ...(payload.attributes ? { attributes: normalizeAttributes(payload.attributes) } : {}),
      ...(payload.skills ? { skills: normalizeSkills(payload.skills) } : {}),
      ...(payload.sagadrive_profile ? { sagadrive_profile: normalizeSagaDriveProfile(payload.sagadrive_profile) } : {}),
      ...(payload.inventory ? { inventory: normalizeInventory(payload.inventory) } : {}),
      ...(typeof payload.notes === 'string' ? { notes: payload.notes.trim() || null } : {}),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from(this.tableName).update(updatePayload).eq('id', id).eq('owner_user_id', userId).select().single();
    if (error) throw new Error(`Failed to update character: ${error.message}`);
    return this.mapToViewModel(data as CharacterDto);
  }

  async deleteCharacter(id: string): Promise<void> {
    const userId = await this.getAuthenticatedUserId();
    const { error } = await supabase.from(this.tableName).delete().eq('id', id).eq('owner_user_id', userId);
    if (error) throw new Error(`Failed to delete character: ${error.message}`);
  }

  async searchCharacters(query: string): Promise<CharacterVm[]> {
    const userId = await this.getAuthenticatedUserId();
    const { data, error } = await supabase.from(this.tableName).select('*').eq('owner_user_id', userId).eq('character_type', 'pc').ilike('name', `%${query}%`).order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to search characters: ${error.message}`);
    return (data || []).map((character) => this.mapToViewModel(character as CharacterDto));
  }

  async uploadPortrait(file: File): Promise<string> {
    const userId = await this.getAuthenticatedUserId();
    const extension = CHARACTER_PORTRAIT_MIME_EXTENSIONS[file.type];
    if (!extension) throw new Error('Invalid file type. Only PNG, JPEG, WEBP and GIF images are allowed.');
    if (file.size > CHARACTER_PORTRAIT_MAX_BYTES) throw new Error('File too large. Maximum size is 5MB.');
    const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(CHARACTER_PORTRAIT_BUCKET).upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(`Failed to upload portrait: ${uploadError.message}`);
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(CHARACTER_PORTRAIT_BUCKET).createSignedUrl(filePath, 31_536_000);
    if (signedUrlError || !signedUrlData?.signedUrl) throw new Error(signedUrlError ? `Failed to create portrait URL: ${signedUrlError.message}` : 'Failed to create portrait URL');
    return signedUrlData.signedUrl;
  }
}

export const characterService = new CharacterService();
