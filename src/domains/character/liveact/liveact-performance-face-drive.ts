/**
 * Performance Face V2 drive — hybrid/semantic → Premium control weights (#451).
 * Location: src/domains/character/liveact/liveact-performance-face-drive.ts
 *
 * Explicit mapping only. No morph indices, no asset-name heuristics.
 * Pure domain: no React / Three / MediaPipe.
 */

import type { LiveActFaceChannels } from './liveact-face-contract';
import { clampLiveActChannel } from './liveact-face-contract';
import type { LiveActHybridFaceV1 } from './liveact-hybrid-face-contract';
import {
  PERFORMANCE_FACE_ALL_CONTROLS,
  clampPerformanceFaceWeight,
  type PerformanceFaceControlId,
} from './liveact-performance-face-contract';

function hybridOrFace(
  hybrid: LiveActHybridFaceV1 | null,
  face: LiveActFaceChannels | null,
  hybridKey: keyof LiveActHybridFaceV1['controls'],
  faceKey: keyof LiveActFaceChannels,
): number {
  const h = hybrid?.controls[hybridKey];
  if (h && typeof h.value === 'number' && Number.isFinite(h.value)) {
    return clampPerformanceFaceWeight(h.value);
  }
  if (face && typeof face[faceKey] === 'number') {
    return clampLiveActChannel(face[faceKey]);
  }
  return 0;
}

function max2(a: number, b: number): number {
  return a >= b ? a : b;
}

/**
 * Map anatomical hybrid/semantic signals onto PerformanceFace Premium controls.
 */
export function drivePerformanceFaceWeights(input: {
  hybrid: LiveActHybridFaceV1 | null;
  face: LiveActFaceChannels | null;
}): Readonly<Partial<Record<PerformanceFaceControlId, number>>> {
  const { hybrid, face } = input;
  const out: Partial<Record<PerformanceFaceControlId, number>> = {
    nasolabialFoldLeft: hybridOrFace(hybrid, face, 'noseSneerLeft', 'noseSneerLeft'),
    nasolabialFoldRight: hybridOrFace(hybrid, face, 'noseSneerRight', 'noseSneerRight'),
    cheekVolumeLeft: max2(
      hybridOrFace(hybrid, face, 'cheekSquintLeft', 'cheekSquintLeft'),
      hybridOrFace(hybrid, face, 'cheekPuff', 'cheekPuff') * 0.85,
    ),
    cheekVolumeRight: max2(
      hybridOrFace(hybrid, face, 'cheekSquintRight', 'cheekSquintRight'),
      hybridOrFace(hybrid, face, 'cheekPuff', 'cheekPuff') * 0.85,
    ),
    lipContourUpperLeft: hybridOrFace(
      hybrid,
      face,
      'mouthUpperUpLeft',
      'mouthUpperUpLeft',
    ),
    lipContourUpperRight: hybridOrFace(
      hybrid,
      face,
      'mouthUpperUpRight',
      'mouthUpperUpRight',
    ),
    lipContourLowerLeft: hybridOrFace(
      hybrid,
      face,
      'mouthLowerDownLeft',
      'mouthLowerDownLeft',
    ),
    lipContourLowerRight: hybridOrFace(
      hybrid,
      face,
      'mouthLowerDownRight',
      'mouthLowerDownRight',
    ),
    lidTightenLeft: face ? clampLiveActChannel(face.eyeSquintLeft) : 0,
    lidTightenRight: face ? clampLiveActChannel(face.eyeSquintRight) : 0,
  };

  for (const id of PERFORMANCE_FACE_ALL_CONTROLS) {
    const w = out[id];
    if (w === undefined) continue;
    out[id] = clampPerformanceFaceWeight(w);
  }
  return out;
}

/**
 * Contour proxy for Premium path: mean of upper/lower lip contour L/R weights.
 * Used when avatar morphs are synthetic/applied in gate (no mesh sampling).
 */
export function measurePerformanceFaceContourProxy(
  weights: Readonly<Partial<Record<PerformanceFaceControlId, number>>>,
): { mean: number; sampleCount: number; status: 'MEASURED' | 'NOT_MEASURED' } {
  const keys: PerformanceFaceControlId[] = [
    'lipContourUpperLeft',
    'lipContourUpperRight',
    'lipContourLowerLeft',
    'lipContourLowerRight',
  ];
  let sum = 0;
  let n = 0;
  for (const id of keys) {
    const w = weights[id];
    if (typeof w === 'number' && Number.isFinite(w)) {
      sum += w;
      n += 1;
    }
  }
  if (n === 0) return { mean: 0, sampleCount: 0, status: 'NOT_MEASURED' };
  return { mean: sum / n, sampleCount: n, status: 'MEASURED' };
}
