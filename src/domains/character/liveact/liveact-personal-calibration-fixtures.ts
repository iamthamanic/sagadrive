/**
 * liveact-personal-calibration-fixtures — synthetic actor sequences for #449 A/B.
 * Location: src/domains/character/liveact/liveact-personal-calibration-fixtures.ts
 */

import {
  createNeutralLiveActFaceChannels,
  type LiveActFaceChannelId,
  type LiveActFaceChannels,
} from './liveact-face-contract';
import {
  createEmptyLiveActSourceSample,
  type LiveActSourceSample,
} from './liveact-contract';
import {
  LIVEACT_PERSONAL_CALIBRATION_PHASES,
  type LiveActCalibrationProfileV2,
} from './liveact-personal-calibration-contract';
import {
  advanceLiveActPersonalCalibrationPhase,
  createLiveActPersonalCalibrationSessionV2,
  finalizeLiveActPersonalCalibrationProfile,
  pushLiveActPersonalCalibrationSample,
  type LiveActPersonalCalibrationSessionV2,
} from './liveact-personal-calibration-solve';
import {
  createLiveActCalibrationAccumulator,
  createLiveActRangeCalibrationAccumulator,
  finalizeLiveActCalibration,
  finalizeLiveActRangeCalibration,
  pushLiveActCalibrationSample,
  pushLiveActRangeCalibrationSample,
  type LiveActCalibrationSetV1,
} from './liveact-calibration';

function noiseAt(i: number, amp = 0.01): number {
  const pattern = [0, 0.01, -0.008, 0.006, -0.004, 0.003, -0.007, 0.005];
  return (pattern[i % pattern.length] ?? 0) * (amp / 0.01);
}

function mutableFace(): Record<LiveActFaceChannelId, number> {
  return { ...createNeutralLiveActFaceChannels() } as Record<LiveActFaceChannelId, number>;
}

function baseSample(): LiveActSourceSample {
  const s = createEmptyLiveActSourceSample();
  s.faceIndex = 0;
  s.presence = 1;
  s.headYaw = 0.02;
  s.headPitch = -0.01;
  s.headRoll = 0.005;
  s.eyeLeftX = 0.03;
  s.eyeLeftY = -0.02;
  s.eyeRightX = 0.03;
  s.eyeRightY = -0.02;
  const face = mutableFace();
  face.mouthSmileLeft = 0.08;
  face.mouthSmileRight = 0.08;
  face.jawOpen = 0.02;
  s.face = face as LiveActFaceChannels;
  return s;
}

/**
 * Synthetic asymmetric actor session:
 * neutral smile bias, strong L / weak R smile, weak nose sneer, wink cross-talk.
 */
