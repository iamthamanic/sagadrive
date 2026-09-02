/**
 * character.persistence — Supabase row shape for characters table.
 * Location: src/infrastructure/character/character.persistence.ts
 */
import type {
  AbilityDto,
  CharacterAppearanceDto,
  CharacterAttributeStorageDto,
  CharacterRulesetKey,
  EmotionProfileDto,
  ItemDto,
  SagaDriveSkillKey,
} from '../../domains/character/domain/character.entity';
import type { SagaDriveProfileDto } from '../../domains/character/domain/sagadrive-profile.entity';

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
