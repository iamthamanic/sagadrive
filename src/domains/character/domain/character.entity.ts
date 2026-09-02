/**
 * character.entity — Core character domain value types.
 * Location: src/domains/character/domain/character.entity.ts
 */
import type { CharacterRulesetKey, SagaDriveSkillKey } from '../../rules/sagadrive/character-creation';

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

export interface EmotionProfileDto {
  id: string;
  name: string;
  intensity: number;
}

export type { CharacterRulesetKey, SagaDriveSkillKey };
