/**
 * liveact-temporal-solve — adaptive continuous-time one-pole temporal solver (#448).
 * Location: src/domains/character/liveact/liveact-temporal-solve.ts
 *
 * Deterministic. Timestamps are inputs only. No prediction/momentum. O(channels) per frame.
 */

import {
  LIVEACT_CONTRACT_VERSION,
  createNeutralLiveActFrame,
  type LiveActFrameV1,
} from './liveact-contract';
import {
  LIVEACT_FACE_CHANNELS,
  LIVEACT_FACE_CONTRACT_VERSION,
  createNeutralLiveActFaceChannels,
  type LiveActFaceChannelId,
  type LiveActFaceChannels,
} from './liveact-face-contract';
import {
  LIVEACT_TEMPORAL_CONTRACT,
  LIVEACT_TEMPORAL_DEFAULT_DT_MS,
  LIVEACT_TEMPORAL_LONG_GAP_MS,
  LIVEACT_TEMPORAL_MAX_DT_MS,
  LIVEACT_TEMPORAL_MIN_DT_MS,
  LIVEACT_TEMPORAL_POLICIES,
  LIVEACT_TEMPORAL_POLICY_VERSION,
  createEmptyTemporalState,
  temporalFaceKey,
  temporalGroupForScalarKey,
  type LiveActTemporalScalarKey,
  type LiveActTemporalStateV1,
} from './liveact-temporal-contract';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/** Hermite smoothstep on [0,1]. */
export function temporalSmoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function temporalAlpha(dtSeconds: number, tauSeconds: number): number {
  if (!(dtSeconds > 0) || !(tauSeconds > 0)) return 1;
  const a = 1 - Math.exp(-dtSeconds / tauSeconds);
  if (!Number.isFinite(a)) return 1;
  return clamp01(a);
}

/**
 * Bound dt for the filter. Invalid → default. Long gap → signal rebase (caller).
 */
export function resolveTemporalDtMs(
  previousTimestampMs: number | null,
  currentTimestampMs: number,
): { dtMs: number; rebase: boolean } {
  if (
    previousTimestampMs === null ||
    !Number.isFinite(previousTimestampMs) ||
    !Number.isFinite(currentTimestampMs)
  ) {
    return { dtMs: LIVEACT_TEMPORAL_DEFAULT_DT_MS, rebase: true };
  }
  const raw = currentTimestampMs - previousTimestampMs;
  if (!Number.isFinite(raw) || raw <= 0) {
    return { dtMs: LIVEACT_TEMPORAL_DEFAULT_DT_MS, rebase: false };
  }
  if (raw > LIVEACT_TEMPORAL_LONG_GAP_MS) {
    return { dtMs: LIVEACT_TEMPORAL_DEFAULT_DT_MS, rebase: true };
  }
  const clamped = Math.min(
    LIVEACT_TEMPORAL_MAX_DT_MS,
    Math.max(LIVEACT_TEMPORAL_MIN_DT_MS, raw),
  );
  return { dtMs: clamped, rebase: false };
}

function readScalar(frame: LiveActFrameV1, key: LiveActTemporalScalarKey): number {
  switch (key) {
    case 'head.yaw':
      return frame.head.yaw;
    case 'head.pitch':
      return frame.head.pitch;
    case 'head.roll':
      return frame.head.roll;
    case 'eyeLeft.x':
      return frame.eyeLeft.x;
    case 'eyeLeft.y':
      return frame.eyeLeft.y;
    case 'eyeRight.x':
      return frame.eyeRight.x;
    case 'eyeRight.y':
      return frame.eyeRight.y;
    case 'confidence':
      return frame.confidence;
    default: {
      const id = key.slice('face.'.length) as LiveActFaceChannelId;
      return frame.face[id] ?? 0;
    }
  }
}

function filterScalar(
  previousFiltered: number | undefined,
  previousInput: number | undefined,
  target: number,
  dtSeconds: number,
  key: LiveActTemporalScalarKey,
  forcePassthrough: boolean,
): number {
  if (forcePassthrough || previousFiltered === undefined) return target;
  const group = temporalGroupForScalarKey(key);
  const policy = LIVEACT_TEMPORAL_POLICIES[group];
  const priorIn = previousInput ?? target;
  const speed = Math.abs(target - priorIn) / Math.max(dtSeconds, 1e-6);
  const span = Math.max(1e-6, policy.speedFast - policy.speedSlow);
  const response = temporalSmoothstep((speed - policy.speedSlow) / span);
  const tauMs = policy.tauSlowMs + (policy.tauFastMs - policy.tauSlowMs) * response;
  const alpha = temporalAlpha(dtSeconds, tauMs / 1000);
  return previousFiltered + alpha * (target - previousFiltered);
}

function collectTargets(frame: LiveActFrameV1): Record<LiveActTemporalScalarKey, number> {
  const out = {} as Record<LiveActTemporalScalarKey, number>;
  out['head.yaw'] = frame.head.yaw;
  out['head.pitch'] = frame.head.pitch;
  out['head.roll'] = frame.head.roll;
  out['eyeLeft.x'] = frame.eyeLeft.x;
  out['eyeLeft.y'] = frame.eyeLeft.y;
  out['eyeRight.x'] = frame.eyeRight.x;
  out['eyeRight.y'] = frame.eyeRight.y;
  out.confidence = frame.confidence;
  for (const id of LIVEACT_FACE_CHANNELS) {
    out[temporalFaceKey(id)] = frame.face[id] ?? 0;
  }
  return out;
}

