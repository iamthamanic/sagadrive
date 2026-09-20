/**
 * character.views — Read-side view models for character slices.
 * Location: src/domains/character/contracts/character.views.ts
 */
import type {
  AbilityDto,
  CharacterAppearanceDto,
  CharacterAttributesDto,
  CharacterRulesetKey,
  EmotionProfileDto,
  ItemDto,
  SagaDriveSkillKey,
} from '../domain/character.entity';
import type { SagaDriveProfileDto } from '../domain/sagadrive-profile.entity';
import type { InventoryState } from '../inventory-v2';
import type { CharacterAbstractResources } from '../../rules/sagadrive/items';

export type CharacterSheetStatus = 'complete' | 'incomplete';

export interface CharacterVm {
  id: string;
  /** Immutable public character id (CH-XXXXX); absent only pre-migration rows. */
  publicId?: string;
  name: string;
  description: string;
  class: string;
  race: string;
  rulesetKey: CharacterRulesetKey;
  dndBackground?: string;
  level: number;
  /** complete = full build; incomplete = draft with open editor gaps. */
  sheetStatus: CharacterSheetStatus;
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
  /** Legacy flat list — compatibility only once inventorySchemaVersion is 2. */
  inventory: ItemDto[];
  /** Authoritative Inventory v2 state (migrated in memory when still on schema 1). */
  inventoryV2: InventoryState;
  inventorySchemaVersion: 1 | 2;
  /**
   * Abstract resources 0–5 (§10.3 / #32). Default current=3.
   * Optional `base` reserved for later dual UI — no rewrite required.
   */
  abstractResources: CharacterAbstractResources;
  emotionProfiles: EmotionProfileDto[];
  portraitUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterSummaryVm {
  id: string;
  publicId?: string;
  name: string;
  class: string;
  race: string;
  level: number;
  sheetStatus: CharacterSheetStatus;
  portraitUrl?: string;
}
