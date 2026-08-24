import { supabase } from '../../../lib/supabase';
import { projectId } from '../../../utils/supabase/info';
import { normalizeCharacterAppearance } from '../avatar';
import type {
  CharacterDto,
  CharacterVm,
  CreateCharacterDto,
  UpdateCharacterDto,
} from '../types/character.types';

/**
 * Character Service
 * Handles all character-related API calls to Supabase
 */
class CharacterService {
  private readonly tableName = 'characters';

  /**
   * Map DTO to View Model
   */
  private mapToViewModel(dto: CharacterDto): CharacterVm {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      class: dto.class,
      race: dto.race,
      level: dto.level,
      backgroundStory: dto.background_story,
      personalityTraits: dto.personality_traits ?? [],
      ideals: dto.ideals,
      bonds: dto.bonds,
      flaws: dto.flaws,
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

    const characterData: Partial<CharacterDto> = {
      owner_user_id: userId,
      character_type: 'pc',
      name: payload.name,
      description: payload.description,
      class: payload.class,
      race: payload.race,
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
      abilities: [],
      inventory: [],
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
    const updatePayload: UpdateCharacterDto & { updated_at: string } = {
      ...payload,
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
   * Upload character portrait image
   */
  async uploadPortrait(file: File): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-9f6fb44c/characters/upload-portrait`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const responseBody: unknown = await response.json();
      const message =
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'error' in responseBody &&
        typeof responseBody.error === 'string'
          ? responseBody.error
          : 'Failed to upload portrait';
      throw new Error(message);
    }

    const responseBody: unknown = await response.json();
    if (
      typeof responseBody !== 'object' ||
      responseBody === null ||
      !('url' in responseBody) ||
      typeof responseBody.url !== 'string'
    ) {
      throw new Error('Portrait upload returned an invalid response');
    }

    return responseBody.url;
  }
}

export const characterService = new CharacterService();
