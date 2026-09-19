/**
 * body-profile-metrics — derive metric lengths from structure evidence (#253).
 * Location: src/infrastructure/character/avatar/body-profile-metrics.ts
 *
 * Uses Analysis Evidence bone/mesh counts as a bounded proxy when full
 * world-space bone positions are unavailable. Prefer explicit metric input
 * from a future bounds pass; never invent family from species labels.
 */

import {
  bodyProfileFromMetricLengths,
  resolveFamilyCompatibility,
  type AvatarStructureAnalysisResultV2,
  type BodyProfileV1,
  type FamilyCompatibilityResultV1,
  type HumanoidMetricLengthsV1,
} from '../../../domains/character/avatar';

/**
 * Heuristic metrics from structure analysis when only bone presence is known.
 * Stable & deterministic — not a visual “looks compact” guess.
 * Returns null when evidence is insufficient for humanoid matching.
 */
export function estimateHumanoidMetricsFromStructureAnalysis(
  analysis: AvatarStructureAnalysisResultV2,
): HumanoidMetricLengthsV1 | null {
  if (analysis.anatomy !== 'humanoid') return null;
  if (analysis.humanoidBoneCount < 8) return null;

  // Canonical adult height in meters; limb ratios vary by bone coverage proxy.
  const height = 1.7;
  const coverage = Math.min(1, analysis.humanoidBoneCount / 17);
  const skinnedBoost = analysis.evidence.skinnedMeshCount > 0 ? 1 : 0.9;

  return {
    height,
    shoulderWidth: 0.44 * coverage * skinnedBoost,
    hipWidth: 0.34 * coverage,
    torsoLength: 0.51 * coverage,
    legLength: 0.82 * coverage,
    armLength: 0.75 * coverage,
    headHeight: 0.22,
  };
}

export function resolveFamilyCompatibilityFromAnalysis(
  analysis: AvatarStructureAnalysisResultV2,
  metricsOverride?: HumanoidMetricLengthsV1,
): { profile: BodyProfileV1; compatibility: FamilyCompatibilityResultV1 } {
  const metrics =
    metricsOverride ?? estimateHumanoidMetricsFromStructureAnalysis(analysis);

  if (!metrics) {
    const profile = bodyProfileFromMetricLengths({
      height: 0,
      shoulderWidth: 0,
      hipWidth: 0,
      torsoLength: 0,
      legLength: 0,
      armLength: 0,
      headHeight: 0,
    });
    return {
      profile,
      compatibility: resolveFamilyCompatibility({
        profile,
        anatomy: analysis.anatomy,
      }),
    };
  }

  const profile = bodyProfileFromMetricLengths(metrics);
  return {
    profile,
    compatibility: resolveFamilyCompatibility({
      profile,
      anatomy: analysis.anatomy,
    }),
  };
}
