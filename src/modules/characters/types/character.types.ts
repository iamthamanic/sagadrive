// Character DTOs (Data Transfer Objects)
export interface CharacterDto {
  id: string;
  owner_user_id: string;
  world_id?: string;
  project_id?: string;
  parent_character_id?: string;
  character_type: 'pc' | 'npc' | 'companion' | 'monster';
  ruleset_id?: string;
  
  name: string;
  description: string;
  class: string;
  race: string;
  level: number;
  background_story?: string;
  
  appearance: CharacterAppearanceDto;
  portrait_url?: string;
  token_url?: string;
  
  attributes: CharacterAttributesDto;
  derived_stats?: Record<string, any>;
  
  skills?: Record<string, any>;
  proficiencies?: string[];
  languages?: string[];
  
  hp_current?: number;
  hp_max?: number;
  armor_class?: number;
  initiative_bonus?: number;
  speed?: number;
  
  resources?: Record<string, any>;
  conditions?: string[];
  
  personality_traits?: string[];
  ideals?: string;
  bonds?: string;
  flaws?: string;
  
  abilities: AbilityDto[];
  inventory: ItemDto[];
  emotion_profiles: EmotionProfileDto[];
  
  is_marketplace_item?: boolean;
  downloads_count?: number;
  rating?: number;
  
  created_at: string;
  updated_at: string;
}

export interface CharacterAppearanceDto {
  body_size: number;
  height: number;
  face_features: string;
  hair_style: string;
  hair_color: string;
  skin_tone: string;
  clothing: string;
}

export interface CharacterAttributesDto {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface AbilityDto {
  id: string;
  name: string;
  description: string;
  type: 'combat' | 'magic' | 'skill';
  cost: number;
  effect: string;
}

export interface ItemDto {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  quantity: number;
}

export interface EmotionProfileDto {
  id: string;
  name: string;
  intensity: number;
}

// Create/Update DTOs
export interface CreateCharacterDto {
  name: string;
  description: string;
  class: string;
  race: string;
  level?: number;
  appearance?: Partial<CharacterAppearanceDto>;
  attributes?: Partial<CharacterAttributesDto>;
  portrait_url?: string;
}

export interface UpdateCharacterDto {
  name?: string;
  description?: string;
  class?: string;
  race?: string;
  level?: number;
  appearance?: Partial<CharacterAppearanceDto>;
  attributes?: Partial<CharacterAttributesDto>;
  abilities?: AbilityDto[];
  inventory?: ItemDto[];
  portrait_url?: string;
}

// View Models (for UI)
export interface CharacterVm {
  id: string;
  name: string;
  description: string;
  class: string;
  race: string;
  level: number;
  appearance: CharacterAppearanceDto;
  attributes: CharacterAttributesDto;
  abilities: AbilityDto[];
  inventory: ItemDto[];
  emotionProfiles: EmotionProfileDto[];
  portraitUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
