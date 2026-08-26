import { supabase } from '../../../lib/supabase';
import { normalizeCharacterAppearance } from '../avatar';
import type {
  CharacterDto,
  CharacterVm,
  CreateCharacterDto,
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

/**
 * Character Service
 * Handles all character-related API calls to Supabase
 */
class CharacterService {
  private readonly tableName = 'characters';

  private normalizeTextBlocks(value: unknown): string[] {
    if (Array.isArray(value)) {
      return Array.from(
        new Set(
          value
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      );
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized ? [normalized] : [];
    }

    return [];
  }

  /**
   * Map DTO to View Model
   */
  private mapToViewModel(dto: CharacterDto): CharacterVm {
    const rulesetKey = dto.ruleset_key === 'dnd-5.5e' ? 'dnd-5.5e' : 'sagadrive-core';
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      class: dto.class,
      race: dto.race,
      rulesetKey,
      dndBackground:
        rulesetKey === 'dnd-5.5e' && typeof dto.dnd_background === 'string'
          ? dto.dnd_background
          : undefined,
      level: dto.level,
      backgroundStory: dto.background_story,
      personalityTraits: this.normalizeTextBlocks(dto.personality_traits),
      ideals: this.normalizeTextBlocks(dto.ideals),
      bonds: this.normalizeTextBlocks(dto.bonds),
      flaws: this.normalizeTextBlocks(dto.flaws),
      appearance: normalizeCharacterAppearance(dto.appearance),
      attributes: dto.attributes,
      abilities: dto.abilities || [],
      inventory: dto.inventory || [],
      emotionProfiles: dto.emotion_profiles || [],
      portraitUrl: dto.portrait_url || undefined,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
    };
  }

  private async getAuthenticatedUserId(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    return user.id;
  }

  /**
   * Get all characters for current user
   */
  async getUserCharacters(): Promise<CharacterVm[]> {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('owner_user_id', userId)
      .eq('character_type', 'pc')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch characters: ${error.message}`);
    }

    return (data || []).map((character) => this.mapToViewModel(character as CharacterDto));
  }

  /**
   * Get single character by ID
   */
  async getCharacterById(id: string): Promise<CharacterVm> {
    const userId = await this.getAuthenticatedUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('owner_user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch character: ${error.message}`);
    }

    if (!data) {
      throw new Error('Character not found');
    }

    return this.mapToViewModel(data as CharacterDto);
  }

  /**
   * Create new character
   */
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
      personality_traits: payload.personality_traits,
      ideals: payload.ideals,
      bonds: payload.bonds,
      flaws: payload.flaws,
      appearance: normalizeCharacterAppearance(payload.appearance),
      attributes: {
        strength: payload.attributes?.strength ?? 10,
        dexterity: payload.attributes?.dexterity ?? 10,
        constitution: payload.attributes?.constitution ?? 10,
        intelligence: payload.attributes?.intelligence ?? 10,
        wisdom: payload.attributes?.wisdom ?? 10,
        charisma: payload.attributes?.charisma ?? 10,
      },
      abilities: payload.abilities ?? [],
      inventory: payload.inventory ?? [],
      emotion_profiles: [],
      portrait_url: payload.portrait_url || undefined,
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(characterData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create character: ${error.message}`);
    }

    return this.mapToViewModel(data as CharacterDto);
  }

  /**
   * Update existing character
   */
  async updateCharacter(id: string, payload: UpdateCharacterDto): Promise<CharacterVm> {
    const userId = await this.getAuthenticatedUserId();
    const rulesetPatch = payload.ruleset_key
      ? {
          ruleset_key: payload.ruleset_key,
          dnd_background:
            payload.ruleset_key === 'dnd-5.5e' ? payload.dnd_background ?? null : null,
        }
      : {};
    const updatePayload: UpdateCharacterDto & { updated_at: string } = {
      ...payload,
      ...rulesetPatch,
      ...(payload.appearance
        ? { appearance: normalizeCharacterAppearance(payload.appearance) }
        : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updatePayload)
      .eq('id', id)
      .eq('owner_user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update character: ${error.message}`);
    }

    return this.mapToViewModel(data as CharacterDto);
  }

  /**
   * Delete character
   */
  async deleteCharacter(id: string): Promise<void> {
    const userId = await this.getAuthenticatedUserId();
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('owner_user_id', userId);

    if (error) {
      throw new Error(`Failed to delete character: ${error.message}`);
    }
  }

  /**
   * Search characters by name
   */
  async searchCharacters(query: string): Promise<CharacterVm[]> {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('owner_user_id', userId)
      .eq('character_type', 'pc')
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search characters: ${error.message}`);
    }

    return (data || []).map((character) => this.mapToViewModel(character as CharacterDto));
  }

  /**
   * Upload character portrait image through the configured Supabase Storage endpoint.
   * Migration 006 keeps the bucket private and limits each user to their own folder.
   */
  async uploadPortrait(file: File): Promise<string> {
    const userId = await this.getAuthenticatedUserId();
    const extension = CHARACTER_PORTRAIT_MIME_EXTENSIONS[file.type];

    if (!extension) {
      throw new Error('Invalid file type. Only PNG, JPEG, WEBP and GIF images are allowed.');
    }
    if (file.size > CHARACTER_PORTRAIT_MAX_BYTES) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(CHARACTER_PORTRAIT_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload portrait: ${uploadError.message}`);
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(CHARACTER_PORTRAIT_BUCKET)
      .createSignedUrl(filePath, 31_536_000);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(
        signedUrlError
          ? `Failed to create portrait URL: ${signedUrlError.message}`
          : 'Failed to create portrait URL',
      );
    }

    return signedUrlData.signedUrl;
  }
}

export const characterService = new CharacterService();