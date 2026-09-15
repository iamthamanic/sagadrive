/**
 * NPC damage step ladder (Core §15 / benchmarks design).
 * Location: src/domains/rules/sagadrive/npc-creature-power/damage-steps.ts
 */
import type { SagaDriveDamageStep } from './types';

export const SAGADRIVE_NPC_DAMAGE_STEPS: readonly SagaDriveDamageStep[] = Object.freeze([
  { dice: 1, sides: 4, flat: 1, label: 'd4+1' },
  { dice: 1, sides: 6, flat: 1, label: 'd6+1' },
  { dice: 1, sides: 8, flat: 1, label: 'd8+1' },
  { dice: 1, sides: 8, flat: 2, label: 'd8+2' },
  { dice: 1, sides: 10, flat: 2, label: 'd10+2' },
  { dice: 1, sides: 10, flat: 3, label: 'd10+3' },
  { dice: 1, sides: 12, flat: 3, label: 'd12+3' },
  { dice: 1, sides: 12, flat: 4, label: 'd12+4' },
]);

function stepIndex(step: SagaDriveDamageStep): number {
  const index = SAGADRIVE_NPC_DAMAGE_STEPS.findIndex(
    (candidate) =>
      candidate.dice === step.dice && candidate.sides === step.sides && candidate.flat === step.flat,
  );
  if (index < 0) {
    throw new Error(`Unbekannte Schadensstufe: ${step.label}`);
  }
  return index;
}

/** Move +/- N steps on the ladder; clamps at ends unless ability overrides. */
export function shiftNpcDamageStep(step: SagaDriveDamageStep, delta: number): SagaDriveDamageStep {
  const next = Math.min(
    SAGADRIVE_NPC_DAMAGE_STEPS.length - 1,
    Math.max(0, stepIndex(step) + delta),
  );
  return SAGADRIVE_NPC_DAMAGE_STEPS[next]!;
}

/** Offensive Elite-/Boss-Impuls: at least one step below primary. */
export function impulseDamageStepBelowPrimary(primary: SagaDriveDamageStep): SagaDriveDamageStep {
  return shiftNpcDamageStep(primary, -1);
}
