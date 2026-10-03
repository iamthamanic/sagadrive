/**
 * liveact-hybrid-face-contract — SagaDrive Hybrid Face V1 (#447).
 * Location: src/domains/character/liveact/liveact-hybrid-face-contract.ts
 *
 * Provider-neutral semantic performance controls fused from ARKit-style channels
 * + #445 dense geometry. No raw landmarks. No morph indices. Not #448/#449/#450.
 */

import {
  LIVEACT_FACE_CHANNELS,
  type LiveActFaceChannelId,
  type LiveActFaceChannelPartial,
} from './liveact-face-contract';

export const LIVEACT_HYBRID_FACE_CONTRACT = 'SagaDriveLiveActHybridFaceV1' as const;

/** Per-control evidence classification — never hidden. */
export type LiveActHybridFaceSourceState =
  | 'semantic'
  | 'hybrid'
  | 'dense'
  | 'unavailable';

/** Controls that may receive dense fusion (others pass through as semantic). */
export const LIVEACT_HYBRID_FACE_CONTROL_IDS = [
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
  'mouthFunnel',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthRollUpper',
  'mouthRollLower',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'cheekSquintLeft',
  'cheekSquintRight',
  'cheekPuff',
  'noseSneerLeft',
  'noseSneerRight',
  'jawOpen',
  'jawForward',
] as const satisfies readonly LiveActFaceChannelId[];

export type LiveActHybridFaceControlId = (typeof LIVEACT_HYBRID_FACE_CONTROL_IDS)[number];

export interface LiveActHybridControlResultV1 {
  readonly value: number | null;
  readonly confidence: number;
  readonly source: LiveActHybridFaceSourceState;
  /** Semantic input used for this control (null if absent). */
  readonly semanticInput: number | null;
  /** Dense-derived evidence scalar in [0,1] when available. */
  readonly denseEvidence: number | null;
}

export type LiveActHybridControlsV1 = Readonly<
  Record<LiveActHybridFaceControlId, LiveActHybridControlResultV1>
>;

export interface LiveActHybridFaceV1 {
  readonly contractVersion: typeof LIVEACT_HYBRID_FACE_CONTRACT;
  readonly sequence: number;
  readonly timestampMs: number;
  readonly presence: boolean;
  readonly denseSequenceAligned: boolean;
  readonly controls: LiveActHybridControlsV1;
}

/** Meaningful motion absolute-error improvement vs V1 (predeclared). */
export const LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT = 0.05 as const;
/** Clean baseline non-degradation tolerance. */
export const LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL = 0.02 as const;
/** Dense confidence below this → semantic fallback for that control. */
export const LIVEACT_HYBRID_DENSE_MIN_CONFIDENCE = 0.45 as const;
/** |semantic − denseEvidence| above this with both high conf → disagreement path. */
export const LIVEACT_HYBRID_DISAGREE_ABS = 0.35 as const;

export function isHybridFaceControlId(id: string): id is LiveActHybridFaceControlId {
  return (LIVEACT_HYBRID_FACE_CONTROL_IDS as readonly string[]).includes(id);
}

export function unavailableHybridControl(
  semanticInput: number | null = null,
): LiveActHybridControlResultV1 {
  return {
    value: null,
    confidence: 0,
    source: 'unavailable',
    semanticInput,
    denseEvidence: null,
  };
}

export function semanticPassthroughControl(
  semantic: number | null,
  confidence = 1,
): LiveActHybridControlResultV1 {
  if (semantic === null || !Number.isFinite(semantic)) {
    return unavailableHybridControl(null);
  }
  const v = clamp01(semantic);
  return {
    value: v,
    confidence: clamp01(confidence),
    source: 'semantic',
    semanticInput: v,
    denseEvidence: null,
  };
}

export function createEmptyHybridFace(input: {
  sequence: number;
  timestampMs: number;
}): LiveActHybridFaceV1 {
  const controls = {} as Record<LiveActHybridFaceControlId, LiveActHybridControlResultV1>;
  for (const id of LIVEACT_HYBRID_FACE_CONTROL_IDS) {
    controls[id] = unavailableHybridControl(null);
  }
  return {
    contractVersion: LIVEACT_HYBRID_FACE_CONTRACT,
    sequence: input.sequence,
    timestampMs: input.timestampMs,
    presence: false,
    denseSequenceAligned: false,
    controls: controls as LiveActHybridControlsV1,
  };
}

/** Flatten hybrid controls into a face partial for LiveActFrameV1.face. */
export function hybridControlsToFacePartial(
  hybrid: LiveActHybridFaceV1,
): LiveActFaceChannelPartial {
  const out: Partial<Record<LiveActFaceChannelId, number>> = {};
  for (const id of LIVEACT_HYBRID_FACE_CONTROL_IDS) {
    const c = hybrid.controls[id];
    if (c.value !== null && Number.isFinite(c.value)) {
      out[id] = c.value;
    }
  }
  return out;
}

export function assertHybridFaceLocalOnly(frame: LiveActHybridFaceV1): void {
  const record = frame as LiveActHybridFaceV1 & {
    landmarks?: unknown;
    geometry?: unknown;
    video?: unknown;
    serialize?: unknown;
  };
  if (
    record.landmarks !== undefined ||
    record.geometry !== undefined ||
    record.video !== undefined ||
    record.serialize !== undefined
  ) {
    throw new Error(
      'HybridFace darf keine Rohlandmark-/Geometry-/Video-/Serialize-Daten tragen.',
    );
  }
  for (const id of LIVEACT_FACE_CHANNELS) {
    void id;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}
