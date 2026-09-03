/**
 * skill-progression — SagaDrive skill sources, caps, EB, advances, and provenance resolution.
 * Location: src/domains/rules/sagadrive/skill-progression/index.ts
 */
import {
  createEmptySagaDriveSkillRanks,
  getSagaDriveArchetype,
  isSagaDriveSkillKey,
  SAGA_DRIVE_START_FREE_SKILL_POINTS,
  SAGA_DRIVE_START_SKILL_CAP,
  sagaDriveSkillDefinitions,
  type SagaDriveArchetypeKey,
  type SagaDriveSkillKey,
} from '../character-creation';

export const SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS = 2;
export const SAGA_DRIVE_START_ARCHETYPE_SKILL_POINTS = 1;
export const SAGA_DRIVE_SKILL_ADVANCE_LEVELS = [3, 5, 7, 9, 11, 13, 15, 17, 19] as const;
export const SAGA_DRIVE_MAX_SPECIALIZATIONS_PER_SKILL = 3;
/** §5.2 situational specialization bonus; never part of the normal skill check. */
export const SAGA_DRIVE_SPECIALIZATION_BONUS = 2;

export type SagaDriveSkillAdvanceLevel = (typeof SAGA_DRIVE_SKILL_ADVANCE_LEVELS)[number];
export type SagaDriveBackgroundSkillPoints = Partial<Record<SagaDriveSkillKey, 1 | 2>>;
export type SagaDriveSkillRankMap = Record<SagaDriveSkillKey, number>;

export type SagaDriveSkillAdvanceKind = 'rank-up' | 'learn';

export interface SagaDriveSkillAdvanceDto {
  level: SagaDriveSkillAdvanceLevel;
  kind: SagaDriveSkillAdvanceKind;
  skill: SagaDriveSkillKey;
}

export type SagaDriveSpecializationSource = 'background' | 'skill-development';

export interface SagaDriveSpecializationRecordDto {
  skill: SagaDriveSkillKey;
  name: string;
  source: SagaDriveSpecializationSource;
  acquiredAtLevel: number;
}

export interface SagaDriveStartSkillBuild {
  freeSkillRanks: SagaDriveSkillRankMap;
  backgroundSkillPoints: SagaDriveBackgroundSkillPoints;
  archetypeTrainingSkill?: SagaDriveSkillKey;
}

export interface SagaDrivePersistedSkillBuild extends SagaDriveStartSkillBuild {
  skillAdvances?: SagaDriveSkillAdvanceDto[];
  specializations?: SagaDriveSpecializationRecordDto[];
}

const SPECIALIZATION_MIN_RANK: readonly number[] = [1, 3, 5];

function clampLevel(level: number): number {
  return Math.min(20, Math.max(1, Math.round(level)));
}

