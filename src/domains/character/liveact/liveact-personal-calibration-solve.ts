/**
 * liveact-personal-calibration-solve — capture/finalize/apply Personal Calibration V2 (#449).
 * Location: src/domains/character/liveact/liveact-personal-calibration-solve.ts
 *
 * Pure domain. Deterministic given samples + skips + createdAtLocalMs.
 */

import {
  LIVEACT_FACE_CHANNELS,
  clampLiveActChannel,
  createNeutralLiveActFaceChannels,
  type LiveActFaceChannelId,
  type LiveActFaceChannels,
} from './liveact-face-contract';
import {
  clampLiveActAngle,
  clampLiveActGaze,
  type LiveActFrameV1,
  type LiveActLimits,
  type LiveActSourceSample,
  DEFAULT_LIVEACT_LIMITS,
} from './liveact-contract';
import {
  type LiveActCalibrationSetV1,
  type LiveActNeutralBaselineV1,
  type LiveActRangeCalibrationV1,
  isValidLiveActCalibrationSample,
} from './liveact-calibration';
import {
  LIVEACT_PERSONAL_CALIBRATION_CONTRACT,
  LIVEACT_PERSONAL_CALIBRATION_PHASES,
  LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION,
  LIVEACT_PERSONAL_MAX_GAIN,
  LIVEACT_PERSONAL_MAX_SAMPLE_GAP_MS,
  LIVEACT_PERSONAL_MIN_PHASE_FRAMES,
  LIVEACT_PERSONAL_MIN_USABLE_SPAN,
  LIVEACT_PERSONAL_NOISE_DEADZONE_MULT,
  LIVEACT_PERSONAL_WEAK_SPAN,
  createLiveActSolverFingerprintV1,
  isLiveActPersonalCalibrationScopeComplete,
  liveActSolverFingerprintsEqual,
  type LiveActCalibrationProfileV2,
  type LiveActPersonalCalibrationScopeV1,
  type LiveActPersonalCapability,
  type LiveActPersonalChannelCalibV2,
  type LiveActPersonalCalibrationPhaseId,
  type LiveActPersonalProfileStatus,
  type LiveActSolverFingerprintV1,
} from './liveact-personal-calibration-contract';

export interface LiveActPersonalPhaseSampleBucket {
  readonly values: number[];
}

export interface LiveActPersonalCalibrationSessionV2 {
  phaseIndex: number;
  /** Wall-clock phase open (diagnostics only; completion uses validCaptureMs). */
  phaseStartedAtMs: number;
  /** Valid samples accepted in the current phase. */
  validFrameCount: number;
  /** Accumulated capture time from bounded consecutive valid sample gaps. */
  validCaptureMs: number;
  /** Timestamp of last accepted valid sample in the current phase (0 = none). */
  lastValidSampleTimestamp: number;
  skippedPhaseIds: string[];
  /** Per phase id → channel → samples */
  phaseValues: Record<string, Record<string, number[]>>;
  headYaw: number[];
  headPitch: number[];
  headRoll: number[];
  eyeLeftX: number[];
  eyeLeftY: number[];
  eyeRightX: number[];
  eyeRightY: number[];
  speechJaw: number[];
  speechPrevJaw: number | null;
  speechVelocityAbsSum: number;
  speechVelocityCount: number;
  headPoseSupported: boolean;
  ownerLocalId: string;
  characterLocalId: string;
}

function resetPhaseCaptureClock(session: LiveActPersonalCalibrationSessionV2): void {
  session.phaseStartedAtMs = 0;
  session.validFrameCount = 0;
  session.validCaptureMs = 0;
  session.lastValidSampleTimestamp = 0;
}

