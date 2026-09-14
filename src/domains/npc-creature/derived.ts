/**
 * Derived NPC/creature presentation helpers using the power framework (#196).
 * Location: src/domains/npc-creature/derived.ts
 *
 * Domain-pure: no React, no Supabase, no UI imports.
 */

import {
  computeCompactStatblockBenchmarks,
  machtgradForLevel,
  machtgradLabelForLevel,
  type SagaDriveCompactStatblockBenchmarks,
  type SagaDriveMachtgrad,
} from '../rules/sagadrive/npc-creature-power';
import type { NpcCreatureDefinition } from './definition';

export interface NpcCreatureDerivedPower {
  machtgrad: SagaDriveMachtgrad;
  machtgradLabel: string;
  benchmarks: SagaDriveCompactStatblockBenchmarks;
}

/** Derive Machtgrad + compact benchmarks from a validated definition. */
export function deriveNpcCreaturePower(
  definition: NpcCreatureDefinition,
): NpcCreatureDerivedPower {
  const benchmarks = computeCompactStatblockBenchmarks({
    level: definition.level,
    combatProfile: definition.combatProfile,
    combatRole: definition.combatRole,
  });
  return {
    machtgrad: machtgradForLevel(definition.level),
    machtgradLabel: machtgradLabelForLevel(definition.level),
    benchmarks,
  };
}
