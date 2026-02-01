import { supabase } from '../../../lib/supabase';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
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
      appearance: dto.appearance,
      attributes: dto.attributes,
      abilities: dto.abilities || [],
      inventory: dto.inventory || [],
      emotionProfiles: dto.emotion_profiles || [],
      portraitUrl: dto.portrait_url || undefined,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
    };
  }

  /**
   * Get all characters for current user
   */
  async getUserCharacters(): Promise<CharacterVm[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('owner_user_id', user.id)
      .eq('character_type', 'pc')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch characters: ${error.message}`);
    }

    return (data || []).map(this.mapToViewModel);
  }

  /**
   * Get single character by ID
   */
  async getCharacterById(id: string): Promise<CharacterVm> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch character: ${error.message}`);
    }

    if (!data) {
      throw new Error('Character not found');
    }

    return this.mapToViewModel(data);
  }

  /**
   * Create new character
   */
  async createCharacter(payload: CreateCharacterDto): Promise<CharacterVm> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const characterData: Partial<CharacterDto> = {
      owner_user_id: user.id,
      character_type: 'pc',
      name: payload.name,
      description: payload.description,
      class: payload.class,
      race: payload.race,
      level: payload.level || 1,
      appearance: payload.appearance || {
        body_size: 50,
        height: 50,
        face_features: 'default',
        hair_style: 'short',
        hair_color: '#000000',
        skin_tone: '#F5E6D3',
        clothing: 'casual',
      },
      attributes: payload.attributes || {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      abilities: [],
      inventory: [],
      emotion_profiles: [],
      portrait_url: payload.portrait_url || null,
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(characterData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create character: ${error.message}`);
    }

    return this.mapToViewModel(data);
  }

  /**
   * Update existing character
   */
  async updateCharacter(id: string, payload: UpdateCharacterDto): Promise<CharacterVm> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update character: ${error.message}`);
    }

    return this.mapToViewModel(data);
  }

  /**
   * Delete character
   */
  async deleteCharacter(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete character: ${error.message}`);
    }
  }

  /**
   * Search characters by name
   */
  async searchCharacters(query: string): Promise<CharacterVm[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('owner_user_id', user.id)
      .eq('character_type', 'pc')
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search characters: ${error.message}`);
    }

    return (data || []).map(this.mapToViewModel);
  }

  /**
   * Upload character portrait image
   */
  async uploadPortrait(file: File): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    
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
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload portrait');
    }

    const { url } = await response.json();
    return url;
  }
}

export const characterService = new CharacterService();