function frameFromScalars(
  next: LiveActFrameV1,
  filtered: Readonly<Partial<Record<LiveActTemporalScalarKey, number>>>,
  trackingLost: boolean,
): LiveActFrameV1 {
  const face = createNeutralLiveActFaceChannels() as Record<LiveActFaceChannelId, number>;
  for (const id of LIVEACT_FACE_CHANNELS) {
    const v = filtered[temporalFaceKey(id)];
    face[id] = typeof v === 'number' && Number.isFinite(v) ? v : next.face[id] ?? 0;
  }
  return {
    contractVersion: LIVEACT_CONTRACT_VERSION,
    faceContractVersion: LIVEACT_FACE_CONTRACT_VERSION,
    timestampMs: next.timestampMs,
    sequence: next.sequence,
    confidence: filtered.confidence ?? next.confidence,
    trackingLost,
    head: {
      yaw: filtered['head.yaw'] ?? next.head.yaw,
      pitch: filtered['head.pitch'] ?? next.head.pitch,
      roll: filtered['head.roll'] ?? next.head.roll,
    },
    eyeLeft: {
      x: filtered['eyeLeft.x'] ?? next.eyeLeft.x,
      y: filtered['eyeLeft.y'] ?? next.eyeLeft.y,
    },
    eyeRight: {
      x: filtered['eyeRight.x'] ?? next.eyeRight.x,
      y: filtered['eyeRight.y'] ?? next.eyeRight.y,
    },
    face: face as LiveActFaceChannels,
  };
}

export interface StepAdaptiveTemporalResult {
  readonly frame: LiveActFrameV1;
  readonly state: LiveActTemporalStateV1;
}

/**
 * One adaptive temporal step.
 * Lost: face snaps neutral; head/eyes ease toward 0; mode=lost.
 * Reacquire after lost: rebase from current input (no stale pre-loss).
 */
export function stepAdaptiveTemporal(
  previous: LiveActTemporalStateV1 | null,
  mapped: LiveActFrameV1,
): StepAdaptiveTemporalResult {
  const { dtMs, rebase: gapRebase } = resolveTemporalDtMs(
    previous?.timestampMs ?? null,
    mapped.timestampMs,
  );
  const dtSeconds = dtMs / 1000;
  const wasLost = previous?.mode === 'lost';
  const reacquire = wasLost && !mapped.trackingLost;
  const init = previous === null || gapRebase || reacquire || previous.mode === 'rebase';

  // --- Lost path ---
  if (mapped.trackingLost) {
    const neutral = createNeutralLiveActFrame({
      timestampMs: mapped.timestampMs,
      sequence: mapped.sequence,
      trackingLost: true,
    });
    const targets = collectTargets(neutral);
    // Head/eyes ease toward 0; face already neutral.
    const filtered: Partial<Record<LiveActTemporalScalarKey, number>> = {};
    const priorInput: Partial<Record<LiveActTemporalScalarKey, number>> = {};
    const force = init || !previous;
    for (const key of Object.keys(targets) as LiveActTemporalScalarKey[]) {
      const target = targets[key]!;
      if (key.startsWith('face.') || key === 'confidence') {
        filtered[key] = target;
      } else {
        filtered[key] = filterScalar(
          force ? undefined : previous?.filtered[key],
          force ? undefined : previous?.priorInput[key],
          target,
          dtSeconds,
          key,
          force,
        );
      }
      priorInput[key] = target;
    }
    const frame = frameFromScalars(mapped, filtered, true);
    return {
      frame,
      state: {
        contractVersion: LIVEACT_TEMPORAL_CONTRACT,
        policyVersion: LIVEACT_TEMPORAL_POLICY_VERSION,
        timestampMs: mapped.timestampMs,
        mode: 'lost',
        filtered,
        priorInput,
      },
    };
  }

  // --- Active path ---
  const targets = collectTargets(mapped);
  const filtered: Partial<Record<LiveActTemporalScalarKey, number>> = {};
  const priorInput: Partial<Record<LiveActTemporalScalarKey, number>> = {};
  const force = init;
  for (const key of Object.keys(targets) as LiveActTemporalScalarKey[]) {
    const target = targets[key]!;
    filtered[key] = filterScalar(
      force ? undefined : previous?.filtered[key],
      force ? undefined : previous?.priorInput[key],
      target,
      dtSeconds,
      key,
      force,
    );
    priorInput[key] = target;
  }

  const frame = frameFromScalars(mapped, filtered, false);
  return {
    frame,
    state: {
      contractVersion: LIVEACT_TEMPORAL_CONTRACT,
      policyVersion: LIVEACT_TEMPORAL_POLICY_VERSION,
      timestampMs: mapped.timestampMs,
      // Always 'active' after a successful active step so the next frame continues
      // filtering (rebase/reacquire only force passthrough for THIS frame).
      mode: 'active',
      filtered,
      priorInput,
    },
  };
}

/** Explicit reset helper for model swap / stop / dispose / tests. */
export function resetAdaptiveTemporal(
  timestampMs = 0,
): LiveActTemporalStateV1 {
  return createEmptyTemporalState(timestampMs, 'rebase');
}

/** Read a scalar from a frame (test/A/B helper). */
export function readTemporalScalar(
  frame: LiveActFrameV1,
  key: LiveActTemporalScalarKey,
): number {
  return readScalar(frame, key);
}
