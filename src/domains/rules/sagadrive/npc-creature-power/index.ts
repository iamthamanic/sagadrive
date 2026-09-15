/**
 * NPC/creature compact power framework — public rules-kernel API.
 * Location: src/domains/rules/sagadrive/npc-creature-power/index.ts
 */
export type {
  SagaDriveCombatProfile,
  SagaDriveCombatRole,
  SagaDriveCombatRoleRules,
  SagaDriveCompactStatblockBenchmarks,
  SagaDriveCompactStatblockInput,
  SagaDriveDamageStep,
  SagaDriveLevelBenchmark,
  SagaDriveMachtgrad,
  SagaDriveNpcLevel,
  SagaDriveProfileAdjustments,
  SagaDriveResistanceSlots,
} from './types';

export {
  SAGADRIVE_MACHTGRAD_LABELS,
  assertSagaDriveNpcLevel,
  isSagaDriveNpcLevel,
  machtgradForLevel,
  machtgradLabelForLevel,
} from './machtgrad';

export {
  SAGADRIVE_NPC_DAMAGE_STEPS,
  impulseDamageStepBelowPrimary,
  shiftNpcDamageStep,
} from './damage-steps';

export {
  SAGADRIVE_NPC_LEVEL_BENCHMARKS,
  levelBenchmark,
  signatureAbilityBudgetForMachtgrad,
} from './benchmarks';

export {
  SAGADRIVE_COMBAT_PROFILE_ADJUSTMENTS,
  applyResistanceSlotDeltas,
  profileAdjustmentsFor,
} from './profiles';

export {
  SAGADRIVE_COMBAT_ROLE_RULES,
  combineHealth,
  combatRoleRulesFor,
  impulsesAllowed,
  normalizeCombatRoleForProfile,
} from './combat-roles';

export { computeCompactStatblockBenchmarks } from './compute';
