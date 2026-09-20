/**
 * combat-create-opportunity — §7.4 Hauptaktion „Gelegenheit schaffen“.
 * Location: src/domains/rules/sagadrive/combat-create-opportunity/index.ts
 *
 * Pure rules kernel: eligibility gate, grade → named advantage sources,
 * and §2.5 same-source anti-stack for follow-up checks. Domain-pure only.
 */

import { PROBE_GRADES, type ProbeGrade, isProbeGrade } from '../probe';

export const CREATE_OPPORTUNITY_ACTION_ID = 'create-opportunity' as const;

/** Core actions (§7.4) and maneuvers (§7.6) that always take precedence. */
export const DEFINED_COMBAT_ACTION_IDS = Object.freeze([
  'attack',
  'dash',
  'disengage',
  'defend',
  'help',
  'ready',
  'hide',
  'grapple',
  'escape',
  'shove',
  'trip',
  'disarm',
] as const);

export type DefinedCombatActionId = (typeof DEFINED_COMBAT_ACTION_IDS)[number];

export type CreateOpportunityDenyReason =
  | 'existing-action-takes-precedence'
  | 'no-plausible-tactical-effect'
  | 'follow-up-undeclared';

export interface CreateOpportunityEligibilityInput {
  /** True when fiction is already covered by a defined core action or maneuver. */
  coversExistingAction: boolean;
  /** False for pure flavor with no tactical follow-up. */
  hasPlausibleTacticalEffect: boolean;
  /** Follow-up check ids named before the roll (order = grant order). */
  declaredFollowUpCheckIds: readonly string[];
}

export type CreateOpportunityEligibility =
  | { allowed: true }
  | { allowed: false; reason: CreateOpportunityDenyReason };

export type OpportunityBeneficiary = 'actor-side' | 'opponent-vs-actor';

export interface CreateOpportunityAdvantageSource {
  /** Stable named source for §2.5 folding — never invents a numeric bonus. */
  sourceId: string;
  opportunityId: string;
  followUpCheckId: string;
  beneficiary: OpportunityBeneficiary;
}

/** Standard mechanical outputs this action must never invent. */
export const CREATE_OPPORTUNITY_FORBIDDEN_OUTPUTS = Object.freeze({
  damage: true,
  freeCondition: true,
  forcedMovement: true,
  actionLoss: true,
  numericBonus: true,
  /** §2.3: no general success-at-a-cost in direct combat. */
  successAtCost: true,
} as const);

export interface CreateOpportunityResolution {
  actionCost: 'hauptaktion';
  actionId: typeof CREATE_OPPORTUNITY_ACTION_ID;
  grade: ProbeGrade;
  grantedAdvantageSources: readonly CreateOpportunityAdvantageSource[];
  opponentAdvantageSources: readonly CreateOpportunityAdvantageSource[];
  forbiddenOutputs: typeof CREATE_OPPORTUNITY_FORBIDDEN_OUTPUTS;
}

export type AdvantageFoldMode = 'normal' | 'advantage' | 'disadvantage';

export function isDefinedCombatActionId(value: string): value is DefinedCombatActionId {
  return (DEFINED_COMBAT_ACTION_IDS as readonly string[]).includes(value);
}

/**
 * Gate before any check: defined actions/maneuvers win; flavor-only denied;
 * success grades require at least one declared follow-up id.
 */
export function evaluateCreateOpportunityEligibility(
  input: CreateOpportunityEligibilityInput,
): CreateOpportunityEligibility {
  if (input.coversExistingAction) {
    return { allowed: false, reason: 'existing-action-takes-precedence' };
  }
  if (!input.hasPlausibleTacticalEffect) {
    return { allowed: false, reason: 'no-plausible-tactical-effect' };
  }
  const declared = input.declaredFollowUpCheckIds.filter((id) => id.trim().length > 0);
  if (declared.length === 0) {
    return { allowed: false, reason: 'follow-up-undeclared' };
  }
  return { allowed: true };
}

function sourceIdFor(
  opportunityId: string,
  slot: number,
  beneficiary: OpportunityBeneficiary,
): string {
  return `create-opportunity:${opportunityId}:${beneficiary}:${slot}`;
}

/**
 * Map probe grade → named advantage grants. Never deals damage, conditions,
 * forced movement, action loss, numeric bonuses, or success-at-a-cost.
 */