export function createLiveActPersonalCalibrationSessionV2(
  scope: LiveActPersonalCalibrationScopeV1 | null = null,
): LiveActPersonalCalibrationSessionV2 {
  const ownerLocalId = scope?.ownerLocalId?.trim() ?? '';
  const characterLocalId = scope?.characterLocalId?.trim() ?? '';
  return {
    phaseIndex: 0,
    phaseStartedAtMs: 0,
    validFrameCount: 0,
    validCaptureMs: 0,
    lastValidSampleTimestamp: 0,
    skippedPhaseIds: [],
    phaseValues: {},
    headYaw: [],
    headPitch: [],
    headRoll: [],
    eyeLeftX: [],
    eyeLeftY: [],
    eyeRightX: [],
    eyeRightY: [],
    speechJaw: [],
    speechPrevJaw: null,
    speechVelocityAbsSum: 0,
    speechVelocityCount: 0,
    headPoseSupported: true,
    ownerLocalId,
    characterLocalId,
  };
}

function pushNum(bucket: number[], value: number): void {
  if (Number.isFinite(value)) bucket.push(value);
}

function ensurePhaseChannel(
  session: LiveActPersonalCalibrationSessionV2,
  phaseId: string,
  channel: string,
): number[] {
  const phase = session.phaseValues[phaseId] ?? (session.phaseValues[phaseId] = {});
  return phase[channel] ?? (phase[channel] = []);
}

export function pushLiveActPersonalCalibrationSample(
  session: LiveActPersonalCalibrationSessionV2,
  sample: LiveActSourceSample,
  options: {
    headPoseSupported: boolean;
    limits?: LiveActLimits;
    /** Monotonic sample clock (ms). Required for valid-capture accumulation. */
    nowMs?: number;
  } = { headPoseSupported: true },
): boolean {
  const limits = options.limits ?? DEFAULT_LIVEACT_LIMITS;
  if (!isValidLiveActCalibrationSample(sample, limits)) return false;
  const phase = LIVEACT_PERSONAL_CALIBRATION_PHASES[session.phaseIndex];
  if (!phase) return false;
  session.headPoseSupported = session.headPoseSupported && options.headPoseSupported;

  const nowMs =
    typeof options.nowMs === 'number' && Number.isFinite(options.nowMs) ? options.nowMs : 0;
  if (nowMs > 0) {
    if (session.phaseStartedAtMs <= 0) session.phaseStartedAtMs = nowMs;
    if (session.lastValidSampleTimestamp > 0) {
      const gap = nowMs - session.lastValidSampleTimestamp;
      if (gap > 0 && gap <= LIVEACT_PERSONAL_MAX_SAMPLE_GAP_MS) {
        session.validCaptureMs += gap;
      }
      // Large gaps (tracking lost) do not accumulate capture time.
    }
    session.lastValidSampleTimestamp = nowMs;
  }
  session.validFrameCount += 1;

  pushNum(session.headYaw, sample.headYaw);
  pushNum(session.headPitch, sample.headPitch);
  pushNum(session.headRoll, sample.headRoll);
  pushNum(session.eyeLeftX, sample.eyeLeftX);
  pushNum(session.eyeLeftY, sample.eyeLeftY);
  pushNum(session.eyeRightX, sample.eyeRightX);
  pushNum(session.eyeRightY, sample.eyeRightY);

  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    const value = sample.face[id];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    ensurePhaseChannel(session, phase.id, id).push(value);
  }

  if (phase.kind === 'speech') {
    const jaw = sample.face.jawOpen;
    if (typeof jaw === 'number' && Number.isFinite(jaw)) {
      session.speechJaw.push(jaw);
      if (session.speechPrevJaw !== null) {
        session.speechVelocityAbsSum += Math.abs(jaw - session.speechPrevJaw);
        session.speechVelocityCount += 1;
      }
      session.speechPrevJaw = jaw;
    }
  }
  return true;
}

export function skipLiveActPersonalCalibrationPhase(
  session: LiveActPersonalCalibrationSessionV2,
): boolean {
  const phase = LIVEACT_PERSONAL_CALIBRATION_PHASES[session.phaseIndex];
  if (!phase?.skipAllowed) return false;
  if (!session.skippedPhaseIds.includes(phase.id)) {
    session.skippedPhaseIds.push(phase.id);
  }
  return advanceLiveActPersonalCalibrationPhase(session);
}

