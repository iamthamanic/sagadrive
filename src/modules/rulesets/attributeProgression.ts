import type { CharacterAttributesDto } from '../characters';
import type { SagaDriveAttributeKey } from './characterCreation';

export const SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET = 15;
export const SAGA_DRIVE_START_ATTRIBUTE_BONUS_MIN = 0;
export const SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP = 4;
export const SAGA_DRIVE_ATTRIBUTE_BONUS_CAP = 5;
export const SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS = [8, 16] as const;

export type SagaDriveAttributeAdvanceLevel = (typeof SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS)[number];
export type SagaDriveAttributeAdvances = Partial<Record<SagaDriveAttributeAdvanceLevel, SagaDriveAttributeKey>>;

export function getSagaDriveAttributeAdvanceLevels(level: number): readonly SagaDriveAttributeAdvanceLevel[] {
  const normalizedLevel = Math.min(20, Math.max(1, Math.round(level)));
  return SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS.filter((advanceLevel) => normalizedLevel >= advanceLevel);
}

export function getSagaDriveAttributeAdvanceBudget(level: number): number {
  return getSagaDriveAttributeAdvanceLevels(level).length;
}

export function getSagaDriveBaseAttributePointsUsed(attributes: CharacterAttributesDto): number {
  return Object.values(attributes).reduce((sum, value) => sum + value, 0);
}

export function isValidSagaDriveBaseAttributeDistribution(attributes: CharacterAttributesDto): boolean {
  const values = Object.values(attributes);
  return values.every((value) => Number.isInteger(value) && value >= SAGA_DRIVE_START_ATTRIBUTE_BONUS_MIN && value <= SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP)
    && getSagaDriveBaseAttributePointsUsed(attributes) === SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET;
}

export function applySagaDriveAttributeAdvances(
  baseAttributes: CharacterAttributesDto,
  advances: SagaDriveAttributeAdvances,
  level: number,
): CharacterAttributesDto {
  const result = { ...baseAttributes };
  for (const advanceLevel of getSagaDriveAttributeAdvanceLevels(level)) {
    const attribute = advances[advanceLevel];
    if (!attribute) continue;
    result[attribute] += 1;
  }
  return result;
}

export function isValidSagaDriveAttributeBuild(
  baseAttributes: CharacterAttributesDto,
  advances: SagaDriveAttributeAdvances,
  level: number,
): boolean {
  if (!isValidSagaDriveBaseAttributeDistribution(baseAttributes)) return false;

  const requiredLevels = getSagaDriveAttributeAdvanceLevels(level);
  if (requiredLevels.some((advanceLevel) => !advances[advanceLevel])) return false;

  const finalAttributes = applySagaDriveAttributeAdvances(baseAttributes, advances, level);
  return Object.values(finalAttributes).every((value) => value <= SAGA_DRIVE_ATTRIBUTE_BONUS_CAP);
}

export function canAssignSagaDriveAttributeAdvance(
  baseAttributes: CharacterAttributesDto,
  advances: SagaDriveAttributeAdvances,
  level: number,
  advanceLevel: SagaDriveAttributeAdvanceLevel,
  attribute: SagaDriveAttributeKey,
): boolean {
  if (level < advanceLevel) return false;
  const candidate = { ...advances, [advanceLevel]: attribute };
  const finalAttributes = applySagaDriveAttributeAdvances(baseAttributes, candidate, level);
  return finalAttributes[attribute] <= SAGA_DRIVE_ATTRIBUTE_BONUS_CAP;
}
