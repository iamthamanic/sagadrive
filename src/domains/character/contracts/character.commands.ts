/**
 * character.commands — Write-side slice contracts for character persistence.
 * Location: src/domains/character/contracts/character.commands.ts
 */
import type {
  AbilityDto,
  CharacterAppearanceDto,
  CharacterAttributesDto,
  CharacterRulesetKey,
  ItemDto,
  SagaDriveSkillKey,
} from '../domain/character.entity';
import type { SagaDriveProfileDto } from '../domain/sagadrive-profile.entity';
import type { InventoryState } from '../inventory-v2';
import type { CharacterAbstractResources } from '../../rules/sagadrive/items';
import type { CharacterSheetStatus } from './character.views';

export interface CreateCharacterDto {
  name: string;
  description: string;
  class: string;
  race: string;
  ruleset_key?: CharacterRulesetKey;
  dnd_background?: string | null;
  level?: number;
  /** Defaults to complete when omitted (legacy callers). */
  sheet_status?: CharacterSheetStatus;
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
  inventory_v2?: InventoryState;
  /** Abstract resources 0–5; serialized into `characters.resources` JSONB. */
  abstractResources?: CharacterAbstractResources;
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
  sheet_status?: CharacterSheetStatus;
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
  /** Writing inventory_v2 always sets schema version 2; the marker is not caller-controlled. */
  inventory_v2?: InventoryState;
  /** Abstract resources 0–5; serialized into `characters.resources` JSONB. */
  abstractResources?: CharacterAbstractResources;
  portrait_url?: string;
}
