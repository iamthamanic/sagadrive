import type { CharacterAttributesDto } from '../../../character/domain/character.entity';
import { isSagaDriveAttributeKey, type SagaDriveAttributeKey } from '../character-creation';

export const SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET = 15;
export const SAGA_DRIVE_START_ATTRIBUTE_BONUS_MIN = 0;
export const SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP = 4;
export const SAGA_DRIVE_ATTRIBUTE_BONUS_CAP = 5;
export const SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS = [8, 16] as const;

export type SagaDriveAttributeAdvanceLevel = (typeof SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS)[number];
export type SagaDriveAttributeAdvances = Partial<Record<SagaDriveAttributeAdvanceLevel, SagaDriveAttributeKey>>;

export type SagaDrivePersistedAttributeBuild = {
  baseAttributes?: CharacterAttributesDto;
  attributeAdvances?: SagaDriveAttributeAdvances;
};

export type SagaDriveResolvedAttributeBuild = {
  baseAttributes: CharacterAttributesDto;
  attributeAdvances: SagaDriveAttributeAdvances;
};

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

/** Normalize persisted advance map (JSON keys may be strings). Unknown keys are dropped. */
export function normalizeSagaDriveAttributeAdvances(value: unknown): SagaDriveAttributeAdvances {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const result: SagaDriveAttributeAdvances = {};
  for (const advanceLevel of SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS) {
    const raw = record[String(advanceLevel)] ?? record[advanceLevel as unknown as string];
    if (typeof raw === 'string' && isSagaDriveAttributeKey(raw)) result[advanceLevel] = raw;
  }
  return result;
}

/**
 * Reconstruct editor state from persisted profile + final attributes.
 * Old profiles without baseAttributes: treat current attributes as base, advances empty.
 */
export function resolveSagaDriveAttributeBuildState(
  finalAttributes: CharacterAttributesDto,
  persisted?: SagaDrivePersistedAttributeBuild | null,
): SagaDriveResolvedAttributeBuild {
  if (persisted?.baseAttributes) {
    return {
      baseAttributes: { ...persisted.baseAttributes },
      attributeAdvances: { ...(persisted.attributeAdvances ?? {}) },
    };
  }
  return {
    baseAttributes: { ...finalAttributes },
    attributeAdvances: {},
  };
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

export type SagaDriveAttributeBonusLevelGuideEntry = {
  levelLabel: string;
  maxBonus: number;
  description: string;
};

function formatSagaDriveAttributeBonusLevelLabel(minLevel: number, maxLevel: number): string {
  if (minLevel === maxLevel) return String(minLevel);
  if (maxLevel >= 20) return `${minLevel}+`;
  return `${minLevel}–${maxLevel}`;
}

/** Gruppierte Übersicht: nur Level-Bereiche mit geändertem Bonus-Cap oder neuer permanenter Entwicklung. */
export function getSagaDriveAttributeBonusLevelGuide(): readonly SagaDriveAttributeBonusLevelGuideEntry[] {
  const [firstAdvanceLevel, secondAdvanceLevel] = SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS;
  return [
    {
      levelLabel: formatSagaDriveAttributeBonusLevelLabel(1, firstAdvanceLevel - 1),
      maxBonus: SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP,
      description: 'Basisverteilung',
    },
    {
      levelLabel: formatSagaDriveAttributeBonusLevelLabel(firstAdvanceLevel, secondAdvanceLevel - 1),
      maxBonus: SAGA_DRIVE_ATTRIBUTE_BONUS_CAP,
      description: '1 zusätzlicher Bonuspunkt darf auf ein Grundattribut verteilt werden',
    },
    {
      levelLabel: formatSagaDriveAttributeBonusLevelLabel(secondAdvanceLevel, 20),
      maxBonus: SAGA_DRIVE_ATTRIBUTE_BONUS_CAP,
      description: '1 zusätzlicher Bonuspunkt darf auf ein Grundattribut verteilt werden.',
    },
  ];
}
