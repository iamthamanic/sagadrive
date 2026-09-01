import type { CharacterAttributesDto } from '../characters/types/character.types';
import {
  SAGA_DRIVE_ATTRIBUTE_BONUS_CAP,
  SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET,
  SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP,
  getSagaDriveFinalAttributeBonuses,
  sagaDriveAttributeDefinitions,
  type SagaDriveAttributeAdvancementMilestone,
  type SagaDriveAttributeAdvancements,
  type SagaDriveAttributeKey,
} from './characterCreation';

export function getSagaDriveStartAttributeBonusUsed(base: CharacterAttributesDto): number {
  return sagaDriveAttributeDefinitions.reduce((sum, attribute) => sum + base[attribute.key], 0);
}

export function getRequiredSagaDriveAttributeMilestones(level: number): readonly SagaDriveAttributeAdvancementMilestone[] {
  if (level >= 16) return ['level8', 'level16'];
  if (level >= 8) return ['level8'];
  return [];
}

export function isValidSagaDriveStartAttributeBonuses(base: CharacterAttributesDto): boolean {
  if (getSagaDriveStartAttributeBonusUsed(base) !== SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET) return false;
  return sagaDriveAttributeDefinitions.every((attribute) => {
    const value = base[attribute.key];
    return Number.isInteger(value) && value >= 0 && value <= SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP;
  });
}

export function canAssignSagaDriveAttributeAdvancement(
  base: CharacterAttributesDto,
  advancements: SagaDriveAttributeAdvancements,
  milestone: SagaDriveAttributeAdvancementMilestone,
  attribute: SagaDriveAttributeKey,
  level: number,
): boolean {
  const withoutCurrent: SagaDriveAttributeAdvancements = { ...advancements, [milestone]: undefined };
  const valueBeforeCurrent = getSagaDriveFinalAttributeBonuses(base, withoutCurrent, level)[attribute];
  return valueBeforeCurrent < SAGA_DRIVE_ATTRIBUTE_BONUS_CAP;
}

export function isValidSagaDriveAttributeProgression(
  base: CharacterAttributesDto,
  advancements: SagaDriveAttributeAdvancements,
  level: number,
): boolean {
  if (!isValidSagaDriveStartAttributeBonuses(base)) return false;
  const requiredMilestones = getRequiredSagaDriveAttributeMilestones(level);
  if (requiredMilestones.some((milestone) => !advancements[milestone])) return false;
  const finalAttributes = getSagaDriveFinalAttributeBonuses(base, advancements, level);
  return sagaDriveAttributeDefinitions.every((attribute) => finalAttributes[attribute.key] <= SAGA_DRIVE_ATTRIBUTE_BONUS_CAP);
}