export function advanceLiveActPersonalCalibrationPhase(
  session: LiveActPersonalCalibrationSessionV2,
): boolean {
  if (session.phaseIndex >= LIVEACT_PERSONAL_CALIBRATION_PHASES.length - 1) {
    return false;
  }
  session.phaseIndex += 1;
  resetPhaseCaptureClock(session);
  return true;
}

/**
 * Valid capture duration for the current phase (not wall-clock elapsed).
 * `nowMs` is accepted for API stability; progress is driven by accumulated sample gaps.
 */
export function liveActPersonalCalibrationPhaseElapsed(
  session: LiveActPersonalCalibrationSessionV2,
  _nowMs?: number,
): number {
  return Math.max(0, session.validCaptureMs);
}

export function isLiveActPersonalCalibrationPhaseComplete(
  session: LiveActPersonalCalibrationSessionV2,
  _nowMs?: number,
): boolean {
  const phase = LIVEACT_PERSONAL_CALIBRATION_PHASES[session.phaseIndex];
  if (!phase) return true;
  if (session.validFrameCount < LIVEACT_PERSONAL_MIN_PHASE_FRAMES) return false;
  return session.validCaptureMs >= phase.durationMs;
}

/** Remaining valid-capture seconds for UI countdown (pauses when tracking lost). */
export function liveActPersonalCalibrationPhaseRemainingSec(
  session: LiveActPersonalCalibrationSessionV2,
): number | null {
  const phase = LIVEACT_PERSONAL_CALIBRATION_PHASES[session.phaseIndex];
  if (!phase) return null;
  const remainingMs = Math.max(0, phase.durationMs - session.validCaptureMs);
  return Math.ceil(remainingMs / 1000);
}

/**
 * Guard against finalizing a profile from sparse/recovered single frames.
 * Phases only advance when validCaptureMs + min frames are met (or skipped);
 * this session-level check blocks a single-frame “success” path.
 */
export function hasLiveActPersonalCalibrationEnoughValidSamples(
  session: LiveActPersonalCalibrationSessionV2,
): boolean {
  const requiredPhases = LIVEACT_PERSONAL_CALIBRATION_PHASES.filter(
    (p) => !session.skippedPhaseIds.includes(p.id),
  ).length;
  return (
    session.headYaw.length >= LIVEACT_PERSONAL_MIN_PHASE_FRAMES * Math.max(1, requiredPhases)
  );
}

function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx] ?? 0;
}

function median(values: readonly number[]): number {
  return quantile(values, 0.5);
}

