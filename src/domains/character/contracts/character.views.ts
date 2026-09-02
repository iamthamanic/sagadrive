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

export interface CharacterSummaryVm {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  portraitUrl?: string;
}
