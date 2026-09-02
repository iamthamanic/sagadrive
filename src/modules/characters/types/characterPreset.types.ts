/**
 * characterPreset.types — Versioned character sheet presets (SagaDrive Core MVP).
 * Location: src/modules/characters/types/characterPreset.types.ts
 */
import type { CharacterRulesetKey, SagaDriveSkillKey } from '../../rulesets/characterCreation';
import type {
  AbilityDto,
  CharacterAppearanceDto,
  CharacterAttributesDto,
  ItemDto,
  SagaDriveProfileDto,
} from './character.types';

export type CharacterPresetOrigin = 'user' | 'system';
export type CharacterPresetReleaseMode = 'manual' | 'auto';

/** Full sheet copy at save/release time (not a live link). */
export interface CharacterPresetSnapshot {
  schemaVersion: 1;
  name: string;
  description: string;
  class: string;
  race: string;
  ruleset_key: CharacterRulesetKey;
  level: number;
  background_story?: string;
  notes?: string;
  personality_traits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  appearance: CharacterAppearanceDto;
  attributes: CharacterAttributesDto;
  /** Free skill ranks in the editor (before background/archetype bonuses). */
  freeSkillRanks: Record<SagaDriveSkillKey, number>;
  skills: Record<SagaDriveSkillKey, number>;
  sagadrive_profile: SagaDriveProfileDto;
  abilities: AbilityDto[];
  inventory: ItemDto[];
  portrait_url?: string;
}

export interface CharacterPresetVersionDto {
  level: number;
  snapshot: CharacterPresetSnapshot;
  created_at: string;
}

export interface CharacterPresetDto {
  id: string;
  owner_user_id: string;
  display_name: string;
  ruleset_key: CharacterRulesetKey;
  origin: CharacterPresetOrigin;
  source_character_id: string | null;
  published: boolean;
  versions: CharacterPresetVersionDto[];
  created_at: string;
  updated_at: string;
}

export interface CharacterPresetVm {
  id: string;
  displayName: string;
  rulesetKey: CharacterRulesetKey;
  origin: CharacterPresetOrigin;
  sourceCharacterId: string | null;
  sourceCharacterMissing: boolean;
  published: boolean;
  versions: CharacterPresetVersionDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCharacterPresetInput {
  displayName: string;
  rulesetKey: CharacterRulesetKey;
  sourceCharacterId: string;
  snapshot: CharacterPresetSnapshot;
}

export interface ReleaseCharacterPresetVersionInput {
  presetId: string;
  snapshot: CharacterPresetSnapshot;
}
