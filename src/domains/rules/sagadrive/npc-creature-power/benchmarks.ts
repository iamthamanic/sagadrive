/**
 * Binding level 1–20 Standard+Balanced benchmarks for compact NPC/creatures.
 * Location: src/domains/rules/sagadrive/npc-creature-power/benchmarks.ts
 */
import { machtgradForLevel } from './machtgrad';
import { SAGADRIVE_NPC_DAMAGE_STEPS } from './damage-steps';
import type {
  SagaDriveLevelBenchmark,
  SagaDriveMachtgrad,
  SagaDriveNpcLevel,
} from './types';

const ATTRIBUTE_DEFAULTS: Record<
  SagaDriveMachtgrad,
  readonly [number, number, number, number, number, number]
> = {
  gering: [3, 2, 2, 1, 1, 0],
  mittel: [3, 3, 2, 2, 1, 0],
  hoch: [4, 3, 3, 2, 1, 0],
  extrem: [4, 4, 3, 2, 1, 0],
  legendaer: [5, 4, 3, 2, 1, 0],
};

function primarySkillRank(level: SagaDriveNpcLevel): number {
  // Spec table: pairs of levels share ranks with stepped growth.
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 6) return 3;
  if (level <= 8) return 4;
  if (level <= 10) return 3;
  if (level <= 12) return 4;
  if (level <= 14) return 4;
  if (level <= 16) return 5;
  if (level <= 18) return 4;
  return 5;
}

function resistanceSlots(level: SagaDriveNpcLevel): { high: number; normal: number; low: number } {
  if (level <= 4) return { high: 14, normal: 13, low: 11 };
  if (level <= 8) return { high: 15, normal: 14, low: 12 };
  if (level <= 12) return { high: 17, normal: 16, low: 13 };
  if (level <= 16) return { high: 18, normal: 17, low: 14 };
  return { high: 20, normal: 19, low: 15 };
}

function baseDamageIndex(level: SagaDriveNpcLevel): number {
  if (level <= 4) return 1; // d6+1
  if (level <= 8) return 2; // d8+1
  if (level <= 12) return 3; // d8+2
  if (level <= 16) return 4; // d10+2
  return 5; // d10+3
}

function buildLevel(level: SagaDriveNpcLevel): SagaDriveLevelBenchmark {
  const machtgrad = machtgradForLevel(level);
  const experienceBonus = 1 + Math.floor((level - 1) / 4);
  const primaryModifier = 6 + Math.floor((level - 1) / 2);
  const defense = 14 + Math.floor((level - 1) / 2);
  const health = 18 + 2 * Math.floor((level - 1) / 4);
  return {
    level,
    machtgrad,
    experienceBonus,
    primarySkillRank: primarySkillRank(level),
    primaryModifier,
    defense,
    resistances: resistanceSlots(level),
    health,
    baseDamage: SAGADRIVE_NPC_DAMAGE_STEPS[baseDamageIndex(level)]!,
    attributeDefaults: ATTRIBUTE_DEFAULTS[machtgrad],
  };
}

export const SAGADRIVE_NPC_LEVEL_BENCHMARKS: readonly SagaDriveLevelBenchmark[] = Object.freeze(
  Array.from({ length: 20 }, (_, index) => buildLevel((index + 1) as SagaDriveNpcLevel)),
);

export function levelBenchmark(level: number): SagaDriveLevelBenchmark {
  const row = SAGADRIVE_NPC_LEVEL_BENCHMARKS[level - 1];
  if (!row) {
    throw new Error(`Kein Benchmark für Stufe ${String(level)}`);
  }
  return row;
}

/** Signature ability count guideline by Machtgrad (Standard baseline). */
export function signatureAbilityBudgetForMachtgrad(machtgrad: SagaDriveMachtgrad): number {
  switch (machtgrad) {
    case 'gering':
      return 1;
    case 'mittel':
    case 'hoch':
      return 2;
    case 'extrem':
    case 'legendaer':
      return 3;
    default: {
      const _exhaustive: never = machtgrad;
      return _exhaustive;
    }
  }
}
