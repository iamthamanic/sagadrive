/**
 * Face-mapping Auto surface-aware hit selection (#421).
 * Location: src/domains/character/avatar/face-mapping-auto-surface-select-v1.ts
 *
 * Pure domain: pick the first geometrically plausible candidate whose surface class is
 * allowed for the anchor. Does not invent bindings — infrastructure supplies ordered hits.
 */

import type { SagaDriveFaceAnchorId } from './face-anchor-contract';
import {
  classifyFaceMappingSurfaceFromNodeIdentity,
  isFaceMappingSurfaceSemanticsOk,
  type FaceMappingSurfaceClassV1,
} from './face-mapping-surface-semantics-v1';

export const FACE_MAPPING_AUTO_SURFACE_SELECT_VERSION =
  'SagaDriveFaceMappingAutoSurfaceSelectV1' as const;

export interface FaceMappingSurfaceSelectCandidateInputV1 {
  readonly order: number;
  readonly distance: number;
  readonly nodeIdentity: string;
}

export interface FaceMappingSurfaceSelectCandidateDiagV1 {
  readonly order: number;
  readonly distance: number;
  readonly nodeIdentity: string;
  readonly surfaceClass: FaceMappingSurfaceClassV1;
  readonly allowed: boolean;
  readonly depthDeltaFromFirst: number;
}

export type FaceMappingSurfaceSelectStrategyV1 =
  | 'first_allowed_depth_gated'
  | 'same_ray_expanded_depth'
  | 'none_allowed'
  | 'depth_rejected_only'
  | 'empty';

export interface FaceMappingSurfaceSelectResultV1 {
  readonly selectedIndex: number | null;
  readonly strategy: FaceMappingSurfaceSelectStrategyV1;
  readonly candidates: readonly FaceMappingSurfaceSelectCandidateDiagV1[];
  /** Absolute depth gate used (world units). */
  readonly maxDepthDelta: number;
}

/**
 * Depth gate: allow a later hit only if it is close behind the nearest hit.
 * Avoids mapping through the eyeball onto the far side of the head.
 *
 * Prefer face-scale (`faceWidthWorld`); never scale by camera-to-surface distance
 * (that would accept rear-head Body hits when the face camera is far away).
 */
export function resolveFaceMappingSurfaceSelectMaxDepthDelta(
  _firstDistance: number,
  options?: { faceWidthWorld?: number | null },
): number {
  const faceW =
    options?.faceWidthWorld != null &&
    Number.isFinite(options.faceWidthWorld) &&
    options.faceWidthWorld > 1e-6
      ? options.faceWidthWorld
      : null;
  if (faceW != null) {
    // ~8% of face width — eyelid/skin sheet thickness, not skull depth.
    return Math.max(0.008, faceW * 0.08);
  }
  // Absolute fallback for human-scale assets (~1.5 cm).
  return 0.015;
}

/**
 * Expanded same-ray depth gate: prefer an allowed hit on the **original** MediaPipe
 * screen ray over screen-snap that moves the anatomical target (#421 eye evidence).
 * Still face-scale (~20% face width) — not through-head.
 */
export function resolveFaceMappingSameRayExpandedMaxDepthDelta(
  options?: { faceWidthWorld?: number | null },
): number {
  const faceW =
    options?.faceWidthWorld != null &&
    Number.isFinite(options.faceWidthWorld) &&
    options.faceWidthWorld > 1e-6
      ? options.faceWidthWorld
      : null;
  if (faceW != null) {
    return Math.max(0.02, faceW * 0.2);
  }
  return 0.04;
}

/**
 * Select first semantically allowed candidate within the depth gate of hits[0].
 * When the strict gate only finds allowed hits slightly deeper (`depth_rejected_only`),
 * retry once with an expanded face-scale gate so Auto keeps the original screen point
 * instead of immediately screen-snapping (eye lid evidence).
 */