/** Robust noise ≈ 1.4826 * MAD (median absolute deviation). */
function robustNoise(values: readonly number[], center: number): number {
  if (values.length < 3) return 0;
  const absDev = values.map((v) => Math.abs(v - center));
  return 1.4826 * median(absDev);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function phaseSkipped(session: LiveActPersonalCalibrationSessionV2, phaseId: string): boolean {
  return session.skippedPhaseIds.includes(phaseId);
}

function channelSamples(
  session: LiveActPersonalCalibrationSessionV2,
  phaseId: string,
  channel: LiveActFaceChannelId,
): number[] {
  return session.phaseValues[phaseId]?.[channel] ?? [];
}

function allMotionSamples(
  session: LiveActPersonalCalibrationSessionV2,
  channel: LiveActFaceChannelId,
): number[] {
  const out: number[] = [];
  for (const phase of LIVEACT_PERSONAL_CALIBRATION_PHASES) {
    if (phase.kind === 'neutral') continue;
    if (phaseSkipped(session, phase.id)) continue;
    out.push(...channelSamples(session, phase.id, channel));
  }
  return out;
}

function buildChannelCalib(
  session: LiveActPersonalCalibrationSessionV2,
  channel: LiveActFaceChannelId,
  neutral: number,
  noiseFloor: number,
  forced: LiveActPersonalCapability | null,
): LiveActPersonalChannelCalibV2 {
  if (forced === 'skipped' || forced === 'na' || forced === 'unsupported') {
    return {
      capability: forced,
      neutral,
      usableMin: neutral,
      usableMax: neutral,
      noiseFloor,
      confidence: 0,
      asymmetry: 0,
      counterpartCrossTalk: 0,
    };
  }

  const samples = allMotionSamples(session, channel);
  if (samples.length < 8) {
    return {
      capability: 'weak',
      neutral,
      usableMin: neutral,
      usableMax: neutral,
      noiseFloor,
      confidence: 0.2,
      asymmetry: 0,
      counterpartCrossTalk: 0,
    };
  }

  const q05 = quantile(samples, 0.05);
  const q95 = quantile(samples, 0.95);
  const usableMin = Math.min(q05, neutral);
  const usableMax = Math.max(q95, neutral);
  const span = usableMax - neutral;
  const conf = Math.min(1, samples.length / 40);

  let capability: LiveActPersonalCapability = 'available';
  if (span < LIVEACT_PERSONAL_WEAK_SPAN) capability = 'weak';
  else if (span < LIVEACT_PERSONAL_MIN_USABLE_SPAN) capability = 'weak';

  // Cheek/nose dense contour still #450 for rich morphs — keep measurable coarse channels.
  if (
    (channel.startsWith('cheek') || channel.startsWith('noseSneer')) &&
    capability === 'available' &&
    span < 0.2
  ) {
    capability = 'requires450';
  }

  let counterpartCrossTalk = 0;
  if (channel === 'eyeBlinkLeft') {
    const right = allMotionSamples(session, 'eyeBlinkRight');
    const leftPeak = quantile(samples, 0.95);
    const rightAtLeftIntent = quantile(right, 0.95);
    if (leftPeak > 0.4) counterpartCrossTalk = Math.max(0, rightAtLeftIntent - noiseFloor);
  } else if (channel === 'eyeBlinkRight') {
    const left = allMotionSamples(session, 'eyeBlinkLeft');
    const rightPeak = quantile(samples, 0.95);
    const leftAtRightIntent = quantile(left, 0.95);
    if (rightPeak > 0.4) counterpartCrossTalk = Math.max(0, leftAtRightIntent - noiseFloor);
  } else if (channel === 'mouthSmileLeft') {
    counterpartCrossTalk = Math.max(
      0,
      quantile(allMotionSamples(session, 'mouthSmileRight'), 0.95) - noiseFloor,
    );
  } else if (channel === 'mouthSmileRight') {
    counterpartCrossTalk = Math.max(
      0,
      quantile(allMotionSamples(session, 'mouthSmileLeft'), 0.95) - noiseFloor,
    );
  }

  return {
    capability,
    neutral,
    usableMin,
    usableMax,
    noiseFloor,
    confidence: conf,
    asymmetry: 0,
    counterpartCrossTalk: clampLiveActChannel(counterpartCrossTalk),
  };
}

export function finalizeLiveActPersonalCalibrationProfile(
  session: LiveActPersonalCalibrationSessionV2,
  createdAtLocalMs: number,
): LiveActCalibrationProfileV2 {
  const neutralFaceSamples = session.phaseValues.neutral ?? {};
  const faceNeutral = {
    ...createNeutralLiveActFaceChannels(),
  } as Record<LiveActFaceChannelId, number>;
  const faceNoise: Partial<Record<LiveActFaceChannelId, number>> = {};

  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    const vals = neutralFaceSamples[id] ?? [];
    const n = vals.length > 0 ? mean(vals) : 0;
    faceNeutral[id] = clampLiveActChannel(n);
    faceNoise[id] = robustNoise(vals, n);
  }

  const headNeutralYaw = mean(session.headYaw.slice(0, Math.min(session.headYaw.length, 60)));
  const headNeutralPitch = mean(session.headPitch.slice(0, Math.min(session.headPitch.length, 60)));
  const headNeutralRoll = mean(session.headRoll.slice(0, Math.min(session.headRoll.length, 60)));
  const gazeNeutralX = mean([
    ...session.eyeLeftX.slice(0, 60),
    ...session.eyeRightX.slice(0, 60),
  ]);
  const gazeNeutralY = mean([
    ...session.eyeLeftY.slice(0, 60),
    ...session.eyeRightY.slice(0, 60),
  ]);

  const channels: Partial<Record<LiveActFaceChannelId, LiveActPersonalChannelCalibV2>> = {};
  const eyesBrowsSkipped = phaseSkipped(session, 'eyesBrows');
  const jawSmileSkipped = phaseSkipped(session, 'jawSmile');
  const lipsSkipped = phaseSkipped(session, 'lips');

  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    let forced: LiveActPersonalCapability | null = null;
    if (eyesBrowsSkipped && (id.startsWith('eyeBlink') || id.startsWith('brow'))) {
      forced = 'skipped';
    }
    if (
      jawSmileSkipped &&
      (id === 'jawOpen' || id === 'mouthSmileLeft' || id === 'mouthSmileRight')
    ) {
      forced = 'skipped';
    }
    if (
      lipsSkipped &&
      (id.startsWith('mouth') || id.startsWith('cheek') || id.startsWith('nose'))
    ) {
      forced = 'skipped';
    }
    channels[id] = buildChannelCalib(
      session,
      id,
      faceNeutral[id] ?? 0,
      faceNoise[id] ?? 0,
      forced,
    );
  }

  // Asymmetry: smile / blink L vs R usable spans — no averaging into one channel.
  const smileL = channels.mouthSmileLeft;
  const smileR = channels.mouthSmileRight;
  if (smileL && smileR) {
    const spanL = smileL.usableMax - smileL.neutral;
    const spanR = smileR.usableMax - smileR.neutral;
    const asym = spanR - spanL;
    channels.mouthSmileLeft = { ...smileL, asymmetry: asym };
    channels.mouthSmileRight = { ...smileR, asymmetry: -asym };
  }

  const yawRange = Math.max(
    0,
    quantile(session.headYaw, 0.95) - quantile(session.headYaw, 0.05),
  );
  const pitchRange = Math.max(
    0,
    quantile(session.headPitch, 0.95) - quantile(session.headPitch, 0.05),
  );
  const rollRange = Math.max(
    0,
    quantile(session.headRoll, 0.95) - quantile(session.headRoll, 0.05),
  );

  const gazeXs = [...session.eyeLeftX, ...session.eyeRightX];
  const gazeYs = [...session.eyeLeftY, ...session.eyeRightY];

  const speechAmp =
    session.speechJaw.length > 0
      ? Math.max(0, quantile(session.speechJaw, 0.95) - (faceNeutral.jawOpen ?? 0))
      : 0;
  const speechVel =
    session.speechVelocityCount > 0
      ? session.speechVelocityAbsSum / session.speechVelocityCount
      : 0;
  const speechSat =
    session.speechJaw.length > 0
      ? session.speechJaw.filter((v) => v >= 0.98).length / session.speechJaw.length
      : 0;

  const scope: LiveActPersonalCalibrationScopeV1 = {
    ownerLocalId: session.ownerLocalId,
    characterLocalId: session.characterLocalId,
  };
  const enough = hasLiveActPersonalCalibrationEnoughValidSamples(session);
  const status: LiveActPersonalProfileStatus = enough ? 'valid' : 'incompatible';

  return {
    contractVersion: LIVEACT_PERSONAL_CALIBRATION_CONTRACT,
    policyVersion: LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION,
    solverFingerprint: createLiveActSolverFingerprintV1(),
    createdAtLocalMs,
    ownerLocalId: isLiveActPersonalCalibrationScopeComplete(scope)
      ? scope.ownerLocalId
      : session.ownerLocalId,
    characterLocalId: isLiveActPersonalCalibrationScopeComplete(scope)
      ? scope.characterLocalId
      : session.characterLocalId,
    status,
    head: {
      neutralYaw: headNeutralYaw,
      neutralPitch: headNeutralPitch,
      neutralRoll: headNeutralRoll,
      rangeYaw: yawRange,
      rangePitch: pitchRange,
      rangeRoll: rollRange,
      headPoseSupported: session.headPoseSupported,
    },
    gaze: {
      neutralX: gazeNeutralX,
      neutralY: gazeNeutralY,
      rangeLeft: Math.max(0, gazeNeutralX - quantile(gazeXs, 0.05)),
      rangeRight: Math.max(0, quantile(gazeXs, 0.95) - gazeNeutralX),
      rangeUp: Math.max(0, gazeNeutralY - quantile(gazeYs, 0.05)),
      rangeDown: Math.max(0, quantile(gazeYs, 0.95) - gazeNeutralY),
    },
    channels,
    speech: {
      amplitudeProxy: speechAmp,
      velocityProxy: speechVel,
      saturationProxy: speechSat,
      sampleCount: session.speechJaw.length,
    },
    skippedPhaseIds: [...session.skippedPhaseIds],
  };
}

