/**
 * liveact-temporal-fixtures — deterministic temporal A/B fixtures (#448).
 * Location: src/domains/character/liveact/liveact-temporal-fixtures.ts
 *
 * Synthetic only. No webcam. No unseeded randomness.
 */

import {
  LIVEACT_CONTRACT_VERSION,
  createNeutralLiveActFrame,
  type LiveActFrameV1,
} from './liveact-contract';
import {
  LIVEACT_FACE_CONTRACT_VERSION,
  createNeutralLiveActFaceChannels,
  type LiveActFaceChannelId,
} from './liveact-face-contract';

export type TemporalFixtureKind =
  | 'step'
  | 'sine'
  | 'jitter'
  | 'speech'
  | 'blink'
  | 'lost-reacquire'
  | 'dropped';

function baseFrame(timestampMs: number, sequence: number): LiveActFrameV1 {
  return createNeutralLiveActFrame({ timestampMs, sequence, trackingLost: false });
}

function withFace(
  frame: LiveActFrameV1,
  patch: Partial<Record<LiveActFaceChannelId, number>>,
): LiveActFrameV1 {
  const face = { ...createNeutralLiveActFaceChannels(), ...frame.face, ...patch };
  return { ...frame, face };
}

/** Constant-Hz timestamps. */
export function temporalTimestamps(hz: number, count: number, startMs = 0): number[] {
  const dt = 1000 / hz;
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) out.push(startMs + i * dt);
  return out;
}

/** Variable spacing with optional dropped gaps (ms list of deltas). */
export function temporalTimestampsFromDeltas(
  deltasMs: readonly number[],
  startMs = 0,
): number[] {
  const out = [startMs];
  let t = startMs;
  for (const d of deltasMs) {
    t += d;
    out.push(t);
  }
  return out;
}

export interface TemporalMappedSequence {
  readonly kind: TemporalFixtureKind;
  readonly frames: readonly LiveActFrameV1[];
  /** Latent / intended truth for the primary channel (same length). */
  readonly truth: readonly number[];
  readonly primaryKey: string;
}

/** Head yaw step 0 → 0.4 → hold → 0. */
export function buildHeadYawStepSequence(hz = 60, holdFrames = 30): TemporalMappedSequence {
  const rise = 6;
  const total = rise + holdFrames + rise + 10;
  const ts = temporalTimestamps(hz, total);
  const frames: LiveActFrameV1[] = [];
  const truth: number[] = [];
  for (let i = 0; i < total; i += 1) {
    let y = 0;
    if (i < rise) y = (i / rise) * 0.4;
    else if (i < rise + holdFrames) y = 0.4;
    else if (i < rise + holdFrames + rise) {
      y = 0.4 * (1 - (i - rise - holdFrames) / rise);
    }
    const f = baseFrame(ts[i]!, i + 1);
    frames.push({ ...f, head: { ...f.head, yaw: y } });
    truth.push(y);
  }
  return { kind: 'step', frames, truth, primaryKey: 'head.yaw' };
}

/** Gaze eyeLeft.x step center → +0.6 → center. */
export function buildGazeStepSequence(hz = 60): TemporalMappedSequence {
  const phases = [8, 20, 8, 12];
  const total = phases.reduce((a, b) => a + b, 0);
  const ts = temporalTimestamps(hz, total);
  const frames: LiveActFrameV1[] = [];
  const truth: number[] = [];
  let i = 0;
  const push = (n: number, v: number) => {
    for (let k = 0; k < n; k += 1) {
      const f = baseFrame(ts[i]!, i + 1);
      frames.push({ ...f, eyeLeft: { x: v, y: 0 }, eyeRight: { x: v, y: 0 } });
      truth.push(v);
      i += 1;
    }
  };
  push(phases[0]!, 0);
  push(phases[1]!, 0.6);
  push(phases[2]!, 0);
  push(phases[3]!, 0);
  return { kind: 'step', frames, truth, primaryKey: 'eyeLeft.x' };
}

/** Lip jawOpen sine at given Hz for durationSeconds. */
export function buildLipSineSequence(
  freqHz: number,
  sampleHz = 60,
  durationSeconds = 2,
  amp = 0.55,
): TemporalMappedSequence {
  const count = Math.max(8, Math.round(sampleHz * durationSeconds));
  const ts = temporalTimestamps(sampleHz, count);
  const frames: LiveActFrameV1[] = [];
  const truth: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleHz;
    const v = amp * 0.5 * (1 + Math.sin(2 * Math.PI * freqHz * t));
    const f = baseFrame(ts[i]!, i + 1);
    frames.push(withFace(f, { jawOpen: v, mouthPucker: v * 0.35 }));
    truth.push(v);
  }
  return { kind: 'sine', frames, truth, primaryKey: 'face.jawOpen' };
}