function sumBackgroundSkillPoints(points: SagaDriveBackgroundSkillPoints): number {
  return Object.values(points).reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function sumBackgroundSkillPointsUsed(points: SagaDriveBackgroundSkillPoints): number {
  return sumBackgroundSkillPoints(points);
}

function sumFreeSkillRanks(freeSkillRanks: SagaDriveSkillRankMap): number {
  return sagaDriveSkillDefinitions.reduce((sum, skill) => sum + freeSkillRanks[skill.key], 0);
}

function emptyBackgroundSkillPoints(): SagaDriveBackgroundSkillPoints {
  return {};
}

/** §5.3 global experience bonus by character level. */
export function getSagaDriveExperienceBonus(level: number): number {
  const normalized = clampLevel(level);
  if (normalized <= 4) return 1;
  if (normalized <= 8) return 2;
  if (normalized <= 12) return 3;
  if (normalized <= 16) return 4;
  return 5;
}

/** §5.3 skill-bound applicable EB: rank 0 → 0, else min(global EB, rank + 1). */
export function getSagaDriveAppliedExperienceBonus(skillRank: number, level: number): number {
  const rank = Math.max(0, Math.round(skillRank));
  if (rank <= 0) return 0;
  return Math.min(getSagaDriveExperienceBonus(level), rank + 1);
}

/** §5.3 skill cap by character level. */
export function getSagaDriveSkillCap(level: number): number {
  const normalized = clampLevel(level);
  if (normalized <= 4) return 3;
  if (normalized <= 12) return 4;
  return 5;
}

/** Unlocked skill-development slot levels up to `level`. */
export function getSagaDriveSkillAdvanceLevels(level: number): readonly SagaDriveSkillAdvanceLevel[] {
  const normalized = clampLevel(level);
  return SAGA_DRIVE_SKILL_ADVANCE_LEVELS.filter((advanceLevel) => normalized >= advanceLevel);
}

export function getSagaDriveSkillAdvanceBudget(level: number): number {
  return getSagaDriveSkillAdvanceLevels(level).length;
}

export function isSagaDriveSkillAdvanceLevel(value: number): value is SagaDriveSkillAdvanceLevel {
  return (SAGA_DRIVE_SKILL_ADVANCE_LEVELS as readonly number[]).includes(value);
}

/** Derived display array from backgroundSkillPoints (one entry per point). Never a source of truth. */
export function backgroundSkillPointsToTrainedSkills(points: SagaDriveBackgroundSkillPoints): SagaDriveSkillKey[] {
  const result: SagaDriveSkillKey[] = [];
  for (const skill of sagaDriveSkillDefinitions) {
    const value = points[skill.key];
    if (value === 1) result.push(skill.key);
    else if (value === 2) {
      result.push(skill.key, skill.key);
    }
  }
  return result;
}

export function normalizeBackgroundSkillPoints(value: unknown, skillPool: readonly SagaDriveSkillKey[]): SagaDriveBackgroundSkillPoints {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return emptyBackgroundSkillPoints();
  const pool = new Set(skillPool);
  const result: SagaDriveBackgroundSkillPoints = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (!isSagaDriveSkillKey(rawKey) || !pool.has(rawKey)) continue;
    if (rawValue !== 1 && rawValue !== 2) continue;
    result[rawKey] = rawValue;
  }
  return result;
}

export function normalizeFreeSkillRanks(value: unknown): SagaDriveSkillRankMap {
  const result = createEmptySagaDriveSkillRanks();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return result;
  const record = value as Record<string, unknown>;
  for (const skill of sagaDriveSkillDefinitions) {
    const raw = record[skill.key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      result[skill.key] = Math.max(0, Math.min(5, Math.round(raw)));
    }
  }
  return result;
}

export function normalizeSkillAdvances(value: unknown): SagaDriveSkillAdvanceDto[] {
  if (!Array.isArray(value)) return [];
  const result: SagaDriveSkillAdvanceDto[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const level = typeof record.level === 'number' ? record.level : Number(record.level);
    const kind = record.kind;
    const skill = record.skill;
    if (!isSagaDriveSkillAdvanceLevel(level)) continue;
    if (kind !== 'rank-up' && kind !== 'learn') continue;
    if (typeof skill !== 'string' || !isSagaDriveSkillKey(skill)) continue;
    result.push({ level, kind, skill });
  }
  return result;
}

export function normalizeSpecializationRecords(value: unknown): SagaDriveSpecializationRecordDto[] {
  if (!Array.isArray(value)) return [];
  const result: SagaDriveSpecializationRecordDto[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const skill = record.skill;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const source = record.source;
    const acquiredAtLevel = typeof record.acquiredAtLevel === 'number' ? clampLevel(record.acquiredAtLevel) : 1;
    if (typeof skill !== 'string' || !isSagaDriveSkillKey(skill) || !name) continue;
    if (source !== 'background' && source !== 'skill-development') continue;
    result.push({ skill, name, source, acquiredAtLevel });
  }
  return result;
}

export function isValidBackgroundSkillPoints(
  points: SagaDriveBackgroundSkillPoints,
  skillPool: readonly SagaDriveSkillKey[],
): boolean {
  const pool = new Set(skillPool);
  let sum = 0;
  for (const [rawSkill, rawValue] of Object.entries(points)) {
    if (!isSagaDriveSkillKey(rawSkill) || !pool.has(rawSkill)) return false;
    if (rawValue !== 1 && rawValue !== 2) return false;
    sum += rawValue;
  }
  return sum === SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS;
}

