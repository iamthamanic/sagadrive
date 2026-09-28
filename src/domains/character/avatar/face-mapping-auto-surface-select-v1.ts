/**
 * Face-mapping Auto surface-aware hit selection (#421).
 * Location: src/domains/character/avatar/face-mapping-auto-surface-select-v1.ts
 *
 * Pure domain: pick the first geometrically plausible candidate whose surface class is
 * allowed for the anchor. Does not invent bindings — infrastructure supplies ordered hits.
 *
 * Depth gates are **only** proportional to measured faceWidthWorld (interocular world).
 * No absolute world-unit floors — asset scale must not change selection semantics.
 */

import type { SagaDriveFaceAnchorId } from './face-anchor-contract';
import {
  classifyFaceMappingSurfaceFromNodeIdentity,
  isFaceMappingSurfaceSemanticsOk,
  type FaceMappingSurfaceClassV1,
} from './face-mapping-surface-semantics-v1';

export const FACE_MAPPING_AUTO_SURFACE_SELECT_VERSION =
  'SagaDriveFaceMappingAutoSurfaceSelectV1' as const;

/** Strict same-ray gate as fraction of measured face width (~eyelid/skin sheet). */
export const FACE_MAPPING_SURFACE_SELECT_STRICT_FACE_WIDTH_RATIO = 0.08 as const;

/** Auto-only expanded same-ray gate as fraction of measured face width. */
export const FACE_MAPPING_SURFACE_SELECT_EXPANDED_FACE_WIDTH_RATIO = 0.2 as const;

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
  /** Depth gate used (world units). 0 when no face scale — front-only / fail-closed. */
  readonly maxDepthDelta: number;
}

export interface FaceMappingWorldPoint3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Shared face-mapping world scale: Euclidean distance between outer-canthus world points.
 * Returns null when either point is missing or distance is non-finite / too small.
 */
export function computeFaceMappingFaceWidthWorld(
  leftOuter: FaceMappingWorldPoint3 | null | undefined,
  rightOuter: FaceMappingWorldPoint3 | null | undefined,
): number | null {
  if (!leftOuter || !rightOuter) return null;
  if (
    !Number.isFinite(leftOuter.x) ||
    !Number.isFinite(leftOuter.y) ||
    !Number.isFinite(leftOuter.z) ||
    !Number.isFinite(rightOuter.x) ||
    !Number.isFinite(rightOuter.y) ||
    !Number.isFinite(rightOuter.z)
  ) {
    return null;
  }
  const d = Math.hypot(
    leftOuter.x - rightOuter.x,
    leftOuter.y - rightOuter.y,
    leftOuter.z - rightOuter.z,
  );
  if (!Number.isFinite(d) || d <= 1e-6) return null;
  return d;
}

function resolveValidFaceWidthWorld(
  faceWidthWorld: number | null | undefined,
): number | null {
  if (
    faceWidthWorld != null &&
    Number.isFinite(faceWidthWorld) &&
    faceWidthWorld > 1e-6
  ) {
    return faceWidthWorld;
  }
  return null;
}

/**
 * Strict depth gate — only when measured faceWidthWorld is available.
 * Returns null when scale is unknown (caller must fail-closed for deeper hits).
 */
export function resolveFaceMappingSurfaceSelectMaxDepthDelta(
  _firstDistance: number,
  options?: { faceWidthWorld?: number | null },
): number | null {
  const faceW = resolveValidFaceWidthWorld(options?.faceWidthWorld);
  if (faceW == null) return null;
  return faceW * FACE_MAPPING_SURFACE_SELECT_STRICT_FACE_WIDTH_RATIO;
}

/**
 * Expanded same-ray depth gate (Auto only) — proportional to face width.
 * Returns null when face width is missing/invalid (skip expand).
 */
export function resolveFaceMappingSameRayExpandedMaxDepthDelta(
  options?: { faceWidthWorld?: number | null },
): number | null {
  const faceW = resolveValidFaceWidthWorld(options?.faceWidthWorld);
  if (faceW == null) return null;
  return faceW * FACE_MAPPING_SURFACE_SELECT_EXPANDED_FACE_WIDTH_RATIO;
}

/**
 * Select first semantically allowed candidate within the depth gate of hits[0].
 *
 * With face scale: strict proportional gate; Auto may expand once (same ray).
 * Without face scale: only a front-hit that is already allowed (gate 0) — never pick a
 * deeper layer using absolute world meters. Manual should pass allowSameRayExpandedDepth=false.
 */
export function selectFaceMappingSurfaceAwareCandidate(
  candidates: readonly FaceMappingSurfaceSelectCandidateInputV1[],
  anchorId: SagaDriveFaceAnchorId,
  options?: {
    faceWidthWorld?: number | null;
    maxDepthDelta?: number;
    /** When true (default), Auto may expand depth once. Manual must set false. */
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
  const faceW = resolveValidFaceWidthWorld(options?.faceWidthWorld);
  const resolvedStrict =
    options?.maxDepthDelta != null && Number.isFinite(options.maxDepthDelta)
      ? options.maxDepthDelta
      : resolveFaceMappingSurfaceSelectMaxDepthDelta(firstDistance, {
          faceWidthWorld: faceW,
        });
  // No absolute world-unit fallback — without scale only accept depthDelta === 0.
  const maxDepthDelta = resolvedStrict ?? 0;

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
  if (
    allowExpand &&
    faceW != null &&
    strict.strategy === 'depth_rejected_only' &&
    options?.maxDepthDelta == null
  ) {
    const expanded = resolveFaceMappingSameRayExpandedMaxDepthDelta({
      faceWidthWorld: faceW,
    });
    if (expanded != null && expanded > maxDepthDelta + 1e-9) {
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
