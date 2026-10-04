/**
 * liveact-temporal-contract — SagaDrive Adaptive Temporal Solver V1 (#448).
 * Location: src/domains/character/liveact/liveact-temporal-contract.ts
 *
 * Time-based, signal-group policies. No MediaPipe/React/Three.
 * Temporal ≠ range calibration ≠ personal calib (#449) ≠ retarget.
 */

import type { LiveActFaceChannelId } from './liveact-face-contract';
import { LIVEACT_FACE_CHANNELS } from './liveact-face-contract';

export const LIVEACT_TEMPORAL_CONTRACT = 'SagaDriveLiveActTemporalV1' as const;
export const LIVEACT_TEMPORAL_POLICY_VERSION = 'liveact-temporal-policy-v1' as const;

/** Signal groups with shared continuous-time one-pole policies. */
export const LIVEACT_TEMPORAL_SIGNAL_GROUPS = [
  'head',
  'gaze',
  'blink',
  'lips',
  'brows',
  'cheeksNose',
  'defaultFace',
] as const;

export type LiveActTemporalSignalGroup = (typeof LIVEACT_TEMPORAL_SIGNAL_GROUPS)[number];

export type LiveActTemporalLifecycleMode = 'active' | 'lost' | 'rebase';

export interface LiveActTemporalGroupPolicyV1 {
  readonly group: LiveActTemporalSignalGroup;
  /** Slow/small motion time constant (ms). */
  readonly tauSlowMs: number;
  /** Fast/intentional motion time constant (ms). */
  readonly tauFastMs: number;
  /** Speed at/below → response 0 (units per second). */
  readonly speedSlow: number;
  /** Speed at/above → response 1 (units per second). */
  readonly speedFast: number;
}

/**
 * Predeclared generic policies (design). Tuning fixtures only — do not retune
 * against validation after freeze.
 */
export const LIVEACT_TEMPORAL_POLICIES: Readonly<
  Record<LiveActTemporalSignalGroup, LiveActTemporalGroupPolicyV1>
> = {
  head: { group: 'head', tauSlowMs: 90, tauFastMs: 28, speedSlow: 0.4, speedFast: 3.5 },
  gaze: { group: 'gaze', tauSlowMs: 18, tauFastMs: 6, speedSlow: 0.8, speedFast: 8 },
  blink: { group: 'blink', tauSlowMs: 6, tauFastMs: 3, speedSlow: 2, speedFast: 20 },
  // Lips: keep tauSlow low enough that mid-speech average speed still retains ≥90% at 5 Hz.
  lips: { group: 'lips', tauSlowMs: 18, tauFastMs: 7, speedSlow: 0.35, speedFast: 5 },
  brows: { group: 'brows', tauSlowMs: 50, tauFastMs: 16, speedSlow: 0.5, speedFast: 6 },
  cheeksNose: {
    group: 'cheeksNose',
    tauSlowMs: 42,
    tauFastMs: 14,
    speedSlow: 0.5,
    speedFast: 6,
  },
  defaultFace: {
    group: 'defaultFace',
    tauSlowMs: 42,
    tauFastMs: 14,
    speedSlow: 0.5,
    speedFast: 6,
  },
};

/** Default nominal frame spacing when dt invalid. */
export const LIVEACT_TEMPORAL_DEFAULT_DT_MS = 1000 / 30;
/** Clamp lower bound for filter dt. */
export const LIVEACT_TEMPORAL_MIN_DT_MS = 1;
/** Clamp upper bound for filter dt (dropped-frame safety). */
export const LIVEACT_TEMPORAL_MAX_DT_MS = 100;
/** Gaps above this rebase temporal state from current target. */
export const LIVEACT_TEMPORAL_LONG_GAP_MS = 250;

const BLINK_IDS = new Set<LiveActFaceChannelId>(['eyeBlinkLeft', 'eyeBlinkRight']);
const BROW_IDS = new Set<LiveActFaceChannelId>([
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
]);
const LIP_IDS = new Set<LiveActFaceChannelId>([
  'jawOpen',
  'jawForward',
  'jawLeft',
  'jawRight',
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
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthClose',
  'mouthLeft',
  'mouthRight',
  'mouthShrugLower',
  'mouthShrugUpper',
]);
const CHEEK_NOSE_IDS = new Set<LiveActFaceChannelId>([
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'noseSneerLeft',
  'noseSneerRight',
]);

