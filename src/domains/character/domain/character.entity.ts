/**
 * character.entity — Core character domain value types.
 * Location: src/domains/character/domain/character.entity.ts
 */
import type { CharacterRulesetKey, SagaDriveSkillKey } from '../../rules/sagadrive/character-creation';
import type { SagaDriveAvatarMorphStateV1 } from '../avatar/morph-contract';

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

/**
 * Compact appearance avatar DTO.
 * Optional `morph` follows SagaDriveAvatarMorphV1 (see domains/character/avatar/morph-contract).
 * Legacy readers ignore unknown fields; morph capabilities are never client-authoritative.
 */
export interface CharacterAvatarDto {
  schema_version: 1;
  /** @deprecated Prefer `source`. Kept for legacy readers; always `m3-character-studio`. */
  provider: 'm3-character-studio';
  /**
   * Avatar origin — never a capability proof (#6 owns capabilities).
   * Missing → resolve via resolveAvatarSource (legacy provider → sagadrive).
   */
  source?: 'sagadrive' | 'import' | 'meshy';
  preset: string;
  model_format: CharacterAvatarFormat;
  model_url?: string;
  traits: { head?: string; ears?: string; hair?: string; clothing?: string; accessory?: string };
  /** hair/skin required for legacy; eyes optional until morph migration. */
  colors: { hair: string; skin: string; eyes?: string };
  body: { height: number; size: number };
  morph_contract_version?: 'SagaDriveAvatarMorphV1';
  /** Validated morph state — prefer morph-contract helpers over raw writes. */
  morph?: SagaDriveAvatarMorphStateV1;
  /**
   * Avatar V2 template ingress (#260) — optional; ignored by legacy readers.
   * `template_id` e.g. `species-template:dwarf`; `body_family` from template pack.
   */
  template_id?: string;
  body_family?: 'standard' | 'compact' | 'heavy' | 'custom';
  anatomy?: 'humanoid' | 'non-humanoid' | 'unknown';
  modularity?: 'modular-parts' | 'limited' | 'none';
  /** Logical starter wardrobe ids applied as basic outfit (not inventory). */
  starter_wardrobe?: readonly string[];
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
