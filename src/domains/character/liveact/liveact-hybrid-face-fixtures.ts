/**
 * liveact-hybrid-face-fixtures — deterministic hybrid face A/B fixtures (#447).
 * Location: src/domains/character/liveact/liveact-hybrid-face-fixtures.ts
 *
 * Latent performance truth is independent of dense observation.
 * V1 = semantic observation; Hybrid = fusion(semantic, dense).
 * No unseeded randomness. No baseline sabotage.
 */

import {
  LIVEACT_DENSE_FACE_FEATURES_CONTRACT,
  createEmptyDenseFaceFeatures,
  type DenseScalarFeatureV1,
  type LiveActDenseFaceFeaturesV1,
} from './liveact-dense-face-features-contract';
import type { LiveActFaceChannelPartial } from './liveact-face-contract';

export const LIVEACT_HYBRID_FACE_FIXTURE_IDS = [
  'hy-neutral',
  'hy-clean-smile-bilateral',
  'hy-smile-under-response',
  'hy-smile-over-response',
  'hy-smile-left-only',
  'hy-smile-right-only',
  'hy-smile-asymmetric',
  'hy-pucker',
  'hy-pucker-under',
  'hy-funnel',
  'hy-press',
  'hy-upper-lower',
  'hy-cheek',
  'hy-nose-sneer',
  'hy-jaw',
  'hy-dense-unavailable',
  'hy-dense-stale-sequence',
  'hy-semantic-noisy',
  'hy-disagree',
  'hy-speech-like',
] as const;

export type LiveActHybridFaceFixtureId = (typeof LIVEACT_HYBRID_FACE_FIXTURE_IDS)[number];

/** Tuning vs validation split (Phase 45). */
export const LIVEACT_HYBRID_TUNING_FIXTURE_IDS = [
  'hy-smile-under-response',
  'hy-pucker-under',
  'hy-smile-left-only',
  'hy-clean-smile-bilateral',
] as const;

export const LIVEACT_HYBRID_VALIDATION_FIXTURE_IDS = [
  'hy-smile-over-response',
  'hy-smile-right-only',
  'hy-smile-asymmetric',
  'hy-funnel',
  'hy-press',
  'hy-cheek',
  'hy-nose-sneer',
  'hy-jaw',
  'hy-dense-unavailable',
  'hy-disagree',
  'hy-speech-like',
] as const;

export interface HybridFaceLatentTruth {
  readonly mouthSmileLeft: number;
  readonly mouthSmileRight: number;
  readonly mouthPucker: number;
  readonly mouthFunnel: number;
  readonly mouthPressLeft: number;
  readonly mouthPressRight: number;
  readonly mouthUpperUpLeft: number;
  readonly mouthUpperUpRight: number;
  readonly mouthLowerDownLeft: number;
  readonly mouthLowerDownRight: number;
  readonly cheekSquintLeft: number;
  readonly cheekSquintRight: number;
  readonly cheekPuff: number;
  readonly noseSneerLeft: number;
  readonly noseSneerRight: number;
  readonly jawOpen: number;
  readonly jawForward: number;
}

export interface HybridFaceFixtureFrame {
  readonly sequence: number;
  readonly timestampMs: number;
  readonly latent: HybridFaceLatentTruth;
  readonly semantic: LiveActFaceChannelPartial;
  readonly dense: LiveActDenseFaceFeaturesV1 | null;
  /** When set, solver must treat dense as stale if ≠ sequence. */
  readonly denseSequenceOverride?: number;
  readonly class:
    | 'clean'
    | 'under'
    | 'over'
    | 'unilateral'
    | 'unavailable'
    | 'disagree'
    | 'speech'
    | 'other';
}

function sc(v: number, conf = 1): DenseScalarFeatureV1 {
  return { available: true, value: v, confidence: conf };
}

function miss(): DenseScalarFeatureV1 {
  return { available: false, value: null, confidence: 0 };
}

function zeroTruth(): HybridFaceLatentTruth {
  return {
    mouthSmileLeft: 0,
    mouthSmileRight: 0,
    mouthPucker: 0,
    mouthFunnel: 0,
    mouthPressLeft: 0,
    mouthPressRight: 0,
    mouthUpperUpLeft: 0,
    mouthUpperUpRight: 0,
    mouthLowerDownLeft: 0,
    mouthLowerDownRight: 0,
    cheekSquintLeft: 0,
    cheekSquintRight: 0,
    cheekPuff: 0,
    noseSneerLeft: 0,
    noseSneerRight: 0,
    jawOpen: 0,
    jawForward: 0,
  };
}

