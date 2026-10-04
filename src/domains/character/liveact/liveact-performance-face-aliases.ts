/**
 * Performance Face V2 control → morph/expression target aliases (#450).
 * Location: src/domains/character/liveact/liveact-performance-face-aliases.ts
 *
 * Explicit table only — no fuzzy Premium detection, no filename heuristics.
 */

import {
  PERFORMANCE_FACE_ALL_CONTROLS,
  type PerformanceFaceControlId,
} from './liveact-performance-face-contract';

function pascalCase(id: string): string {
  if (!id.length) return id;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function aliasesForControl(id: PerformanceFaceControlId): readonly string[] {
  const list: string[] = [id, pascalCase(id)];
  // Underscore / spaced exporter variants (explicit, finite).
  const underscored = id.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  if (underscored !== id) list.push(underscored);
  return list;
}

export const PERFORMANCE_FACE_TARGET_ALIASES: Readonly<
  Record<PerformanceFaceControlId, readonly string[]>
> = Object.fromEntries(
  PERFORMANCE_FACE_ALL_CONTROLS.map((id) => [id, aliasesForControl(id)]),
) as Record<PerformanceFaceControlId, readonly string[]>;

export interface PerformanceFaceTargetResolution {
  supported: ReadonlySet<PerformanceFaceControlId>;
  resolvedNames: Readonly<Partial<Record<PerformanceFaceControlId, string>>>;
}

/**
 * Resolve PerformanceFace controls against present morph/expression names.
 */
export function resolvePerformanceFaceTargets(
  presentTargetNames: readonly string[],
): PerformanceFaceTargetResolution {
  const present = new Set(presentTargetNames);
  const resolvedNames: Partial<Record<PerformanceFaceControlId, string>> = {};
  const supported = new Set<PerformanceFaceControlId>();

  for (const id of PERFORMANCE_FACE_ALL_CONTROLS) {
    const aliases = PERFORMANCE_FACE_TARGET_ALIASES[id];
    const match = aliases.find((alias) => present.has(alias));
    if (match) {
      supported.add(id);
      resolvedNames[id] = match;
    }
  }

  return { supported, resolvedNames };
}
