/**
 * NPC/creature compact-statblock power types (Core §15).
 * Location: src/domains/rules/sagadrive/npc-creature-power/types.ts
 */

export type SagaDriveNpcLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export type SagaDriveMachtgrad = 'gering' | 'mittel' | 'hoch' | 'extrem' | 'legendaer';

export type SagaDriveCombatRole = 'standard' | 'elite' | 'boss';

export type SagaDriveCombatProfile =
  | 'noncombat'
  | 'balanced'
  | 'tough'
  | 'offensive'
  | 'mobile'
  | 'ranged'
  | 'control_support';

export type SagaDriveDamageStep = {
  dice: number;
  sides: number;
  flat: number;
  label: string;
};

export type SagaDriveResistanceSlots = {
  high: number;
  normal: number;
  low: number;
};

export type SagaDriveLevelBenchmark = {
  level: SagaDriveNpcLevel;
  machtgrad: SagaDriveMachtgrad;
  experienceBonus: number;
  primarySkillRank: number;
  primaryModifier: number;
  defense: number;
  resistances: SagaDriveResistanceSlots;
  health: number;
  baseDamage: SagaDriveDamageStep;
  attributeDefaults: readonly [number, number, number, number, number, number];
};

export type SagaDriveProfileAdjustments = {
  healthMultiplier: number;
  defenseDelta: number;
  primaryAttackDelta: number;
  meleeAttackDelta: number;
  rangedAttackDelta: number;
  controlEffectDelta: number;
  bodyOrDurabilityResistDelta: number;
  reflexResistDelta: number;
  mindOrControlResistDelta: number;
  weakestResistDelta: number;
  movementDeltaMeters: number;
  damageStepDelta: number;
  requiresRangedPrimary: boolean;
  combatSignatureRequired: boolean;
};

export type SagaDriveCombatRoleRules = {
  role: SagaDriveCombatRole;
  healthMultiplier: number;
  threatUnitsSameLevel: number;
  impulsesPerRound: number;
  wendepunktPerCombat: number;
  signatureAbilityBonus: number;
  minImpulseOptions: number;
};

export type SagaDriveCompactStatblockInput = {
  level: number;
  combatProfile: SagaDriveCombatProfile;
  combatRole: SagaDriveCombatRole;
  /** Base movement in meters before profile shifts (default 9). */
  baseMovementMeters?: number;
  /** When true, impulses are unavailable (Kampfunfähig). */
  incapacitated?: boolean;
};

export type SagaDriveCompactStatblockBenchmarks = {
  level: SagaDriveNpcLevel;
  machtgrad: SagaDriveMachtgrad;
  machtgradLabel: string;
  combatProfile: SagaDriveCombatProfile;
  combatRole: SagaDriveCombatRole;
  experienceBonus: number;
  primarySkillRank: number;
  primaryModifier: number;
  defense: number;
  resistances: SagaDriveResistanceSlots;
  baseHealth: number;
  health: number;
  baseDamage: SagaDriveDamageStep;
  primaryDamage: SagaDriveDamageStep;
  attributeDefaults: readonly [number, number, number, number, number, number];
  movementMeters: number;
  threatUnitsSameLevel: number;
  impulsesPerRound: number;
  wendepunktPerCombat: number;
  signatureAbilityBudget: number;
  minImpulseOptions: number;
  impulsesAllowed: boolean;
  combatSignatureRequired: boolean;
  requiresRangedPrimary: boolean;
  primaryAttackDelta: number;
  meleeAttackDelta: number;
  rangedAttackDelta: number;
  controlEffectDelta: number;
};