function buildDenseFromLatent(
  latent: HybridFaceLatentTruth,
  sequence: number,
  opts: { noise?: number; scale?: number } = {},
): LiveActDenseFaceFeaturesV1 {
  const n = opts.noise ?? 0;
  const s = opts.scale ?? 1;
  const base = createEmptyDenseFaceFeatures({
    sequence,
    timestampMs: sequence * 33,
    faceConfidence: 1,
    normalizationStatus: 'ok',
  });
  const smileL = clamp01(latent.mouthSmileLeft * s + n);
  const smileR = clamp01(latent.mouthSmileRight * s + n);
  const pucker = clamp01(latent.mouthPucker * s);
  const funnel = clamp01(latent.mouthFunnel * s);
  const jaw = clamp01(latent.jawOpen * s);

  const station = (v: number): DenseScalarFeatureV1 => sc(v * 0.35, 0.95);

  return {
    ...base,
    presence: true,
    contractVersion: LIVEACT_DENSE_FACE_FEATURES_CONTRACT,
    lips: {
      width: sc(0.5 - pucker * 0.15 + funnel * 0.05, 0.9),
      gapLeft: sc(Math.max(0, jaw * 0.4 + latent.mouthLowerDownLeft * 0.2), 0.9),
      gapCenter: sc(Math.max(0, jaw * 0.85 + funnel * 0.25 - pucker * 0.2), 0.95),
      gapRight: sc(Math.max(0, jaw * 0.4 + latent.mouthLowerDownRight * 0.2), 0.9),
      upperContour: {
        available: true,
        confidence: 0.92,
        stations: [
          station(latent.mouthUpperUpLeft),
          station(latent.mouthUpperUpLeft),
          station((latent.mouthUpperUpLeft + latent.mouthUpperUpRight) / 2),
          station(latent.mouthUpperUpRight),
          station(latent.mouthUpperUpRight),
        ],
      },
      lowerContour: {
        available: true,
        confidence: 0.92,
        stations: [
          station(latent.mouthLowerDownLeft),
          station(latent.mouthLowerDownLeft),
          station((latent.mouthLowerDownLeft + latent.mouthLowerDownRight) / 2),
          station(latent.mouthLowerDownRight),
          station(latent.mouthLowerDownRight),
        ],
      },
      curvature: sc((smileL + smileR) * 0.45, 0.9),
      compression: sc(Math.max(pucker * 0.8, latent.mouthPressLeft, latent.mouthPressRight), 0.9),
      protrusion: sc(Math.max(pucker, funnel * 0.85), 0.9),
      cornerLeft: sc(smileL * 0.4, 0.95),
      cornerRight: sc(smileR * 0.4, 0.95),
      asymmetry: sc(smileL - smileR, 0.9),
    },
    cheeks: {
      raiseLeft: sc(Math.max(smileL * 0.7, latent.cheekSquintLeft), 0.9),
      raiseRight: sc(Math.max(smileR * 0.7, latent.cheekSquintRight), 0.9),
      compressionLeft: sc(latent.cheekSquintLeft * 0.8 + latent.cheekPuff * 0.3, 0.85),
      compressionRight: sc(latent.cheekSquintRight * 0.8 + latent.cheekPuff * 0.3, 0.85),
      volumeProxyLeft: sc(latent.cheekPuff * 0.9, 0.8),
      volumeProxyRight: sc(latent.cheekPuff * 0.9, 0.8),
    },
    nose: {
      alarLeft: sc(latent.noseSneerLeft * 0.85, 0.9),
      alarRight: sc(latent.noseSneerRight * 0.85, 0.9),
      nasolabialLeft: sc(latent.noseSneerLeft * 0.7, 0.85),
      nasolabialRight: sc(latent.noseSneerRight * 0.7, 0.85),
      width: sc(0.4 + latent.noseSneerLeft * 0.1 + latent.noseSneerRight * 0.1, 0.8),
    },
    jaw: {
      chinDrop: sc(jaw * 0.9, 0.95),
      chinForward: sc(latent.jawForward * 0.9, 0.9),
      jawWidth: sc(0.5, 0.8),
    },
    // Keep eyes/brows empty-ok from base
    eyes: base.eyes,
    brows: base.brows,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

function semanticFromLatent(
  latent: HybridFaceLatentTruth,
  opts: { scale?: number; bias?: number } = {},
): LiveActFaceChannelPartial {
  const scale = opts.scale ?? 1;
  const bias = opts.bias ?? 0;
  const map = (v: number) => clamp01(v * scale + bias);
  return {
    mouthSmileLeft: map(latent.mouthSmileLeft),
    mouthSmileRight: map(latent.mouthSmileRight),
    mouthPucker: map(latent.mouthPucker),
    mouthFunnel: map(latent.mouthFunnel),
    mouthPressLeft: map(latent.mouthPressLeft),
    mouthPressRight: map(latent.mouthPressRight),
    mouthUpperUpLeft: map(latent.mouthUpperUpLeft),
    mouthUpperUpRight: map(latent.mouthUpperUpRight),
    mouthLowerDownLeft: map(latent.mouthLowerDownLeft),
    mouthLowerDownRight: map(latent.mouthLowerDownRight),
    cheekSquintLeft: map(latent.cheekSquintLeft),
    cheekSquintRight: map(latent.cheekSquintRight),
    cheekPuff: map(latent.cheekPuff),
    noseSneerLeft: map(latent.noseSneerLeft),
    noseSneerRight: map(latent.noseSneerRight),
    jawOpen: map(latent.jawOpen),
    jawForward: map(latent.jawForward),
  };
}

function frame(
  idClass: HybridFaceFixtureFrame['class'],
  sequence: number,
  latent: HybridFaceLatentTruth,
  semantic: LiveActFaceChannelPartial,
  dense: LiveActDenseFaceFeaturesV1 | null,
  denseSequenceOverride?: number,
): HybridFaceFixtureFrame {
  return {
    sequence,
    timestampMs: sequence * 33,
    latent,
    semantic,
    dense,
    denseSequenceOverride,
    class: idClass,
  };
}

/** Single-frame fixture builder. */
export function buildHybridFaceFixture(id: LiveActHybridFaceFixtureId): HybridFaceFixtureFrame {
  const seq = 1;
  switch (id) {
    case 'hy-neutral': {
      const latent = zeroTruth();
      return frame('clean', seq, latent, semanticFromLatent(latent), buildDenseFromLatent(latent, seq));
    }
    case 'hy-clean-smile-bilateral': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.7, mouthSmileRight: 0.7, cheekSquintLeft: 0.35, cheekSquintRight: 0.35 };
      return frame('clean', seq, latent, semanticFromLatent(latent), buildDenseFromLatent(latent, seq));
    }
    case 'hy-smile-under-response': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.75, mouthSmileRight: 0.75, cheekSquintLeft: 0.4, cheekSquintRight: 0.4 };
      // Semantic under-responds; dense tracks latent
      return frame(
        'under',
        seq,
        latent,
        semanticFromLatent(latent, { scale: 0.35 }),
        buildDenseFromLatent(latent, seq),
      );
    }
    case 'hy-smile-over-response': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.55, mouthSmileRight: 0.55 };
      return frame(
        'over',
        seq,
        latent,
        semanticFromLatent(latent, { scale: 1.55 }),
        buildDenseFromLatent(latent, seq),
      );
    }
    case 'hy-smile-left-only': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.8, cheekSquintLeft: 0.45 };
      return frame(
        'unilateral',
        seq,
        latent,
        semanticFromLatent(latent, { scale: 0.4 }),
        buildDenseFromLatent(latent, seq),
      );
    }
    case 'hy-smile-right-only': {
      const latent = { ...zeroTruth(), mouthSmileRight: 0.8, cheekSquintRight: 0.45 };
      return frame(
        'unilateral',
        seq,
        latent,
        semanticFromLatent(latent, { scale: 0.4 }),
        buildDenseFromLatent(latent, seq),
      );
    }
    case 'hy-smile-asymmetric': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.85, mouthSmileRight: 0.25, cheekSquintLeft: 0.5, cheekSquintRight: 0.15 };
      return frame('other', seq, latent, semanticFromLatent(latent, { scale: 0.5 }), buildDenseFromLatent(latent, seq));
    }
    case 'hy-pucker': {
      const latent = { ...zeroTruth(), mouthPucker: 0.7 };
      return frame('clean', seq, latent, semanticFromLatent(latent), buildDenseFromLatent(latent, seq));
    }
    case 'hy-pucker-under': {
      const latent = { ...zeroTruth(), mouthPucker: 0.75 };
      return frame('under', seq, latent, semanticFromLatent(latent, { scale: 0.3 }), buildDenseFromLatent(latent, seq));
    }
    case 'hy-funnel': {
      const latent = { ...zeroTruth(), mouthFunnel: 0.65, jawOpen: 0.15 };
      return frame('other', seq, latent, semanticFromLatent(latent, { scale: 0.45 }), buildDenseFromLatent(latent, seq));
    }
    case 'hy-press': {
      const latent = { ...zeroTruth(), mouthPressLeft: 0.6, mouthPressRight: 0.55 };
      return frame('other', seq, latent, semanticFromLatent(latent, { scale: 0.4 }), buildDenseFromLatent(latent, seq));
    }
    case 'hy-upper-lower': {
      const latent = {
        ...zeroTruth(),
        mouthUpperUpLeft: 0.55,
        mouthUpperUpRight: 0.5,
        mouthLowerDownLeft: 0.45,
        mouthLowerDownRight: 0.5,
      };
      return frame('other', seq, latent, semanticFromLatent(latent, { scale: 0.4 }), buildDenseFromLatent(latent, seq));
    }
    case 'hy-cheek': {
      const latent = { ...zeroTruth(), cheekSquintLeft: 0.6, cheekSquintRight: 0.55, cheekPuff: 0.4 };
      return frame('other', seq, latent, semanticFromLatent(latent, { scale: 0.35 }), buildDenseFromLatent(latent, seq));
    }
    case 'hy-nose-sneer': {
      const latent = { ...zeroTruth(), noseSneerLeft: 0.7, noseSneerRight: 0.2 };
      return frame('unilateral', seq, latent, semanticFromLatent(latent, { scale: 0.4 }), buildDenseFromLatent(latent, seq));
    }
    case 'hy-jaw': {
      const latent = { ...zeroTruth(), jawOpen: 0.7, jawForward: 0.2 };
      return frame('other', seq, latent, semanticFromLatent(latent, { scale: 0.4 }), buildDenseFromLatent(latent, seq));
    }
    case 'hy-dense-unavailable': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.6, mouthSmileRight: 0.6 };
      return frame('unavailable', seq, latent, semanticFromLatent(latent), null);
    }
    case 'hy-dense-stale-sequence': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.7, mouthSmileRight: 0.7 };
      return frame(
        'unavailable',
        seq,
        latent,
        semanticFromLatent(latent),
        buildDenseFromLatent(latent, 99),
        99,
      );
    }
    case 'hy-semantic-noisy': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.65, mouthSmileRight: 0.65 };
      const sem = semanticFromLatent(latent, { scale: 0.5 });
      // inject noise on smile only
      return frame(
        'other',
        seq,
        latent,
        { ...sem, mouthSmileLeft: clamp01((sem.mouthSmileLeft ?? 0) + 0.15), mouthSmileRight: clamp01((sem.mouthSmileRight ?? 0) - 0.1) },
        buildDenseFromLatent(latent, seq),
      );
    }
    case 'hy-disagree': {
      const latent = { ...zeroTruth(), mouthSmileLeft: 0.5, mouthSmileRight: 0.5 };
      // Semantic says high smile; dense says low
      return frame(
        'disagree',
        seq,
        latent,
        { mouthSmileLeft: 0.9, mouthSmileRight: 0.9 },
        buildDenseFromLatent({ ...latent, mouthSmileLeft: 0.15, mouthSmileRight: 0.15 }, seq),
      );
    }
    case 'hy-speech-like': {
      // Single representative mid-speech frame (sequence tests expand in AB)
      const latent = {
        ...zeroTruth(),
        jawOpen: 0.35,
        mouthSmileLeft: 0.2,
        mouthSmileRight: 0.22,
        mouthPucker: 0.15,
        mouthFunnel: 0.1,
      };
      return frame('speech', seq, latent, semanticFromLatent(latent, { scale: 0.55 }), buildDenseFromLatent(latent, seq));
    }
    default: {
      const _e: never = id;
      return _e;
    }
  }
}

/**
 * Deterministic speech-like sequence (latent jaw + smile + pucker envelope).
 * Used for #444 correlation / amplitude / velocity / saturation / return metrics.
 */
export function buildHybridSpeechLikeSequence(frameCount = 60): HybridFaceFixtureFrame[] {
  const out: HybridFaceFixtureFrame[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const t = i / Math.max(1, frameCount - 1);
    // Envelope: open → hold → return
    const env =
      t < 0.2 ? t / 0.2 : t < 0.7 ? 1 : t < 0.9 ? 1 - (t - 0.7) / 0.2 : 0;
    const latent: HybridFaceLatentTruth = {
      ...zeroTruth(),
      jawOpen: clamp01(0.55 * env),
      mouthSmileLeft: clamp01(0.25 * env),
      mouthSmileRight: clamp01(0.28 * env),
      mouthPucker: clamp01(0.2 * Math.sin(t * Math.PI * 4) * env),
      mouthFunnel: clamp01(0.12 * env),
    };
    const seq = i + 1;
    out.push(
      frame(
        'speech',
        seq,
        latent,
        semanticFromLatent(latent, { scale: 0.5 }),
        buildDenseFromLatent(latent, seq),
      ),
    );
  }
  return out;
}

void miss;
