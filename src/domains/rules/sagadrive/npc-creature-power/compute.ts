/**
 * Compose level → profile → role into compact statblock benchmarks.
 * Location: src/domains/rules/sagadrive/npc-creature-power/compute.ts
 */
import { levelBenchmark, signatureAbilityBudgetForMachtgrad } from './benchmarks';
import {
  combineHealth,
  combatRoleRulesFor,
  impulsesAllowed,
  normalizeCombatRoleForProfile,
} from './combat-roles';
import { shiftNpcDamageStep } from './damage-steps';
import { assertSagaDriveNpcLevel, machtgradLabelForLevel } from './machtgrad';
import { applyResistanceSlotDeltas, profileAdjustmentsFor } from './profiles';
import type {
  SagaDriveCompactStatblockBenchmarks,
  SagaDriveCompactStatblockInput,
  SagaDriveCombatProfile,
  SagaDriveCombatRole,
} from './types';

const DEFAULT_MOVEMENT_METERS = 9;

const PROFILES: readonly SagaDriveCombatProfile[] = [
  'noncombat',
  'balanced',
  'tough',
  'offensive',
  'mobile',
  'ranged',
  'control_support',
];

const ROLES: readonly SagaDriveCombatRole[] = ['standard', 'elite', 'boss'];

function assertProfile(value: string): SagaDriveCombatProfile {
  if ((PROFILES as readonly string[]).includes(value)) {
    return value as SagaDriveCombatProfile;
  }
  throw new Error(`Unbekanntes Kampfprofil: ${value}`);
}

function assertRole(value: string): SagaDriveCombatRole {
  if ((ROLES as readonly string[]).includes(value)) {
    return value as SagaDriveCombatRole;
  }
  throw new Error(`Unbekannte Kampfrolle: ${value}`);
}

/**
 * Deterministic compact-statblock benchmarks.
 * Order: level benchmark → profile → role → (gear/abilities later).
 * Combat role never changes attack, defense, resistances, or base damage.
 */
export function computeCompactStatblockBenchmarks(
  input: SagaDriveCompactStatblockInput,
): SagaDriveCompactStatblockBenchmarks {
  const level = assertSagaDriveNpcLevel(input.level);
  const combatProfile = assertProfile(input.combatProfile);
  const combatRole = normalizeCombatRoleForProfile(combatProfile, assertRole(input.combatRole));
  const base = levelBenchmark(level);
  const profile = profileAdjustmentsFor(combatProfile);
  const role = combatRoleRulesFor(combatRole);

  const defense = base.defense + profile.defenseDelta;
  const primaryModifier = base.primaryModifier + profile.primaryAttackDelta;
  // Cap: profile attack deltas must not invent hidden values past EB+skill+attr ceiling.
  // Primary mod formula is already the legal display value; refuse silent overshoot by clamping only the delta remainder into signature space (caller responsibility). We keep the delta applied when within +2 of formula.
  if (Math.abs(profile.primaryAttackDelta) > 1) {
    throw new Error('Kampfprofil darf Primärangriff höchstens um ±1 verschieben');
  }

  const resistances = applyResistanceSlotDeltas(
    base.resistances,
    {
      bodyOrDurability: profile.bodyOrDurabilityResistDelta,
      reflex: profile.reflexResistDelta,
      mindOrControl: profile.mindOrControlResistDelta,
      weakest: profile.weakestResistDelta,
    },
    defense,
    primaryModifier,
  );

  const primaryDamage =
    combatProfile === 'noncombat'
      ? shiftNpcDamageStep(base.baseDamage, -7)
      : shiftNpcDamageStep(base.baseDamage, profile.damageStepDelta);

  const health = combineHealth(base.health, profile.healthMultiplier, role.healthMultiplier);
  const movementMeters = Math.max(
    0,
    (input.baseMovementMeters ?? DEFAULT_MOVEMENT_METERS) + profile.movementDeltaMeters,
  );
  const incapacitated = input.incapacitated === true;

  return {
    level,
    machtgrad: base.machtgrad,
    machtgradLabel: machtgradLabelForLevel(level),
    combatProfile,
    combatRole,
    experienceBonus: base.experienceBonus,
    primarySkillRank: base.primarySkillRank,
    primaryModifier,
    defense,
    resistances,
    baseHealth: base.health,
    health,
    baseDamage: base.baseDamage,
    primaryDamage,
    attributeDefaults: base.attributeDefaults,
    movementMeters,
    threatUnitsSameLevel: role.threatUnitsSameLevel,
    impulsesPerRound: role.impulsesPerRound,
    wendepunktPerCombat: role.wendepunktPerCombat,
    signatureAbilityBudget:
      signatureAbilityBudgetForMachtgrad(base.machtgrad) + role.signatureAbilityBonus,
    minImpulseOptions: role.minImpulseOptions,
    impulsesAllowed: impulsesAllowed(combatRole, incapacitated),
    combatSignatureRequired: profile.combatSignatureRequired,
    requiresRangedPrimary: profile.requiresRangedPrimary,
    primaryAttackDelta: profile.primaryAttackDelta,
    meleeAttackDelta: profile.meleeAttackDelta,
    rangedAttackDelta: profile.rangedAttackDelta,
    controlEffectDelta: profile.controlEffectDelta,
  };
}
