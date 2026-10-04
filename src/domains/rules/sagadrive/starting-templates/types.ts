/**
 * starting-templates types — species-neutral Level-1 SagaDrive start builds (#463).
 * Location: src/domains/rules/sagadrive/starting-templates/types.ts
 *
 * Pure domain: no React, Supabase, race/appearance/inventory fields.
 */
import type { CharacterAttributesDto } from '../../../character/domain/character.entity';
import type {
  SagaDriveArchetypeKey,
  SagaDriveEssenceKey,
  SagaDriveSkillKey,
} from '../character-creation';
import type {
  SagaDriveBackgroundSkillPoints,
  SagaDriveSkillRankMap,
  SagaDriveSpecializationRecordDto,
  SagaDriveStartSkillBuild,
} from '../skill-progression';

export const SAGA_DRIVE_STARTING_TEMPLATE_KEYS = [
  'berserker',
  'vanguard',
  'mage',
  'technomancer',
  'medicus',
  'mystic',
  'assassin',
  'mechanom',
  'mentalist',
  'herald',
] as const;

export type SagaDriveStartingTemplateKey =
  (typeof SAGA_DRIVE_STARTING_TEMPLATE_KEYS)[number];

export type SagaDriveStartingTemplate = {
  readonly key: SagaDriveStartingTemplateKey;
  readonly labelDe: string;
  /** Short DE play-fantasy for Create-flow cards (display only). */
  readonly playstyleDe: string;
  readonly archetype: SagaDriveArchetypeKey;
  readonly essence: SagaDriveEssenceKey;
  /** Base attributes — permutation of [4,3,3,2,2,1]. */
  readonly attributes: CharacterAttributesDto;
  readonly backgroundTemplateId: string;
  readonly freeSkillRanks: SagaDriveSkillRankMap;
  readonly backgroundSkillPoints: SagaDriveBackgroundSkillPoints;
  readonly archetypeTrainingSkill: SagaDriveSkillKey;
  /** Exactly one Level-1 background specialization. */
  readonly backgroundSpecialization: SagaDriveSpecializationRecordDto;
};

export type SagaDriveStartingTemplateSkillBuild = SagaDriveStartSkillBuild & {
  readonly archetypeTrainingSkill: SagaDriveSkillKey;
};

export function isSagaDriveStartingTemplateKey(
  value: string,
): value is SagaDriveStartingTemplateKey {
  return (SAGA_DRIVE_STARTING_TEMPLATE_KEYS as readonly string[]).includes(value);
}