/** Deterministic small head yaw jitter around 0. */
export function buildHeadJitterSequence(hz = 60, count = 90): TemporalMappedSequence {
  const pattern = [0, 0.01, -0.008, 0.006, -0.01, 0.004, -0.005, 0.007, -0.003, 0.002];
  const ts = temporalTimestamps(hz, count);
  const frames: LiveActFrameV1[] = [];
  const truth: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const y = pattern[i % pattern.length]!;
    const f = baseFrame(ts[i]!, i + 1);
    frames.push({ ...f, head: { ...f.head, yaw: y } });
    truth.push(0);
  }
  return { kind: 'jitter', frames, truth, primaryKey: 'head.yaw' };
}

/** Full blink left peak. */
export function buildBlinkSequence(hz = 60): TemporalMappedSequence {
  const total = 40;
  const ts = temporalTimestamps(hz, total);
  const frames: LiveActFrameV1[] = [];
  const truth: number[] = [];
  for (let i = 0; i < total; i += 1) {
    let b = 0;
    if (i >= 8 && i < 14) b = Math.min(1, (i - 8) / 3);
    else if (i >= 14 && i < 18) b = 1;
    else if (i >= 18 && i < 26) b = Math.max(0, 1 - (i - 18) / 6);
    const f = baseFrame(ts[i]!, i + 1);
    frames.push(withFace(f, { eyeBlinkLeft: b, eyeBlinkRight: 0 }));
    truth.push(b);
  }
  return { kind: 'blink', frames, truth, primaryKey: 'face.eyeBlinkLeft' };
}

/** Speech-like jaw+smile envelope (aligned with #447 style). */
export function buildTemporalSpeechSequence(
  sampleHz = 60,
  frameCount = 60,
): TemporalMappedSequence {
  const ts = temporalTimestamps(sampleHz, frameCount);
  const frames: LiveActFrameV1[] = [];
  const truth: number[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const t = i / Math.max(1, frameCount - 1);
    const env = t < 0.2 ? t / 0.2 : t < 0.7 ? 1 : t < 0.9 ? 1 - (t - 0.7) / 0.2 : 0;
    const jaw = 0.55 * env;
    const smile = 0.25 * env;
    const pucker = 0.2 * Math.sin(t * Math.PI * 4) * env;
    const composite = (jaw + smile + Math.max(0, pucker)) / 3;
    const f = baseFrame(ts[i]!, i + 1);
    frames.push(
      withFace(f, {
        jawOpen: jaw,
        mouthSmileLeft: smile,
        mouthSmileRight: smile * 1.05,
        mouthPucker: Math.max(0, pucker),
      }),
    );
    truth.push(composite);
  }
  return { kind: 'speech', frames, truth, primaryKey: 'speech.composite' };
}

/**
 * Active smile → lost (neutral) → reacquire neutral.
 * Truth for smile channel after reacquire must stay ~0.
 */
export function buildLostReacquireSmileSequence(hz = 60): TemporalMappedSequence {
  const frames: LiveActFrameV1[] = [];
  const truth: number[] = [];
  let seq = 1;
  let t = 0;
  const dt = 1000 / hz;
  const pushActive = (n: number, smile: number) => {
    for (let i = 0; i < n; i += 1) {
      const f = withFace(baseFrame(t, seq), {
        mouthSmileLeft: smile,
        mouthSmileRight: smile,
      });
      frames.push(f);
      truth.push(smile);
      t += dt;
      seq += 1;
    }
  };
  const pushLost = (n: number) => {
    for (let i = 0; i < n; i += 1) {
      frames.push(
        createNeutralLiveActFrame({
          timestampMs: t,
          sequence: seq,
          trackingLost: true,
        }),
      );
      truth.push(0);
      t += dt;
      seq += 1;
    }
  };
  pushActive(20, 0.8);
  pushLost(15);
  pushActive(20, 0); // reacquire neutral
  return { kind: 'lost-reacquire', frames, truth, primaryKey: 'face.mouthSmileLeft' };
}

/** Dropped-frame spacing: 33,33,66,33,100,33… around a lip step. */
export function buildDroppedFrameLipSequence(): TemporalMappedSequence {
  const deltas = [33, 33, 66, 33, 33, 100, 33, 33, 33, 150, 33, 33, 33, 33];
  const ts = temporalTimestampsFromDeltas(deltas, 0);
  const frames: LiveActFrameV1[] = [];
  const truth: number[] = [];
  for (let i = 0; i < ts.length; i += 1) {
    const v = i < 3 ? 0 : i < 10 ? 0.7 : 0;
    const f = baseFrame(ts[i]!, i + 1);
    frames.push(withFace(f, { jawOpen: v }));
    truth.push(v);
  }
  return { kind: 'dropped', frames, truth, primaryKey: 'face.jawOpen' };
}

void LIVEACT_CONTRACT_VERSION;
void LIVEACT_FACE_CONTRACT_VERSION;