export function isValidStartSkillBuild(
  build: SagaDriveStartSkillBuild,
  skillPool: readonly SagaDriveSkillKey[],
  archetypeKey?: SagaDriveArchetypeKey,
): boolean {
  // §4.4: the background framework pool is exactly four distinct valid SagaDrive skills.
  if (skillPool.length !== 4) return false;
  if (new Set(skillPool).size !== skillPool.length) return false;
  if (!skillPool.every(isSagaDriveSkillKey)) return false;
  if (!isValidBackgroundSkillPoints(build.backgroundSkillPoints, skillPool)) return false;
  if (sumFreeSkillRanks(build.freeSkillRanks) !== SAGA_DRIVE_START_FREE_SKILL_POINTS) return false;

  if (!archetypeKey) return false;
  const archetype = getSagaDriveArchetype(archetypeKey);
  if (!archetype) return false;
  if (!build.archetypeTrainingSkill || !archetype.skills.includes(build.archetypeTrainingSkill)) return false;

  const ranks = resolveSagaDriveStartSkillRanks(build);
  return sagaDriveSkillDefinitions.every((skill) => ranks[skill.key] <= SAGA_DRIVE_START_SKILL_CAP);
}

export function resolveSagaDriveStartSkillRanks(build: SagaDriveStartSkillBuild): SagaDriveSkillRankMap {
  const result = createEmptySagaDriveSkillRanks();
  for (const skill of sagaDriveSkillDefinitions) {
    const free = build.freeSkillRanks[skill.key] ?? 0;
    const background = build.backgroundSkillPoints[skill.key] ?? 0;
    const archetype = build.archetypeTrainingSkill === skill.key ? SAGA_DRIVE_START_ARCHETYPE_SKILL_POINTS : 0;
    result[skill.key] = free + background + archetype;
  }
  return result;
}

function applySkillAdvances(
  baseRanks: SagaDriveSkillRankMap,
  advances: readonly SagaDriveSkillAdvanceDto[],
  level: number,
): SagaDriveSkillRankMap {
  const result = { ...baseRanks };
  const sorted = [...advances]
    .filter((advance) => advance.level <= level)
    .sort((left, right) => left.level - right.level);

  for (const advance of sorted) {
    const cap = getSagaDriveSkillCap(advance.level);
    const current = result[advance.skill];
    if (advance.kind === 'learn') {
      if (current !== 0) throw new Error(`Skill advance at level ${advance.level}: learn requires rank 0 for ${advance.skill}.`);
      result[advance.skill] = 1;
      continue;
    }
    if (current < 1) throw new Error(`Skill advance at level ${advance.level}: rank-up requires trained skill ${advance.skill}.`);
    if (current + 1 > cap) throw new Error(`Skill advance at level ${advance.level}: ${advance.skill} would exceed cap ${cap}.`);
    result[advance.skill] = current + 1;
  }
  return result;
}

export function resolveSagaDriveSkillRanks(
  build: SagaDrivePersistedSkillBuild,
  level: number,
): SagaDriveSkillRankMap {
  const startRanks = resolveSagaDriveStartSkillRanks(build);
  const advances = build.skillAdvances ?? [];
  return applySkillAdvances(startRanks, advances, clampLevel(level));
}

export function isValidSkillAdvanceEntry(
  advance: SagaDriveSkillAdvanceDto,
  ranksBefore: SagaDriveSkillRankMap,
): boolean {
  const cap = getSagaDriveSkillCap(advance.level);
  const current = ranksBefore[advance.skill];
  if (advance.kind === 'learn') return current === 0 && 1 <= cap;
  return current >= 1 && current + 1 <= cap;
}

export function isValidSagaDriveSkillAdvances(
  advances: readonly SagaDriveSkillAdvanceDto[],
  build: SagaDriveStartSkillBuild,
  level: number,
): boolean {
  const normalizedLevel = clampLevel(level);
  const seenLevels = new Set<number>();
  let ranks = resolveSagaDriveStartSkillRanks(build);

  const sorted = [...advances].sort((left, right) => left.level - right.level);
  for (const advance of sorted) {
    if (advance.level > normalizedLevel) continue;
    if (!isSagaDriveSkillAdvanceLevel(advance.level)) return false;
    if (seenLevels.has(advance.level)) return false;
    seenLevels.add(advance.level);
    if (!isValidSkillAdvanceEntry(advance, ranks)) return false;
    ranks = applySkillAdvances(ranks, [advance], advance.level);
  }
  return true;
}