export function resolveLiveActPersonalProfileStatus(
  profile: LiveActCalibrationProfileV2,
  currentFingerprint: LiveActSolverFingerprintV1 = createLiveActSolverFingerprintV1(),
): LiveActPersonalProfileStatus {
  if (profile.contractVersion !== LIVEACT_PERSONAL_CALIBRATION_CONTRACT) {
    return 'incompatible';
  }
  if (profile.policyVersion !== LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION) {
    return 'needsMigration';
  }
  if (!liveActSolverFingerprintsEqual(profile.solverFingerprint, currentFingerprint)) {
    return 'needsRecalibration';
  }
  return profile.status === 'valid' ? 'valid' : profile.status;
}

export function liveActCalibrationSetFromPersonalProfile(
  profile: LiveActCalibrationProfileV2,
): LiveActCalibrationSetV1 {
  const face = {
    ...createNeutralLiveActFaceChannels(),
  } as Record<LiveActFaceChannelId, number>;
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    face[id] = clampLiveActChannel(profile.channels[id]?.neutral ?? 0);
  }
  const neutral: LiveActNeutralBaselineV1 = {
    head: {
      yaw: profile.head.neutralYaw,
      pitch: profile.head.neutralPitch,
      roll: profile.head.neutralRoll,
    },
    eyeLeft: { x: profile.gaze.neutralX, y: profile.gaze.neutralY },
    eyeRight: { x: profile.gaze.neutralX, y: profile.gaze.neutralY },
    face: face as LiveActFaceChannels,
    headPoseSupported: profile.head.headPoseSupported,
  };

  const gain: Partial<Record<LiveActFaceChannelId, number>> = {};

  const effectiveSpan = (id: LiveActFaceChannelId): number | null => {
    const ch = profile.channels[id];
    if (!ch || ch.capability !== 'available') return null;
    const span = ch.usableMax - ch.neutral;
    const effective = span - ch.noiseFloor * LIVEACT_PERSONAL_NOISE_DEADZONE_MULT;
    if (effective < LIVEACT_PERSONAL_MIN_USABLE_SPAN) return null;
    return effective;
  };

  // Paired L/R: share gain from the stronger intentional span so the weaker
  // side is not artificially amplified to match (no forced symmetry).
  const pairs: ReadonlyArray<readonly [LiveActFaceChannelId, LiveActFaceChannelId]> = [
    ['mouthSmileLeft', 'mouthSmileRight'],
    ['eyeBlinkLeft', 'eyeBlinkRight'],
    ['mouthPressLeft', 'mouthPressRight'],
    ['mouthUpperUpLeft', 'mouthUpperUpRight'],
    ['mouthLowerDownLeft', 'mouthLowerDownRight'],
    ['browOuterUpLeft', 'browOuterUpRight'],
    ['noseSneerLeft', 'noseSneerRight'],
  ];
  const paired = new Set<LiveActFaceChannelId>();
  for (const [left, right] of pairs) {
    paired.add(left);
    paired.add(right);
    const spanL = effectiveSpan(left);
    const spanR = effectiveSpan(right);
    const best = Math.max(spanL ?? 0, spanR ?? 0);
    if (best < LIVEACT_PERSONAL_MIN_USABLE_SPAN) continue;
    const g = Math.min(LIVEACT_PERSONAL_MAX_GAIN, 1 / best);
    if (spanL !== null) gain[left] = g;
    if (spanR !== null) gain[right] = g;
  }

  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral' || paired.has(id)) continue;
    const effective = effectiveSpan(id);
    if (effective === null) continue;
    gain[id] = Math.min(LIVEACT_PERSONAL_MAX_GAIN, 1 / effective);
  }

  const range: LiveActRangeCalibrationV1 | null =
    Object.keys(gain).length > 0 ? { gain } : null;
  return { neutral, range };
}