export function resolveCreateOpportunity(input: {
  opportunityId: string;
  grade: ProbeGrade;
  declaredFollowUpCheckIds: readonly string[];
}): CreateOpportunityResolution {
  if (!isProbeGrade(input.grade)) {
    throw new Error('Ungültiger Erfolgsgrad für „Gelegenheit schaffen“.');
  }
  if (input.opportunityId.trim().length === 0) {
    throw new Error('opportunityId ist erforderlich.');
  }

  const declared = input.declaredFollowUpCheckIds.filter((id) => id.trim().length > 0);
  const granted: CreateOpportunityAdvantageSource[] = [];
  const opponent: CreateOpportunityAdvantageSource[] = [];

  if (input.grade === PROBE_GRADES.SUCCESS || input.grade === PROBE_GRADES.CRIT_SUCCESS) {
    const slots = input.grade === PROBE_GRADES.CRIT_SUCCESS ? 2 : 1;
    for (let i = 0; i < slots; i += 1) {
      const followUpCheckId = declared[i];
      if (!followUpCheckId) break;
      granted.push({
        sourceId: sourceIdFor(input.opportunityId, i + 1, 'actor-side'),
        opportunityId: input.opportunityId,
        followUpCheckId,
        beneficiary: 'actor-side',
      });
    }
  } else if (input.grade === PROBE_GRADES.CRIT_FAILURE) {
    const followUpCheckId = declared[0] ?? 'next-matching-action-vs-actor';
    opponent.push({
      sourceId: sourceIdFor(input.opportunityId, 1, 'opponent-vs-actor'),
      opportunityId: input.opportunityId,
      followUpCheckId,
      beneficiary: 'opponent-vs-actor',
    });
  }
  // FAILURE → no opportunity grants

  return {
    actionCost: 'hauptaktion',
    actionId: CREATE_OPPORTUNITY_ACTION_ID,
    grade: input.grade,
    grantedAdvantageSources: granted,
    opponentAdvantageSources: opponent,
    forbiddenOutputs: CREATE_OPPORTUNITY_FORBIDDEN_OUTPUTS,
  };
}

/**
 * Select opportunity sources that apply to a follow-up check.
 * Same sourceId (and same opportunityId) cannot modify the same check twice (§2.5).
 */
export function selectApplicableOpportunitySources(input: {
  sources: readonly CreateOpportunityAdvantageSource[];
  followUpCheckId: string;
  beneficiary: OpportunityBeneficiary;
  alreadyAppliedSourceIds: readonly string[];
}): {
  applicable: readonly CreateOpportunityAdvantageSource[];
  rejectedDuplicateSourceIds: readonly string[];
} {
  const applied = new Set(input.alreadyAppliedSourceIds);
  const seenOpportunityIds = new Set<string>();
  const applicable: CreateOpportunityAdvantageSource[] = [];
  const rejected: string[] = [];

  for (const source of input.sources) {
    if (source.followUpCheckId !== input.followUpCheckId) continue;
    if (source.beneficiary !== input.beneficiary) continue;
    if (applied.has(source.sourceId) || seenOpportunityIds.has(source.opportunityId)) {
      rejected.push(source.sourceId);
      continue;
    }
    applicable.push(source);
    applied.add(source.sourceId);
    seenOpportunityIds.add(source.opportunityId);
  }

  return { applicable, rejectedDuplicateSourceIds: rejected };
}

/**
 * §2.5 folding: each advantage source cancels one disadvantage source;
 * remaining net never exceeds a single advantage or disadvantage mode.
 */
export function foldNamedAdvantageSources(input: {
  advantageSourceIds: readonly string[];
  disadvantageSourceIds: readonly string[];
}): {
  mode: AdvantageFoldMode;
  remainingAdvantage: number;
  remainingDisadvantage: number;
  d20Count: 1 | 2;
} {
  const uniqueAdv = [...new Set(input.advantageSourceIds)];
  const uniqueDis = [...new Set(input.disadvantageSourceIds)];
  const cancelled = Math.min(uniqueAdv.length, uniqueDis.length);
  const remainingAdvantage = uniqueAdv.length - cancelled;
  const remainingDisadvantage = uniqueDis.length - cancelled;

  if (remainingAdvantage > 0) {
    return {
      mode: 'advantage',
      remainingAdvantage,
      remainingDisadvantage: 0,
      d20Count: 2,
    };
  }
  if (remainingDisadvantage > 0) {
    return {
      mode: 'disadvantage',
      remainingAdvantage: 0,
      remainingDisadvantage,
      d20Count: 2,
    };
  }
  return {
    mode: 'normal',
    remainingAdvantage: 0,
    remainingDisadvantage: 0,
    d20Count: 1,
  };
}