export function getSpecializationMinRank(existingCountForSkill: number): number | undefined {
  return SPECIALIZATION_MIN_RANK[existingCountForSkill];
}

export function isValidSpecializationForSkillRank(skillRank: number, existingCountForSkill: number): boolean {
  const minRank = getSpecializationMinRank(existingCountForSkill);
  if (minRank === undefined) return false;
  return skillRank >= minRank;
}

/** One chronological skill-development decision: an advance or a skill-development specialization. */
interface SagaDriveSkillDevelopmentEntry {
  level: number;
  kind: SagaDriveSkillAdvanceKind | 'specialization';
  skill: SagaDriveSkillKey;
  name?: string;
  advance?: SagaDriveSkillAdvanceDto;
  specialization?: SagaDriveSpecializationRecordDto;
}

function toDevelopmentTimeline(
  advances: readonly SagaDriveSkillAdvanceDto[],
  specializations: readonly SagaDriveSpecializationRecordDto[],
): SagaDriveSkillDevelopmentEntry[] {
  const entries: SagaDriveSkillDevelopmentEntry[] = [
    ...advances.map((advance) => ({
      level: advance.level,
      kind: advance.kind as SagaDriveSkillDevelopmentEntry['kind'],
      skill: advance.skill,
      advance,
    })),
    ...specializations
      .filter((entry) => entry.source === 'skill-development')
      .map((specialization) => ({
        level: specialization.acquiredAtLevel,
        kind: 'specialization' as const,
        skill: specialization.skill,
        name: specialization.name,
        specialization,
      })),
  ];
  // Chronological order; an advance wins a same-level tie over a specialization (deterministic).
  return entries.sort((left, right) => left.level - right.level || (left.kind === 'specialization' ? 1 : 0) - (right.kind === 'specialization' ? 1 : 0));
}

/**
 * Central chronological validation of all skill-development decisions (#89/#90):
 * one decision per advance level, rank prerequisites evaluated at acquisition time,
 * specialization ladder counted from background + earlier development specializations.
 */
export function isValidSagaDriveSkillDevelopment(
  build: SagaDriveStartSkillBuild,
  advances: readonly SagaDriveSkillAdvanceDto[],
  specializations: readonly SagaDriveSpecializationRecordDto[],
  level: number,
): boolean {
  const normalizedLevel = clampLevel(level);
  const specCounts = new Map<SagaDriveSkillKey, number>();
  const ranks = resolveSagaDriveStartSkillRanks(build);

  // Background specializations are acquired at creation and enter the ladder first.
  const backgroundSpecs = specializations.filter((entry) => entry.source === 'background');
  if (backgroundSpecs.length > 1) return false;
  for (const spec of backgroundSpecs) {
    if (spec.acquiredAtLevel !== 1) return false;
    const count = specCounts.get(spec.skill) ?? 0;
    // Must be bound to a skill actually trained by the background, not just a high final rank.
    if ((build.backgroundSkillPoints[spec.skill] ?? 0) <= 0) return false;
    if (!isValidSpecializationForSkillRank(ranks[spec.skill], count)) return false;
    specCounts.set(spec.skill, count + 1);
  }

  const seenLevels = new Set<number>();
  let workingRanks = ranks;
  for (const entry of toDevelopmentTimeline(advances, specializations)) {
    if (!isSagaDriveSkillAdvanceLevel(entry.level)) return false;
    if (entry.level > normalizedLevel) continue;
    if (seenLevels.has(entry.level)) return false;
    seenLevels.add(entry.level);
    if (entry.kind === 'specialization') {
      const count = specCounts.get(entry.skill) ?? 0;
      if (!entry.name?.trim()) return false;
      if (!isValidSpecializationForSkillRank(workingRanks[entry.skill], count)) return false;
      specCounts.set(entry.skill, count + 1);
      continue;
    }
    const advance: SagaDriveSkillAdvanceDto = { level: entry.level as SagaDriveSkillAdvanceLevel, kind: entry.kind, skill: entry.skill };
    if (!isValidSkillAdvanceEntry(advance, workingRanks)) return false;
    workingRanks = applySkillAdvances(workingRanks, [advance], entry.level);
  }
  // §13.3: a character of this level is built from ALL developments up to it — every
  // unlocked slot must hold exactly one decision. Above-level slots stay dormant.
  for (const unlockedLevel of getSagaDriveSkillAdvanceLevels(normalizedLevel)) {
    if (!seenLevels.has(unlockedLevel)) return false;
  }
  return true;
}

