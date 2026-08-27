import type {
  CharacterRulesetKey,
  SagaDriveArchetypeKey,
  SagaDriveEssenceKey,
  SagaDriveSkillKey,
  SagaDriveSpeciesTraitKey,
} from '../../rulesets/characterCreation';

export interface SagaDriveSpecializationDto {
  skill: SagaDriveSkillKey;
  name: string;
}

export interface SagaDriveBackgroundDto {
  name: string;
  skillPool: SagaDriveSkillKey[];
  trainedSkills: SagaDriveSkillKey[];
  specialization?: SagaDriveSpecializationDto;
  milieuAccess: string;
  contact: string;
  complication: string;
  communication: string;
}

export type SagaDriveSpeciesTraitDetailsDto = Partial<Record<SagaDriveSpeciesTraitKey, string>>;

export interface SagaDriveSpeciesProfileDto {
  name: string;
  bodyDescription: string;
}

export interface SagaDriveProfileDto {
  archetype?: SagaDriveArchetypeKey;
  essence?: SagaDriveEssenceKey;
  speciesTraits: SagaDriveSpeciesTraitKey[];
  speciesTraitDetails: SagaDriveSpeciesTraitDetailsDto;
  speciesProfile?: SagaDriveSpeciesProfileDto;
  background: SagaDriveBackgroundDto;
  archetypeTrainingSkill?: SagaDriveSkillKey;
  drive: number;
  momentum: number;
}

export interface CharacterAttributesDto {
  strength: number;
  dexterity: number;
  endurance: number;
  mind: number;
  perception: number;
  charisma: number;
}

export interface CharacterAttributeStorageDto extends Partial<CharacterAttributesDto> {
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
}

export interface CharacterDto {
  id: string;
  owner_user_id: string;
  world_id?: string;
  project_id?: string;
  parent_character_id?: string;
  character_type: 'pc' | 'npc' | 'companion' | 'monster';
  ruleset_id?: string;
  ruleset_key?: CharacterRulesetKey;
  name: string;
  description: string;
  class: string;
  race: string;
  level: number;
  background_story?: string;
  dnd_background?: string | null;
  notes?: string | null;
  appearance: CharacterAppearanceDto;
  portrait_url?: string;
  token_url?: string;
  attributes: CharacterAttributeStorageDto;
  derived_stats?: Record<string, unknown>;
  skills?: Partial<Record<SagaDriveSkillKey, number>>;
  proficiencies?: string[];
  languages?: string[];
  hp_current?: number;
  hp_max?: number;
  armor_class?: number;
  initiative_bonus?: number;
  speed?: number;
  resources?: Record<string, unknown>;
  conditions?: string[];
  sagadrive_profile?: Partial<SagaDriveProfileDto> | null;
  personality_traits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  abilities: AbilityDto[];
  inventory: ItemDto[];
  emotion_profiles: EmotionProfileDto[];
  is_marketplace_item?: boolean;
  downloads_count?: number;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export type CharacterAvatarFormat = 'vrm' | 'glb';

export interface CharacterAvatarDto {
  schema_version: 1;
  provider: 'm3-character-studio';
  preset: string;
  model_format: CharacterAvatarFormat;
  model_url?: string;
  traits: { head?: string; ears?: string; hair?: string; clothing?: string; accessory?: string };
  colors: { hair: string; skin: string };
  body: { height: number; size: number };
}

export type CharacterGenderReading = 'masculine-read' | 'feminine-read' | 'diverse';

export interface CharacterAppearanceDto {
  body_size: number;
  height: number;
  face_features: string;
  hair_style: string;
  hair_color: string;
  skin_tone: string;
  clothing: string;
  gender_reading?: CharacterGenderReading;
  avatar?: CharacterAvatarDto;
}

export interface AbilityDto {
  id: string;
  name: string;
  description: string;
  type: 'combat' | 'magic' | 'skill';
  cost: number;
  effect: string;
  source?: string;
  rank?: 'I' | 'II' | 'III' | 'IV' | 'V';
  action_type?: 'Passiv' | 'Hauptaktion' | 'Bewegung' | 'Reaktion';
  tags?: string[];
  usage_limit?: string;
}

export type ItemType = 'weapon' | 'armor' | 'shield' | 'tool' | 'consumable' | 'misc';

export interface ItemDto {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  quantity: number;
  load?: 0 | 1 | 2 | 3;
  cost?: 0 | 1 | 2 | 3 | 4 | 5;
  damage?: string;
  damage_type?: string;
  protection?: 1 | 2 | 3;
  minimum_strength?: 1 | 2 | 4;
  traits?: string[];
}

export interface EmotionProfileDto { id: string; name: string; intensity: number; }

export interface CreateCharacterDto {
  name: string;
  description: string;
  class: string;
  race: string;
  ruleset_key?: CharacterRulesetKey;
  dnd_background?: string | null;
  level?: number;
  background_story?: string;
  notes?: string;
  personality_traits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  appearance?: Partial<CharacterAppearanceDto>;
  attributes?: Partial<CharacterAttributesDto>;
  skills?: Partial<Record<SagaDriveSkillKey, number>>;
  sagadrive_profile?: SagaDriveProfileDto;
  abilities?: AbilityDto[];
  inventory?: ItemDto[];
  portrait_url?: string;
}

export interface UpdateCharacterDto {
  name?: string;
  description?: string;
  class?: string;
  race?: string;
  ruleset_key?: CharacterRulesetKey;
  dnd_background?: string | null;
  level?: number;
  background_story?: string;
  notes?: string;
  personality_traits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  appearance?: Partial<CharacterAppearanceDto>;
  attributes?: Partial<CharacterAttributesDto>;
  skills?: Partial<Record<SagaDriveSkillKey, number>>;
  sagadrive_profile?: SagaDriveProfileDto;
  abilities?: AbilityDto[];
  inventory?: ItemDto[];
  portrait_url?: string;
}

export interface CharacterVm {
  id: string;
  name: string;
  description: string;
  class: string;
  race: string;
  rulesetKey: CharacterRulesetKey;
  dndBackground?: string;
  level: number;
  backgroundStory?: string;
  notes: string;
  personalityTraits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
  appearance: CharacterAppearanceDto;
  attributes: CharacterAttributesDto;
  skills: Record<SagaDriveSkillKey, number>;
  sagaDriveProfile: SagaDriveProfileDto;
  abilities: AbilityDto[];
  inventory: ItemDto[];
  emotionProfiles: EmotionProfileDto[];
  portraitUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