/**
 * Personal apply: neutral subtract + noise deadzone + sparse gains.
 * N/A/weak/skipped channels are not amplified.
 */
export function applyLiveActPersonalCalibration(
  frame: LiveActFrameV1,
  profile: LiveActCalibrationProfileV2 | null,
  limits: LiveActLimits = DEFAULT_LIVEACT_LIMITS,
): LiveActFrameV1 {
  if (!profile || frame.trackingLost) return frame;
  if (resolveLiveActPersonalProfileStatus(profile) !== 'valid') return frame;

  const set = liveActCalibrationSetFromPersonalProfile(profile);
  const neutral = set.neutral;
  if (!neutral) return frame;

  let head = frame.head;
  if (neutral.headPoseSupported) {
    head = {
      yaw: clampLiveActAngle(frame.head.yaw - neutral.head.yaw, limits.maxYaw),
      pitch: clampLiveActAngle(frame.head.pitch - neutral.head.pitch, limits.maxPitch),
      roll: clampLiveActAngle(frame.head.roll - neutral.head.roll, limits.maxRoll),
    };
  }

  const eyeLeft = {
    x: clampLiveActGaze(frame.eyeLeft.x - neutral.eyeLeft.x),
    y: clampLiveActGaze(frame.eyeLeft.y - neutral.eyeLeft.y),
  };
  const eyeRight = {
    x: clampLiveActGaze(frame.eyeRight.x - neutral.eyeRight.x),
    y: clampLiveActGaze(frame.eyeRight.y - neutral.eyeRight.y),
  };

  const face = { ...frame.face } as Record<LiveActFaceChannelId, number>;
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    const ch = profile.channels[id];
    const raw = (face[id] ?? 0) - (neutral.face[id] ?? 0);
    const noise = ch?.noiseFloor ?? 0;
    const dead = noise * LIVEACT_PERSONAL_NOISE_DEADZONE_MULT;
    let v = Math.abs(raw) <= dead ? 0 : raw;
    const gain = set.range?.gain[id];
    if (typeof gain === 'number' && ch?.capability === 'available') {
      v *= gain;
    }
    face[id] = clampLiveActChannel(v);
  }

  return {
    ...frame,
    head,
    eyeLeft,
    eyeRight,
    face: face as LiveActFaceChannels,
  };
}

export function assertLiveActPersonalProfileLocalOnly(profile: LiveActCalibrationProfileV2): void {
  const json = JSON.stringify(profile);
  if (/data:image|landmarks|webcam|mediapipe|irisPoints/i.test(json)) {
    throw new Error('LiveAct personal profile must not embed raw biometric payloads');
  }
}

export function currentLiveActPersonalPhaseId(
  session: LiveActPersonalCalibrationSessionV2,
): LiveActPersonalCalibrationPhaseId | null {
  return LIVEACT_PERSONAL_CALIBRATION_PHASES[session.phaseIndex]?.id ?? null;
}