/**
 * Deterministic prune of skill-development decisions that became invalid (e.g. after an
 * earlier slot was removed). Keeps later decisions that are still valid on their own.
 */
export function sanitizeSagaDriveSkillDevelopment(
  build: SagaDriveStartSkillBuild,
  advances: readonly SagaDriveSkillAdvanceDto[],
  specializations: readonly SagaDriveSpecializationRecordDto[],
  level: number,
): { advances: SagaDriveSkillAdvanceDto[]; specializations: SagaDriveSpecializationRecordDto[] } {
  const normalizedLevel = clampLevel(level);
  const specCounts = new Map<SagaDriveSkillKey, number>();
  let workingRanks = resolveSagaDriveStartSkillRanks(build);

  const keptSpecializations: SagaDriveSpecializationRecordDto[] = [];
  for (const spec of specializations.filter((entry) => entry.source === 'background')) {
    if (keptSpecializations.length >= 1) break;
    if (spec.acquiredAtLevel !== 1) continue;
    const count = specCounts.get(spec.skill) ?? 0;
    if ((build.backgroundSkillPoints[spec.skill] ?? 0) <= 0) continue;
    if (!isValidSpecializationForSkillRank(workingRanks[spec.skill], count)) continue;
    specCounts.set(spec.skill, count + 1);
    keptSpecializations.push(spec);
  }

  const keptAdvances: SagaDriveSkillAdvanceDto[] = [];
  const seenLevels = new Set<number>();
  for (const entry of toDevelopmentTimeline(advances, specializations)) {
    if (!isSagaDriveSkillAdvanceLevel(entry.level)) continue;
    if (entry.level > normalizedLevel) {
      // Dormant decisions above the current level are preserved untouched.
      if (entry.advance) keptAdvances.push(entry.advance);
      else if (entry.specialization) keptSpecializations.push(entry.specialization);
      continue;
    }
    if (seenLevels.has(entry.level)) continue;
    if (entry.kind === 'specialization') {
      const count = specCounts.get(entry.skill) ?? 0;
      if (!entry.specialization || !entry.name?.trim()) continue;
      if (!isValidSpecializationForSkillRank(workingRanks[entry.skill], count)) continue;
      specCounts.set(entry.skill, count + 1);
      seenLevels.add(entry.level);
      keptSpecializations.push(entry.specialization);
      continue;
    }
    const advance: SagaDriveSkillAdvanceDto = { level: entry.level as SagaDriveSkillAdvanceLevel, kind: entry.kind, skill: entry.skill };
    if (!isValidSkillAdvanceEntry(advance, workingRanks)) continue;
    workingRanks = applySkillAdvances(workingRanks, [advance], entry.level);
    seenLevels.add(entry.level);
    keptAdvances.push(advance);
  }
  return { advances: keptAdvances, specializations: keptSpecializations };
}

/** Non-throwing rank resolution for editor rendering: invalid development decisions are pruned first. */
export function resolveSagaDriveSkillRanksSafe(
  build: SagaDrivePersistedSkillBuild,
  level: number,
): SagaDriveSkillRankMap {
  const { advances } = sanitizeSagaDriveSkillDevelopment(build, build.skillAdvances ?? [], build.specializations ?? [], level);
  return resolveSagaDriveSkillRanks({ ...build, skillAdvances: advances }, level);
}