export function buildPersonalCalibrationActorSession(): {
  session: LiveActPersonalCalibrationSessionV2;
  profile: LiveActCalibrationProfileV2;
  v1Set: LiveActCalibrationSetV1;
} {
  const session = createLiveActPersonalCalibrationSessionV2('fixture-actor');
  let t = 0;
  const dt = 1000 / 30;

  for (let phaseIndex = 0; phaseIndex < LIVEACT_PERSONAL_CALIBRATION_PHASES.length; phaseIndex += 1) {
    session.phaseIndex = phaseIndex;
    session.phaseStartedAtMs = t;
    const phase = LIVEACT_PERSONAL_CALIBRATION_PHASES[phaseIndex]!;
    const frames = Math.ceil(phase.durationMs / dt);
    for (let i = 0; i < frames; i += 1) {
      t += dt;
      const sample = baseSample();
      const face = mutableFace();
      face.mouthSmileLeft = 0.08;
      face.mouthSmileRight = 0.08;
      face.jawOpen = 0.02;
      sample.headYaw = 0.02 + noiseAt(i);
      sample.headPitch = -0.01 + noiseAt(i + 1);
      sample.headRoll = 0.005 + noiseAt(i + 2, 0.005);
      sample.eyeLeftX = 0.03 + noiseAt(i + 3, 0.008);
      sample.eyeLeftY = -0.02 + noiseAt(i + 4, 0.008);
      sample.eyeRightX = 0.03 + noiseAt(i + 5, 0.008);
      sample.eyeRightY = -0.02 + noiseAt(i + 6, 0.008);

      if (phase.id === 'headGaze') {
        const u = i / frames;
        sample.headYaw = 0.02 + Math.sin(u * Math.PI * 2) * 0.35;
        sample.headPitch = -0.01 + Math.sin(u * Math.PI * 2 + 1) * 0.25;
        sample.eyeLeftX = 0.03 + Math.sin(u * Math.PI * 2) * 0.4;
        sample.eyeRightX = 0.03 + Math.sin(u * Math.PI * 2) * 0.4;
        sample.eyeLeftY = -0.02 + Math.cos(u * Math.PI * 2) * 0.3;
        sample.eyeRightY = -0.02 + Math.cos(u * Math.PI * 2) * 0.3;
      } else if (phase.id === 'eyesBrows') {
        const blink = i % 20 < 4 ? 0.95 : 0.05;
        face.eyeBlinkLeft = blink;
        face.eyeBlinkRight = blink > 0.5 ? 0.25 : 0.05;
        if (i > frames * 0.4 && i < frames * 0.55) {
          face.eyeBlinkLeft = 0.95;
          face.eyeBlinkRight = 0.2;
        }
        face.browInnerUp = i % 15 < 5 ? 0.7 : 0.05;
      } else if (phase.id === 'jawSmile') {
        face.jawOpen = i % 18 < 6 ? 0.75 : 0.05;
        face.mouthSmileLeft = i % 16 < 7 ? 0.85 : 0.1;
        face.mouthSmileRight = i % 16 < 7 ? 0.35 : 0.1;
        face.noseSneerLeft = 0.04 + noiseAt(i, 0.02);
      } else if (phase.id === 'lips') {
        face.mouthPucker = i % 14 < 5 ? 0.7 : 0.05;
        face.mouthFunnel = i % 16 < 5 ? 0.65 : 0.05;
        face.mouthPressLeft = i % 12 < 4 ? 0.55 : 0.05;
        face.mouthPressRight = i % 12 < 4 ? 0.5 : 0.05;
        face.mouthRollUpper = i % 10 < 3 ? 0.45 : 0.05;
        face.cheekPuff = i % 20 < 4 ? 0.3 : 0.05;
      } else if (phase.id === 'speech') {
        const u = (i / frames) * Math.PI * 6;
        face.jawOpen = 0.15 + 0.45 * Math.max(0, Math.sin(u));
        face.mouthPucker = 0.1 + 0.35 * Math.max(0, Math.sin(u + 0.5));
        face.mouthSmileLeft = 0.1 + 0.25 * Math.max(0, Math.sin(u + 1));
        face.mouthSmileRight = 0.1 + 0.15 * Math.max(0, Math.sin(u + 1.2));
      }

      sample.face = face as LiveActFaceChannels;
      pushLiveActPersonalCalibrationSample(session, sample, { headPoseSupported: true });
    }
    if (phaseIndex < LIVEACT_PERSONAL_CALIBRATION_PHASES.length - 1) {
      advanceLiveActPersonalCalibrationPhase(session);
    }
  }

  const profile = finalizeLiveActPersonalCalibrationProfile(session, 1_700_000_000_000);

  const neuAcc = createLiveActCalibrationAccumulator();
  for (let i = 0; i < 40; i += 1) {
    const s = baseSample();
    s.headYaw = 0.02 + noiseAt(i);
    pushLiveActCalibrationSample(neuAcc, s, { headPoseSupported: true });
  }
  const neutral = finalizeLiveActCalibration(neuAcc);
  if (!neutral) {
    throw new Error('fixture neutral finalize failed');
  }
  const rangeAcc = createLiveActRangeCalibrationAccumulator();
  for (let i = 0; i < 80; i += 1) {
    const s = baseSample();
    const face = mutableFace();
    face.mouthSmileLeft = i % 10 < 5 ? 0.85 : 0.1;
    face.mouthSmileRight = i % 10 < 5 ? 0.35 : 0.1;
    face.noseSneerLeft = i % 10 < 5 ? 0.16 : 0.02;
    face.jawOpen = i % 12 < 4 ? 0.75 : 0.05;
    s.face = face as LiveActFaceChannels;
    pushLiveActRangeCalibrationSample(rangeAcc, s);
  }
  const range = finalizeLiveActRangeCalibration(rangeAcc, neutral);
  const v1Set: LiveActCalibrationSetV1 = { neutral, range };

  return { session, profile, v1Set };
}
