/**
 * Combat-profile adjustments applied after level benchmark, before role HP.
 * Location: src/domains/rules/sagadrive/npc-creature-power/profiles.ts
 */
import type { SagaDriveCombatProfile, SagaDriveProfileAdjustments } from './types';

const IDENTITY: SagaDriveProfileAdjustments = {
  healthMultiplier: 1,
  defenseDelta: 0,
  primaryAttackDelta: 0,
  meleeAttackDelta: 0,
  rangedAttackDelta: 0,
  controlEffectDelta: 0,
  bodyOrDurabilityResistDelta: 0,
  reflexResistDelta: 0,
  mindOrControlResistDelta: 0,
  weakestResistDelta: 0,
  movementDeltaMeters: 0,
  damageStepDelta: 0,
  requiresRangedPrimary: false,
  combatSignatureRequired: true,
};

export const SAGADRIVE_COMBAT_PROFILE_ADJUSTMENTS: Record<
  SagaDriveCombatProfile,
  SagaDriveProfileAdjustments
> = {
  noncombat: {
    ...IDENTITY,
    defenseDelta: -1,
    combatSignatureRequired: false,
  },
  balanced: { ...IDENTITY },
  tough: {
    ...IDENTITY,
    healthMultiplier: 1.2,
    bodyOrDurabilityResistDelta: 1,
    movementDeltaMeters: -3,
    damageStepDelta: -1,
  },
  offensive: {
    ...IDENTITY,
    primaryAttackDelta: 1,
    damageStepDelta: 1,
    defenseDelta: -1,
    weakestResistDelta: -1,
  },
  mobile: {
    ...IDENTITY,
    defenseDelta: 1,
    reflexResistDelta: 1,
    movementDeltaMeters: 3,
    healthMultiplier: 0.8,
  },
  ranged: {
    ...IDENTITY,
    rangedAttackDelta: 1,
    movementDeltaMeters: 3,
    meleeAttackDelta: -1,
    healthMultiplier: 0.8,
    requiresRangedPrimary: true,
  },
  control_support: {
    ...IDENTITY,
    controlEffectDelta: 1,
    mindOrControlResistDelta: 1,
    primaryAttackDelta: -1,
    damageStepDelta: -1,
  },
};

export function profileAdjustmentsFor(
  profile: SagaDriveCombatProfile,
): SagaDriveProfileAdjustments {
  return SAGADRIVE_COMBAT_PROFILE_ADJUSTMENTS[profile];
}

/**
 * Apply resistance slot deltas without exceeding SagaDrive skill/attribute caps.
 * Caps: displayed resistance values stay within defense±4 and never invent a
 * hidden modifier beyond the primary modifier ceiling at that level.
 */
export function applyResistanceSlotDeltas(
  base: { high: number; normal: number; low: number },
  deltas: {
    high?: number;
    normal?: number;
    low?: number;
    bodyOrDurability?: number;
    reflex?: number;
    mindOrControl?: number;
    weakest?: number;
  },
  defense: number,
  primaryModifierCap: number,
): { high: number; normal: number; low: number } {
  const clamp = (value: number): number => {
    const byDefense = Math.min(defense + 4, Math.max(defense - 4, value));
    return Math.min(primaryModifierCap + 8, Math.max(0, byDefense));
  };

  let high = base.high + (deltas.high ?? 0) + (deltas.bodyOrDurability ?? 0);
  let normal = base.normal + (deltas.normal ?? 0) + (deltas.reflex ?? 0);
  let low = base.low + (deltas.low ?? 0) + (deltas.mindOrControl ?? 0);

  const weakestDelta = deltas.weakest ?? 0;
  if (weakestDelta !== 0) {
    const slots = [
      { key: 'high' as const, value: high },
      { key: 'normal' as const, value: normal },
      { key: 'low' as const, value: low },
    ];
    slots.sort((a, b) => a.value - b.value);
    const weakest = slots[0]!;
    if (weakest.key === 'high') high += weakestDelta;
    if (weakest.key === 'normal') normal += weakestDelta;
    if (weakest.key === 'low') low += weakestDelta;
  }

  return {
    high: clamp(high),
    normal: clamp(normal),
    low: clamp(low),
  };
}
