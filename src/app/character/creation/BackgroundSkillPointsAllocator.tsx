/**
 * Background skill point helpers — stackable 2-point budget for framework pool skills (#91).
 * Point −/+ UI lives on BackgroundSkillNode; this module owns adjust + sum helpers only.
 * Location: src/app/character/creation/BackgroundSkillPointsAllocator.tsx
 */
import {
  SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS,
  type SagaDriveBackgroundSkillPoints,
} from '../../../modules/rulesets/skillProgression';
import type { SagaDriveSkillKey } from '../../../modules/rulesets/characterCreation';

function sumBackgroundPoints(points: SagaDriveBackgroundSkillPoints): number {
  return Object.values(points).reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function sumBackgroundSkillPointsUsed(points: SagaDriveBackgroundSkillPoints): number {
  return sumBackgroundPoints(points);
}

export function backgroundSkillsWithPoints(points: SagaDriveBackgroundSkillPoints): SagaDriveSkillKey[] {
  return Object.entries(points)
    .filter(([, value]) => (value ?? 0) > 0)
    .map(([skill]) => skill as SagaDriveSkillKey);
}

/** Apply ±1 to one pool skill; fail-closed on cap (per skill ≤2) and total budget (≤2). */
export function adjustBackgroundSkillPoints(
  points: SagaDriveBackgroundSkillPoints,
  skill: SagaDriveSkillKey,
  delta: 1 | -1,
): SagaDriveBackgroundSkillPoints {
  const current = points[skill] ?? 0;
  const nextValue = current + delta;
  if (nextValue < 0 || nextValue > 2) return points;
  const next: SagaDriveBackgroundSkillPoints = { ...points };
  if (nextValue === 0) delete next[skill];
  else next[skill] = nextValue as 1 | 2;
  if (sumBackgroundPoints(next) > SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS) return points;
  return next;
}

export { SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS };
