/**
 * Standard / Elite / Boss combat-role overlay (durability + impulses only).
 * Location: src/domains/rules/sagadrive/npc-creature-power/combat-roles.ts
 */
import type { SagaDriveCombatProfile, SagaDriveCombatRole, SagaDriveCombatRoleRules } from './types';

export const SAGADRIVE_COMBAT_ROLE_RULES: Record<SagaDriveCombatRole, SagaDriveCombatRoleRules> = {
  standard: {
    role: 'standard',
    healthMultiplier: 1,
    threatUnitsSameLevel: 1,
    impulsesPerRound: 0,
    wendepunktPerCombat: 0,
    signatureAbilityBonus: 0,
    minImpulseOptions: 0,
  },
  elite: {
    role: 'elite',
    healthMultiplier: 1.5,
    threatUnitsSameLevel: 2,
    impulsesPerRound: 1,
    wendepunktPerCombat: 0,
    signatureAbilityBonus: 1,
    minImpulseOptions: 1,
  },
  boss: {
    role: 'boss',
    healthMultiplier: 2.5,
    threatUnitsSameLevel: 4,
    impulsesPerRound: 2,
    wendepunktPerCombat: 1,
    signatureAbilityBonus: 2,
    minImpulseOptions: 2,
  },
};

export function combatRoleRulesFor(role: SagaDriveCombatRole): SagaDriveCombatRoleRules {
  return SAGADRIVE_COMBAT_ROLE_RULES[role];
}

/** Nichtkämpferisch hides/defaults Standard; Elite/Boss impulses remain combat-only. */
export function normalizeCombatRoleForProfile(
  profile: SagaDriveCombatProfile,
  role: SagaDriveCombatRole,
): SagaDriveCombatRole {
  if (profile === 'noncombat') return 'standard';
  return role;
}

/**
 * Round combined profile×role HP once, upward, at the end.
 */
export function combineHealth(
  baseHealth: number,
  profileMultiplier: number,
  roleMultiplier: number,
): number {
  if (!Number.isFinite(baseHealth) || baseHealth < 0) {
    throw new Error('Ungültige Basis-Gesundheit');
  }
  return Math.ceil(baseHealth * profileMultiplier * roleMultiplier);
}

export function impulsesAllowed(role: SagaDriveCombatRole, incapacitated: boolean): boolean {
  if (incapacitated) return false;
  return combatRoleRulesFor(role).impulsesPerRound > 0;
}