export function selectFaceMappingSurfaceAwareCandidate(
  candidates: readonly FaceMappingSurfaceSelectCandidateInputV1[],
  anchorId: SagaDriveFaceAnchorId,
  options?: {
    faceWidthWorld?: number | null;
    maxDepthDelta?: number;
    /** When true (default), expand depth once before returning depth_rejected_only. */
    allowSameRayExpandedDepth?: boolean;
  },
): FaceMappingSurfaceSelectResultV1 {
  if (candidates.length === 0) {
    return {
      selectedIndex: null,
      strategy: 'empty',
      candidates: [],
      maxDepthDelta: 0,
    };
  }

  const firstDistance = candidates[0]?.distance ?? 0;
  const maxDepthDelta =
    options?.maxDepthDelta ??
    resolveFaceMappingSurfaceSelectMaxDepthDelta(firstDistance, {
      faceWidthWorld: options?.faceWidthWorld,
    });

  const runPass = (
    gate: number,
    strategyOnHit: FaceMappingSurfaceSelectStrategyV1,
  ): FaceMappingSurfaceSelectResultV1 => {
    const diags: FaceMappingSurfaceSelectCandidateDiagV1[] = [];
    let selectedIndex: number | null = null;
    let sawAllowedBeyondDepth = false;

    for (let i = 0; i < candidates.length; i += 1) {
      const c = candidates[i]!;
      const surfaceClass = classifyFaceMappingSurfaceFromNodeIdentity(c.nodeIdentity);
      const allowed = isFaceMappingSurfaceSemanticsOk(anchorId, surfaceClass);
      const depthDeltaFromFirst = Math.max(0, c.distance - firstDistance);
      diags.push({
        order: c.order,
        distance: c.distance,
        nodeIdentity: c.nodeIdentity,
        surfaceClass,
        allowed,
        depthDeltaFromFirst,
      });
      if (!allowed || selectedIndex != null) continue;
      if (depthDeltaFromFirst <= gate) {
        selectedIndex = i;
      } else {
        sawAllowedBeyondDepth = true;
      }
    }

    let strategy: FaceMappingSurfaceSelectStrategyV1;
    if (selectedIndex != null) strategy = strategyOnHit;
    else if (sawAllowedBeyondDepth) strategy = 'depth_rejected_only';
    else if (diags.some((d) => d.allowed)) strategy = 'depth_rejected_only';
    else strategy = 'none_allowed';

    return {
      selectedIndex,
      strategy,
      candidates: diags,
      maxDepthDelta: gate,
    };
  };

  const strict = runPass(maxDepthDelta, 'first_allowed_depth_gated');
  if (strict.selectedIndex != null) return strict;

  const allowExpand = options?.allowSameRayExpandedDepth !== false;
  if (allowExpand && strict.strategy === 'depth_rejected_only' && options?.maxDepthDelta == null) {
    const expanded = resolveFaceMappingSameRayExpandedMaxDepthDelta({
      faceWidthWorld: options?.faceWidthWorld,
    });
    if (expanded > maxDepthDelta + 1e-9) {
      const second = runPass(expanded, 'same_ray_expanded_depth');
      if (second.selectedIndex != null) return second;
      return { ...strict, candidates: second.candidates, maxDepthDelta: expanded };
    }
  }

  return strict;
}

export type FaceMappingScreenSnapBiasV1 = 'up' | 'down' | 'radial';

/** Preferred local search bias for lid/canthus screen snap. */
export function faceMappingScreenSnapBiasForAnchor(
  anchorId: SagaDriveFaceAnchorId,
): FaceMappingScreenSnapBiasV1 {
  if (anchorId === 'eyeLeftUpper' || anchorId === 'eyeRightUpper') return 'up';
  if (anchorId === 'eyeLeftLower' || anchorId === 'eyeRightLower') return 'down';
  return 'radial';
}

/**
 * Small neighborhood offsets in canvas px, ordered by preferred lid/canthus bias.
 * Radius scales with interocular distance (fallback when iod unknown).
 */
export function buildFaceMappingScreenSnapOffsets(input: {
  bias: FaceMappingScreenSnapBiasV1;
  interocularPx: number | null;
}): readonly { readonly dx: number; readonly dy: number }[] {
  const iod =
    input.interocularPx != null &&
    Number.isFinite(input.interocularPx) &&
    input.interocularPx > 1
      ? input.interocularPx
      : 80;
  const step = Math.max(2, iod * 0.04);
  const maxR = Math.max(6, iod * 0.12);
  const out: { dx: number; dy: number }[] = [];
  const push = (dx: number, dy: number) => {
    if (dx === 0 && dy === 0) return;
    out.push({ dx, dy });
  };

  // Preferred axis first (screen Y grows downward).
  if (input.bias === 'up') {
    for (let r = step; r <= maxR + 1e-6; r += step) push(0, -r);
    for (let r = step; r <= maxR + 1e-6; r += step) {
      push(-r * 0.5, -r);
      push(r * 0.5, -r);
    }
  } else if (input.bias === 'down') {
    for (let r = step; r <= maxR + 1e-6; r += step) push(0, r);
    for (let r = step; r <= maxR + 1e-6; r += step) {
      push(-r * 0.5, r);
      push(r * 0.5, r);
    }
  } else {
    for (let r = step; r <= maxR + 1e-6; r += step) {
      push(-r, 0);
      push(r, 0);
      push(0, -r);
      push(0, r);
      push(-r * 0.7, -r * 0.7);
      push(r * 0.7, -r * 0.7);
      push(-r * 0.7, r * 0.7);
      push(r * 0.7, r * 0.7);
    }
  }
  return out;
}