export function isValidSagaDriveSpecializations(
  specializations: readonly SagaDriveSpecializationRecordDto[],
  finalRanks: SagaDriveSkillRankMap,
): boolean {
  const counts = new Map<SagaDriveSkillKey, number>();
  for (const entry of specializations) {
    const count = counts.get(entry.skill) ?? 0;
    if (count >= SAGA_DRIVE_MAX_SPECIALIZATIONS_PER_SKILL) return false;
    if (!isValidSpecializationForSkillRank(finalRanks[entry.skill], count)) return false;
    counts.set(entry.skill, count + 1);
  }
  return true;
}

/** Structure stored V2 skill fields for editor/persistence. Does not invent missing provenance. */
export function resolveSagaDriveSkillBuildState(
  input: {
    freeSkillRanks?: unknown;
    backgroundSkillPoints?: unknown;
    skillPool?: readonly SagaDriveSkillKey[];
    archetypeTrainingSkill?: SagaDriveSkillKey;
    skillAdvances?: unknown;
    specializations?: unknown;
    backgroundSpecialization?: { skill: SagaDriveSkillKey; name: string };
  },
): SagaDrivePersistedSkillBuild {
  const skillPool = input.skillPool ?? [];
  const freeSkillRanks = normalizeFreeSkillRanks(input.freeSkillRanks);
  const backgroundSkillPoints = normalizeBackgroundSkillPoints(input.backgroundSkillPoints, skillPool);
  const skillAdvances = normalizeSkillAdvances(input.skillAdvances);
  let specializations = normalizeSpecializationRecords(input.specializations);
  if (specializations.length === 0 && input.backgroundSpecialization?.name) {
    specializations = [{
      skill: input.backgroundSpecialization.skill,
      name: input.backgroundSpecialization.name,
      source: 'background',
      acquiredAtLevel: 1,
    }];
  }

  return {
    freeSkillRanks,
    backgroundSkillPoints,
    archetypeTrainingSkill: input.archetypeTrainingSkill,
    skillAdvances,
    specializations,
  };
}

export function skillRankMapsEqual(left: SagaDriveSkillRankMap, right: SagaDriveSkillRankMap): boolean {
  return sagaDriveSkillDefinitions.every((skill) => left[skill.key] === right[skill.key]);
}

export function assertSagaDriveSkillPersistence(
  finalSkills: SagaDriveSkillRankMap,
  build: SagaDrivePersistedSkillBuild,
  level: number,
  skillPool: readonly SagaDriveSkillKey[],
  archetypeKey?: SagaDriveArchetypeKey,
): void {
  if (!isValidBackgroundSkillPoints(build.backgroundSkillPoints, skillPool)) {
    throw new Error('Invalid SagaDrive skill build: background skill points must sum to 2 within the framework pool.');
  }
  if (sumFreeSkillRanks(build.freeSkillRanks) !== SAGA_DRIVE_START_FREE_SKILL_POINTS) {
    throw new Error('Invalid SagaDrive skill build: free skill ranks must sum to 7.');
  }
  if (!isValidStartSkillBuild(build, skillPool, archetypeKey)) {
    throw new Error('Invalid SagaDrive skill build: start sources violate cap, pool or archetype contract.');
  }
  // §4.4/§13.3: a complete character creation includes exactly one background specialization.
  const backgroundSpecs = (build.specializations ?? []).filter((entry) => entry.source === 'background');
  if (backgroundSpecs.length !== 1) {
    throw new Error('Invalid SagaDrive skill build: complete characters need exactly one background specialization.');
  }
  if (!isValidSagaDriveSkillDevelopment(build, build.skillAdvances ?? [], build.specializations ?? [], level)) {
    throw new Error('Invalid SagaDrive skill build: one decision per development level, prerequisites at acquisition time.');
  }

  const expected = resolveSagaDriveSkillRanks(build, level);
  if (!skillRankMapsEqual(finalSkills, expected)) {
    throw new Error('Invalid SagaDrive skill build: final skill ranks must match start sources plus level advances.');
  }

  if (build.specializations?.length && !isValidSagaDriveSpecializations(build.specializations, expected)) {
    throw new Error('Invalid SagaDrive skill build: specialization ladder violated.');
  }
}