export function temporalGroupForFaceChannel(
  id: LiveActFaceChannelId,
): LiveActTemporalSignalGroup {
  if (BLINK_IDS.has(id)) return 'blink';
  if (BROW_IDS.has(id)) return 'brows';
  if (LIP_IDS.has(id)) return 'lips';
  if (CHEEK_NOSE_IDS.has(id)) return 'cheeksNose';
  return 'defaultFace';
}

/** Scalar slots tracked in O(1) temporal state (not a history buffer). */
export type LiveActTemporalScalarKey =
  | 'head.yaw'
  | 'head.pitch'
  | 'head.roll'
  | 'eyeLeft.x'
  | 'eyeLeft.y'
  | 'eyeRight.x'
  | 'eyeRight.y'
  | 'confidence'
  | `face.${LiveActFaceChannelId}`;

export function temporalFaceKey(id: LiveActFaceChannelId): LiveActTemporalScalarKey {
  return `face.${id}`;
}

export function allTemporalScalarKeys(): readonly LiveActTemporalScalarKey[] {
  const keys: LiveActTemporalScalarKey[] = [
    'head.yaw',
    'head.pitch',
    'head.roll',
    'eyeLeft.x',
    'eyeLeft.y',
    'eyeRight.x',
    'eyeRight.y',
    'confidence',
  ];
  for (const id of LIVEACT_FACE_CHANNELS) {
    keys.push(temporalFaceKey(id));
  }
  return keys;
}

export function temporalGroupForScalarKey(
  key: LiveActTemporalScalarKey,
): LiveActTemporalSignalGroup {
  if (key.startsWith('head.')) return 'head';
  if (key.startsWith('eyeLeft.') || key.startsWith('eyeRight.')) return 'gaze';
  if (key === 'confidence') return 'defaultFace';
  if (key.startsWith('face.')) {
    const id = key.slice('face.'.length) as LiveActFaceChannelId;
    return temporalGroupForFaceChannel(id);
  }
  return 'defaultFace';
}

/**
 * O(1) temporal state — prior filtered + prior input for speed, timestamp, lifecycle.
 * Local/ephemeral only; never persisted.
 */
export interface LiveActTemporalStateV1 {
  readonly contractVersion: typeof LIVEACT_TEMPORAL_CONTRACT;
  readonly policyVersion: typeof LIVEACT_TEMPORAL_POLICY_VERSION;
  readonly timestampMs: number;
  readonly mode: LiveActTemporalLifecycleMode;
  /** Prior filtered outputs keyed by scalar slot. */
  readonly filtered: Readonly<Partial<Record<LiveActTemporalScalarKey, number>>>;
  /** Prior inputs used for speed estimate. */
  readonly priorInput: Readonly<Partial<Record<LiveActTemporalScalarKey, number>>>;
}

export function createEmptyTemporalState(
  timestampMs = 0,
  mode: LiveActTemporalLifecycleMode = 'rebase',
): LiveActTemporalStateV1 {
  return {
    contractVersion: LIVEACT_TEMPORAL_CONTRACT,
    policyVersion: LIVEACT_TEMPORAL_POLICY_VERSION,
    timestampMs,
    mode,
    filtered: {},
    priorInput: {},
  };
}

/** Hard targets used by gate / evidence (predeclared). */
export const LIVEACT_TEMPORAL_TARGETS = {
  lipAmplitudeRetentionMinPct: 90,
  lipAmplitudeRetentionMaxPct: 110,
  lipLagP95MsMax: 66,
  lipReturnLagMsMax: 70,
  lipSaturationMax: 0.05,
  gazeLagSlackMsVsV1: 20,
  headLagSlackMsVsV1: 40,
  blinkPeakMin: 0.95,
  fpsInvarianceTol: 0.08,
} as const;
