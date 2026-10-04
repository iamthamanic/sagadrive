/**
 * liveact-personal-calibration-ab — V1 generic vs Personal V2 measurable improvement (#449).
 * Location: src/domains/character/liveact/liveact-personal-calibration-ab.ts
 */

import { createNeutralLiveActFaceChannels } from './liveact-face-contract';
import {
  createNeutralLiveActFrame,
  type LiveActFrameV1,
} from './liveact-contract';
import { applyLiveActCalibration } from './liveact-calibration';
import {
  LIVEACT_PERSONAL_CALIBRATION_CONTRACT,
  LIVEACT_PERSONAL_CALIBRATION_DURATION_MS,
  LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION,
  LIVEACT_PERSONAL_MAX_GAIN,
} from './liveact-personal-calibration-contract';
import { buildPersonalCalibrationActorSession } from './liveact-personal-calibration-fixtures';
import {
  applyLiveActPersonalCalibration,
  liveActCalibrationSetFromPersonalProfile,
  resolveLiveActPersonalProfileStatus,
} from './liveact-personal-calibration-solve';

export interface LiveActPersonalCalibrationAbReportV1 {
  readonly contractVersion: typeof LIVEACT_PERSONAL_CALIBRATION_CONTRACT;
  readonly policyVersion: typeof LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION;
  readonly choreographyDurationMs: number;
  readonly v1: {
    readonly neutralSmileBias: number;
    readonly noseSneerGain: number;
    readonly smileLeftOut: number;
    readonly smileRightOut: number;
    readonly smileAsymmetryPreserved: boolean;
  };
  readonly personal: {
    readonly neutralSmileBias: number;
    readonly noseSneerGain: number;
    readonly noseCapability: string;
    readonly smileLeftOut: number;
    readonly smileRightOut: number;
    readonly smileAsymmetryPreserved: boolean;
    readonly crossTalkLeftBlink: number;
    readonly profileStatus: string;
  };
  readonly improvements: {
    readonly neutralBiasReduced: boolean;
    readonly weakChannelNotExploded: boolean;
    readonly asymmetryPreserved: boolean;
  };
  readonly success: boolean;
  readonly privacy: { readonly committedRawLandmarks: 0; readonly committedWebcam: 0 };
}

function frameWith(face: Partial<LiveActFrameV1['face']>, headYaw = 0.02): LiveActFrameV1 {
  const base = createNeutralLiveActFrame({ timestampMs: 0, sequence: 1, trackingLost: false });
  return {
    ...base,
    confidence: 1,
    head: { yaw: headYaw, pitch: -0.01, roll: 0.005 },
    eyeLeft: { x: 0.03, y: -0.02 },
    eyeRight: { x: 0.03, y: -0.02 },
    face: { ...createNeutralLiveActFaceChannels(), ...face },
  };
}

export function runPersonalCalibrationAbBenchmark(): LiveActPersonalCalibrationAbReportV1 {
  const { profile, v1Set } = buildPersonalCalibrationActorSession();
  const status = resolveLiveActPersonalProfileStatus(profile);
  const personalSet = liveActCalibrationSetFromPersonalProfile(profile);

  // Resting face with person smile bias — after calib, bias should be near 0.
  const resting = frameWith({
    mouthSmileLeft: 0.08,
    mouthSmileRight: 0.08,
    noseSneerLeft: 0.05,
  });

  const v1Rest = applyLiveActCalibration(resting, v1Set);
  const pRest = applyLiveActPersonalCalibration(resting, profile);

  // Mid-level asymmetric smile — below saturation so L/R ratio remains visible.
  const activeSmile = frameWith({
    mouthSmileLeft: 0.45,
    mouthSmileRight: 0.22,
    jawOpen: 0.1,
  });
  const v1Smile = applyLiveActCalibration(activeSmile, v1Set);
  const pSmile = applyLiveActPersonalCalibration(activeSmile, profile);

  const v1NoseGain = v1Set.range?.gain.noseSneerLeft ?? 1;
  const pNoseGain = personalSet.range?.gain.noseSneerLeft ?? 1;
  const noseCapability = profile.channels.noseSneerLeft?.capability ?? 'na';

  const v1Bias =
    (Math.abs(v1Rest.face.mouthSmileLeft) + Math.abs(v1Rest.face.mouthSmileRight)) / 2;
  const pBias =
    (Math.abs(pRest.face.mouthSmileLeft) + Math.abs(pRest.face.mouthSmileRight)) / 2;

  const smileL = profile.channels.mouthSmileLeft;
  const smileR = profile.channels.mouthSmileRight;
  const spanL = (smileL?.usableMax ?? 0) - (smileL?.neutral ?? 0);
  const spanR = (smileR?.usableMax ?? 0) - (smileR?.neutral ?? 0);
  const pAsym = pSmile.face.mouthSmileLeft - pSmile.face.mouthSmileRight;

  const neutralBiasReduced = pBias + 1e-6 < v1Bias || pBias < 0.05;
  const weakChannelNotExploded =
    pNoseGain <= 1.0001 &&
    (noseCapability === 'weak' ||
      noseCapability === 'requires450' ||
      noseCapability === 'skipped' ||
      noseCapability === 'na') &&
    v1NoseGain > pNoseGain + 0.5;
  // Profile keeps separate L/R spans (no forced symmetry) and apply keeps L>R.
  const asymmetryPreserved =
    spanL > spanR + 0.2 &&
    (smileL?.asymmetry ?? 0) !== 0 &&
    pAsym > 0.05;

  const success =
    status === 'valid' &&
    LIVEACT_PERSONAL_CALIBRATION_DURATION_MS <= 40_000 &&
    LIVEACT_PERSONAL_CALIBRATION_DURATION_MS >= 20_000 &&
    neutralBiasReduced &&
    weakChannelNotExploded &&
    asymmetryPreserved &&
    (profile.channels.eyeBlinkLeft?.counterpartCrossTalk ?? 0) >= 0;

  return {
    contractVersion: LIVEACT_PERSONAL_CALIBRATION_CONTRACT,
    policyVersion: LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION,
    choreographyDurationMs: LIVEACT_PERSONAL_CALIBRATION_DURATION_MS,
    v1: {
      neutralSmileBias: v1Bias,
      noseSneerGain: v1NoseGain,
      smileLeftOut: v1Smile.face.mouthSmileLeft,
      smileRightOut: v1Smile.face.mouthSmileRight,
      smileAsymmetryPreserved:
        v1Smile.face.mouthSmileLeft - v1Smile.face.mouthSmileRight > 0.05,
    },
    personal: {
      neutralSmileBias: pBias,
      noseSneerGain: pNoseGain,
      noseCapability,
      smileLeftOut: pSmile.face.mouthSmileLeft,
      smileRightOut: pSmile.face.mouthSmileRight,
      smileAsymmetryPreserved: pAsym > 0.05,
      crossTalkLeftBlink: profile.channels.eyeBlinkLeft?.counterpartCrossTalk ?? 0,
      profileStatus: status,
    },
    improvements: {
      neutralBiasReduced,
      weakChannelNotExploded,
      asymmetryPreserved,
    },
    success,
    privacy: { committedRawLandmarks: 0, committedWebcam: 0 },
  };
}

/** Compile-time / gate helper — max gain constant retained. */
export const LIVEACT_PERSONAL_AB_MAX_GAIN = LIVEACT_PERSONAL_MAX_GAIN;
