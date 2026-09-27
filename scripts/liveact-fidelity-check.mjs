#!/usr/bin/env node
/**
 * liveact-fidelity-check — regression guards for LiveAct 1:1 fidelity fixes.
 * Location: scripts/liveact-fidelity-check.mjs
 *
 * 1. Calibration pipeline: baseline subtracted once (no smoothing feedback), range gains,
 *    tracking-lost easing without jumps (real domain functions, engine order).
 * 1c. Tracking conventions: MediaPipe head matrix → yaw/pitch/roll (physically defined poses, no
 *    axis cross-talk), left/right mirror, conjugate gaze sign, engine RAW anatomical vs. MAPPED
 *    mirrored, diagnostics peaks, head / eye application with real three-vrm LookAt appliers.
 * 2. Ownership: procedural idle cannot overwrite the LiveAct head while suspended
 *    (real AvatarAnimationRuntime + three AnimationMixer).
 * 3. Reference VRM teeth binds: patch lib on a synthetic GLB (+ local binary when present).
 * 4. Wiring: engine / viewer / runtime / UI prompt / fetch script / test-gate.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';
import * as THREE from 'three';
import {
  hasReferenceVrmTeethBinds,
  patchReferenceVrmTeethBinds,
  readGlbChunks,
  writeGlb,
} from './lib/liveact-reference-vrm-teeth-binds.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-fidelity-check FAIL: ${msg}`);
    process.exit(1);
  }
}

function near(actual, expected, tolerance, msg) {
  check(
    typeof actual === 'number' && Math.abs(actual - expected) <= tolerance,
    `${msg} (expected ${expected}±${tolerance}, got ${actual})`,
  );
}

async function bundle(entry, outName, extra = {}) {
  const outfile = join(root, '.qa/runs', outName);
  await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    format: 'esm',
    write: true,
    outfile,
    logLevel: 'silent',
    ...extra,
  });
  return import(`${outfile}?t=${Date.now()}`);
}

// --- 1. Calibration pipeline --------------------------------------------------------------
const d = await bundle('src/domains/character/liveact/index.ts', 'liveact-fidelity-domain-bundle.mjs', {
  platform: 'neutral',
});

const NEUTRAL_FACE = { eyeBlinkLeft: 0.25, eyeBlinkRight: 0.25, jawOpen: 0.02 };
const sample = (over = {}) => ({
  presence: 0.95,
  faceIndex: 0,
  faceCount: 1,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0.1,
  eyeLeftX: 0,
  eyeLeftY: 0,
  eyeRightX: 0,
  eyeRightY: 0,
  ...over,
  face: { ...NEUTRAL_FACE, ...(over.face ?? {}) },
});
const lostSample = () => sample({ presence: 0, faceIndex: -1, faceCount: 0 });

const neutralAcc = d.createLiveActCalibrationAccumulator();
for (let i = 0; i < 30; i += 1) {
  d.pushLiveActCalibrationSample(neutralAcc, sample(), { headPoseSupported: true });
}
const neutral = d.finalizeLiveActCalibration(neutralAcc);
check(neutral !== null, 'neutral baseline from 30 frames');

let sequence = 0;
function run(input, frames, calibration, previous = null) {
  let step = previous;
  const trace = [];
  for (let i = 0; i < frames; i += 1) {
    sequence += 1;
    const mapped = d.mapLiveActSourceSample(input, { timestampMs: sequence * 33, sequence });
    step = d.stepLiveActCalibratedFrame(step, mapped, calibration);
    trace.push(step);
  }
  return { step, trace };
}

const neutralOnly = { neutral, range: null };
let state = run(sample(), 60, neutralOnly).step;
near(state.calibrated.face.eyeBlinkLeft, 0, 1e-6, 'neutral pose → blink 0');
near(state.calibrated.head.roll, 0, 1e-6, 'neutral pose → roll 0 (was −0.186 with feedback)');
state = run(sample({ face: { eyeBlinkLeft: 0.85, eyeBlinkRight: 0.85 } }), 60, neutralOnly, state).step;
near(state.calibrated.face.eyeBlinkLeft, 0.6, 1e-3, 'eyes closed → blink 0.60 (was 0.136)');
state = run(sample({ face: { jawOpen: 0.6 } }), 60, neutralOnly, state).step;
near(state.calibrated.face.jawOpen, 0.58, 1e-3, 'mouth wide → jaw 0.58');
state = run(sample({ headRoll: 0.3 }), 60, neutralOnly, state).step;
near(state.calibrated.head.roll, 0.2, 1e-3, 'head roll +0.3 → 0.20 (was 0.014)');
near(state.smoothed.head.roll, 0.3, 1e-3, 'smoothing state stays uncalibrated');

const rangeAcc = d.createLiveActRangeCalibrationAccumulator();
for (let i = 0; i < 150; i += 1) {
  const peak = i < 60;
  check(
    d.pushLiveActRangeCalibrationSample(
      rangeAcc,
      sample({
        face: peak
          ? {
              eyeBlinkLeft: 0.85,
              eyeBlinkRight: 0.85,
              jawOpen: 0.56,
              browInnerUp: 0.5,
              mouthSmileLeft: 0.12,
              cheekPuff: 0.05,
              mouthFunnel: i === 5 ? 0.9 : 0,
            }
          : {},
      }),
    ),
    'range sample push',
  );
}
check(!d.pushLiveActRangeCalibrationSample(rangeAcc, lostSample()), 'lost frame skipped in max pass');
const range = d.finalizeLiveActRangeCalibration(rangeAcc, neutral);
check(range !== null, 'range calibration from max pass');
near(range.gain.eyeBlinkLeft, 1 / 0.6, 1e-6, 'blink gain = 1/(peak − neutral)');
near(range.gain.jawOpen, 1 / 0.54, 1e-6, 'jaw gain = 1/(peak − neutral)');
near(range.gain.browInnerUp, 2, 1e-6, 'brow gain');
near(range.gain.mouthSmileLeft, d.LIVEACT_RANGE_MAX_GAIN, 1e-9, 'gain capped');
check(range.gain.cheekPuff === undefined, 'span below minimum stays 1:1');
check(range.gain.mouthFunnel === undefined, 'single-frame spike ignored (p95)');
check(range.gain.tongueOut === undefined, 'unexercised channel stays 1:1');

const shortAcc = d.createLiveActRangeCalibrationAccumulator();
for (let i = 0; i < 29; i += 1) d.pushLiveActRangeCalibrationSample(shortAcc, sample());
check(d.finalizeLiveActRangeCalibration(shortAcc, neutral) === null, '<30 frames → no range');

const full = { neutral, range };
state = run(sample({ face: { eyeBlinkLeft: 0.85, eyeBlinkRight: 0.85, jawOpen: 0.56 } }), 60, full).step;
near(state.calibrated.face.eyeBlinkLeft, 1, 1e-3, 'max blink reaches 1.0');
near(state.calibrated.face.jawOpen, 1, 1e-3, 'max jaw reaches 1.0');
state = run(sample({ face: { jawOpen: 0.29 } }), 60, full, state).step;
near(state.calibrated.face.jawOpen, 0.5, 1e-3, 'half jaw → 0.5');
state = run(sample(), 60, full, state).step;
near(state.calibrated.face.jawOpen, 0, 1e-6, 'neutral stays 0 with range');

state = run(sample({ headRoll: 0.3 }), 60, full).step;
near(state.calibrated.head.roll, 0.2, 1e-3, 'steady roll before loss');
const lost = run(lostSample(), 30, full, state);
const firstLost = lost.trace[0].calibrated;
check(firstLost.trackingLost, 'lost frame flagged');
check(
  firstLost.head.roll <= 0.2 + 1e-9 && firstLost.head.roll >= 0.2 * (1 - 0.35 * 0.65) - 1e-6,
  `tracking lost eases from calibrated pose without jump (got ${firstLost.head.roll})`,
);
near(firstLost.face.eyeBlinkLeft, 0, 1e-9, 'lost face → neutral');
check(Math.abs(lost.step.calibrated.head.roll) < 0.01, 'lost eases to neutral');
const lastLostRoll = lost.step.calibrated.head.roll;
const reacquired = run(sample({ headRoll: 0.3 }), 60, full, lost.step);
const firstBack = reacquired.trace[0].calibrated.head.roll;
check(
  firstBack >= lastLostRoll - 1e-9 && firstBack <= 0.2 + 1e-9,
  `re-acquire blends without jump (last lost ${lastLostRoll}, first back ${firstBack})`,
);
near(reacquired.step.calibrated.head.roll, 0.2, 1e-3, 're-acquire converges');

// --- 1b. Engine two-step calibration state machine (real engine, controlled clock) ---------
const engineModule = await bundle(
  'src/infrastructure/character/liveact/liveact-engine.ts',
  'liveact-fidelity-engine-bundle.mjs',
  { platform: 'node', external: ['@mediapipe/tasks-vision'] },
);
let clock = 1000;
const originalNow = Object.getOwnPropertyDescriptor(performance, 'now');
Object.defineProperty(performance, 'now', { value: () => clock, configurable: true, writable: true });
try {
  const engine = new engineModule.LiveActEngine(async () => {
    throw new Error('no face source in check');
  });
  const feed = (input, frames) => {
    let last = null;
    const messages = new Set();
    for (let i = 0; i < frames; i += 1) {
      clock += 33;
      last = engine.ingestSampleForTests(typeof input === 'function' ? input(i) : input, clock);
      messages.add(engine.getState().calibrationMessage);
    }
    return { last, messages };
  };
  // Camera start is out of scope here; calibrate() only requires a live tracking status.
  engine.status = 'active';
  const grimace = sample({
    face: { eyeBlinkLeft: 0.85, eyeBlinkRight: 0.85, jawOpen: 0.56, browInnerUp: 0.5 },
  });

  const rangeSteps = d.LIVEACT_RANGE_CALIBRATION_STEPS;
  const firstRun = engine.calibrate();
  check(
    engine.getState().calibrationStatus === 'running' &&
      new RegExp(`Schritt 1/${rangeSteps.length + 1}`).test(engine.getState().calibrationMessage),
    'engine starts with neutral step',
  );
  feed(sample(), 30);
  check(engine.getState().hasNeutralBaseline, 'engine stores neutral after 30 frames');
  check(
    engine.getState().calibrationStatus === 'running' &&
      /Mund weit auf/.test(engine.getState().calibrationMessage),
    'engine continues with jaw-open step',
  );
  check(engine.getState().calibrationStepPhase === 'armed', 'jaw step waits for Start');
  check(engine.getState().canStartCalibrationHold, 'Start unlocked when armed');
  check(!engine.getState().canAdvanceCalibration, 'Weiter locked until review');
  for (let i = 0; i < rangeSteps.length; i += 1) {
    const step = rangeSteps[i];
    const holdFrames = Math.ceil(step.holdMs / 33) + 5;
    check(
      engine.getState().calibrationMessage.includes(step.labelDe),
      `range step ${i + 1}: ${step.labelDe}`,
    );
    check(engine.getState().canStartCalibrationHold, `Start ready at ${step.id}`);
    engine.startCalibrationHold();
    check(engine.getState().calibrationStepPhase === 'holding', `holding ${step.id}`);
    feed(grimace, holdFrames);
    check(engine.getState().calibrationStepPhase === 'review', `review ${step.id}`);
    check(engine.getState().calibrationStepPeaks.length > 0, `peaks for ${step.id}`);
    check(engine.getState().canRetryCalibrationHold, `Wiederholen at ${step.id}`);
    check(
      engine.getState().calibrationAdvanceLabelDe ===
        (i === rangeSteps.length - 1 ? 'Fertig' : 'Weiter'),
      `advance label at ${step.id}`,
    );
    engine.advanceCalibration();
  }
  const firstResult = await firstRun;
  check(firstResult.ok && /Neutral \+ Maximal/.test(firstResult.messageDe), 'engine resolves after max pass');
  check(engine.getState().hasRangeCalibration, 'engine exposes range calibration');
  check(engine.getState().calibrationStatus === 'success', 'calibration success status');
  near(feed(grimace, 60).last.face.jawOpen, 1, 1e-3, 'engine output reaches 1.0 at calibrated max');
  near(feed(sample(), 60).last.face.eyeBlinkLeft, 0, 1e-6, 'engine neutral stays 0');

  const secondRun = engine.calibrate();
  feed(sample(), 30);
  check(!engine.getState().hasRangeCalibration, 'new neutral clears previous range gains');
  for (let step = 0; step < rangeSteps.length; step += 1) {
    const holdFrames = Math.ceil(rangeSteps[step].holdMs / 33) + 5;
    engine.startCalibrationHold();
    feed(sample(), holdFrames);
    engine.advanceCalibration();
  }
  const secondResult = await secondRun;
  check(
    secondResult.ok && /ohne genug Bewegung/.test(secondResult.messageDe) && !engine.getState().hasRangeCalibration,
    'max pass without movement keeps neutral and stays 1:1',
  );

  const cancelled = engine.calibrate();
  feed(sample(), 30);
  engine.stop();
  const cancelResult = await cancelled;
  check(!cancelResult.ok && engine.getState().calibrationStatus === 'idle', 'stop cancels a running max pass');
  engine.dispose();
} finally {
  if (originalNow) Object.defineProperty(performance, 'now', originalNow);
  else delete performance.now;
}

// --- 1c. Tracking conventions ---------------------------------------------------------------
// MediaPipe facial transform (column-major; camera space of the raw frame: +X image right = the
// user's own left, +Y up, +Z toward the camera) with scale + translation like the real matrix.
const facialTransform = (rotation, scale = 0.93) =>
  new THREE.Matrix4()
    .compose(new THREE.Vector3(1.5, -2, -40), rotation, new THREE.Vector3(scale, scale, scale))
    .toArray();
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const turn = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());
const headFrom = (rotation) => d.liveActHeadPoseFromFacialTransform(facialTransform(rotation));
const A20 = THREE.MathUtils.degToRad(20);
const S20 = Math.sin(A20);
const C20 = Math.cos(A20);
for (const [label, rotation, want] of [
  ["face turned toward the user's own left", turn(AXIS_Z, new THREE.Vector3(S20, 0, C20)), { yaw: A20, pitch: 0, roll: 0 }],
  ['face turned down', turn(AXIS_Z, new THREE.Vector3(0, -S20, C20)), { yaw: 0, pitch: A20, roll: 0 }],
  ["head tilted toward the user's right shoulder", turn(AXIS_Y, new THREE.Vector3(-S20, C20, 0)), { yaw: 0, pitch: 0, roll: A20 }],
]) {
  const pose = headFrom(rotation);
  for (const axis of ['yaw', 'pitch', 'roll']) near(pose[axis], want[axis], 1e-6, `${label}: ${axis}`);
}
for (const [pitch, yaw, roll] of [
  [-0.2, 0.3, -0.15],
  [0.35, -0.5, 0.3],
]) {
  const pose = headFrom(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')));
  near(pose.pitch, pitch, 1e-6, `combined head pose: pitch ${pitch}`);
  near(pose.yaw, yaw, 1e-6, `combined head pose: yaw ${yaw}`);
  near(pose.roll, roll, 1e-6, `combined head pose: roll ${roll}`);
}
const gimbal = headFrom(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0.4, 0, 'YXZ')));
near(gimbal.pitch, Math.PI / 2, 1e-6, 'gimbal lock: pitch 90°');
near(gimbal.yaw, 0.4, 1e-6, 'gimbal lock: shared axis attributed to yaw');
near(gimbal.roll, 0, 1e-12, 'gimbal lock: roll 0');
check(
  d.liveActHeadPoseFromFacialTransform(null) === null && d.liveActHeadPoseFromFacialTransform([1, 0, 0]) === null,
  'missing / short head matrix → null',
);

const asymmetric = sample({
  headYaw: 0.3,
  headPitch: 0.2,
  headRoll: 0.1,
  eyeLeftX: 0.4,
  eyeLeftY: 0.3,
  eyeRightX: 0.2,
  eyeRightY: -0.1,
  face: { eyeBlinkLeft: 0.9, eyeBlinkRight: 0.1, jawLeft: 0.7, mouthSmileLeft: 0.6, mouthPucker: 0.5, jawOpen: 0.3 },
});
const mirrored = d.mirrorLiveActSourceSample(asymmetric);
near(mirrored.headYaw, -0.3, 1e-12, 'mirror: yaw flips');
near(mirrored.headPitch, 0.2, 1e-12, 'mirror: pitch stays');
near(mirrored.headRoll, -0.1, 1e-12, 'mirror: roll flips');
near(mirrored.eyeLeftX, -0.2, 1e-12, "mirror: avatar left eye = user's right eye, x flipped");
near(mirrored.eyeLeftY, -0.1, 1e-12, 'mirror: vertical gaze stays');
near(mirrored.eyeRightX, -0.4, 1e-12, "mirror: avatar right eye = user's left eye, x flipped");
near(mirrored.eyeRightY, 0.3, 1e-12, 'mirror: vertical gaze stays (right eye)');
check(
  mirrored.face.eyeBlinkRight === 0.9 && mirrored.face.eyeBlinkLeft === 0.1,
  "mirror: user's left blink → avatar's eyeBlinkRight",
);
check(mirrored.face.jawRight === 0.7 && mirrored.face.jawLeft === undefined, 'mirror: jawLeft → jawRight');
check(
  mirrored.face.mouthSmileRight === 0.6 && mirrored.face.mouthPucker === 0.5 && mirrored.face.jawOpen === 0.3,
  'mirror: sided channels swap, centre channels stay',
);
const sameValues = (a, b) => Object.keys({ ...a, ...b }).every((key) => a[key] === b[key]);
const { face: faceBefore, ...restBefore } = asymmetric;
const { face: faceTwice, ...restTwice } = d.mirrorLiveActSourceSample(mirrored);
check(sameValues(restBefore, restTwice) && sameValues(faceBefore, faceTwice), 'mirror twice = original sample');
for (const id of d.LIVEACT_FACE_CHANNELS) {
  const twin = d.mirroredLiveActFaceChannel(id);
  check(d.LIVEACT_FACE_CHANNELS.includes(twin) && d.mirroredLiveActFaceChannel(twin) === id, `${id}: twin round trip`);
  check(/(Left|Right)$/.test(id) === (twin !== id), `${id}: sided channels have a twin, centre channels map to themselves`);
}
check(d.LIVEACT_MIRROR_AVATAR === true, 'app convention: the avatar mirrors the user like the mirrored PiP');

const mediaPipe = (scores, options = {}) =>
  d.mapMediaPipeFaceToLiveActSample({
    categories: Object.entries(scores).map(([categoryName, score]) => ({ categoryName, score })),
    matrix: options.matrix ?? null,
    enableHeadPose: options.enableHeadPose ?? true,
    faceIndex: 0,
    faceCount: 1,
  });
const gazeLeft = mediaPipe({ eyeLookOutLeft: 0.6, eyeLookInRight: 0.5 });
near(gazeLeft.eyeLeftX, 0.6, 1e-12, "gaze toward the user's own left: left eye looks out → +x");
near(gazeLeft.eyeRightX, 0.5, 1e-12, "gaze toward the user's own left: right eye looks in → +x (conjugate)");
const gazeRight = mediaPipe({ eyeLookInLeft: 0.5, eyeLookOutRight: 0.6 });
check(gazeRight.eyeLeftX < 0 && gazeRight.eyeRightX < 0, "gaze toward the user's right: both eyes −x");
const gazeUp = mediaPipe({ eyeLookUpLeft: 0.4, eyeLookUpRight: 0.4, eyeLookDownLeft: 0.1 });
near(gazeUp.eyeLeftY, 0.3, 1e-12, 'gaze up → +y (left eye, up − down)');
near(gazeUp.eyeRightY, 0.4, 1e-12, 'gaze up → +y (right eye)');
const headMatrix = facialTransform(turn(AXIS_Z, new THREE.Vector3(S20, 0, C20)));
const tracked = mediaPipe({ eyeBlinkLeft: 0.8, jawOpen: 0.4 }, { matrix: headMatrix });
near(tracked.headYaw, A20, 1e-6, 'mapper passes the matrix head pose');
check(tracked.face.eyeBlinkLeft === 0.8, 'mapper keeps anatomical blendshapes (RAW)');
check(
  tracked.face.tongueOut === undefined,
  'MediaPipe has no tongueOut category: channel stays unset (asset capability only)',
);
check(mediaPipe({}, { matrix: headMatrix, enableHeadPose: false }).headYaw === 0, 'head pose disabled → 0');

const orientEngine = new engineModule.LiveActEngine(async () => {
  throw new Error('no face source in check');
});
try {
  const oriented = orientEngine.ingestSampleForTests(asymmetric, 5000);
  const stages = orientEngine.getDiagnosticsV2()?.stages;
  check(Boolean(stages), 'engine exposes Diagnostics V2 after a sample');
  near(stages.raw['face.eyeBlinkLeft'], 0.9, 1e-12, "Diagnostics RAW stays anatomical (user's left blink)");
  near(stages.raw['head.yaw'], 0.3, 1e-12, 'Diagnostics RAW yaw anatomical');
  near(stages.mapped['face.eyeBlinkRight'], 0.9, 1e-12, 'Diagnostics MAPPED is avatar-oriented (mirrored)');
  near(stages.mapped['head.yaw'], -0.3, 1e-12, 'Diagnostics MAPPED yaw mirrored');
  near(oriented.face.eyeBlinkRight, 0.9, 1e-12, "engine frame: user's left blink closes the avatar's right eye");
  near(oriented.head.roll, -0.1, 1e-12, 'engine frame: roll mirrored');
} finally {
  orientEngine.dispose();
}

const peaks = d.createLiveActDiagnosticsPeaks();
const peakSnapshot = (sequence, values, applied, trackingLost = false) => ({
  contractVersion: d.LIVEACT_DIAGNOSTICS_V2_VERSION,
  timestampMs: sequence * 33,
  sequence,
  trackingLost,
  stages: { raw: values, mapped: values, smoothed: values, calibrated: values, retargeted: values, applied },
});
check(
  d.accumulateLiveActDiagnosticsPeaks(
    peaks,
    peakSnapshot(1, { 'face.mouthPucker': 0.2, 'head.yaw': -0.1 }, { 'face.mouthPucker': { status: 'supported', value: 0.1 } }),
  ),
  'peaks count a new engine frame',
);
check(!d.accumulateLiveActDiagnosticsPeaks(peaks, peakSnapshot(1, { 'face.mouthPucker': 0.9 }, {})), 'same snapshot counted once');
d.accumulateLiveActDiagnosticsPeaks(
  peaks,
  peakSnapshot(
    2,
    { 'face.mouthPucker': 0.6, 'head.yaw': 0.2 },
    { 'face.mouthPucker': { status: 'supported', value: 0.3 }, 'face.tongueOut': { status: 'unavailable', value: null } },
  ),
);
check(!d.accumulateLiveActDiagnosticsPeaks(peaks, peakSnapshot(3, { 'face.mouthPucker': 1 }, {}, true)), 'tracking-lost frames skipped');
const peakExport = d.exportLiveActDiagnosticsPeaks(peaks);
check(peakExport.frames === 2, 'peak frame count');
check(JSON.stringify(peakExport.signals['face.mouthPucker'].raw) === '[0.2,0.6]', 'peaks: RAW min/max');
check(JSON.stringify(peakExport.signals['face.mouthPucker'].applied) === '[0.1,0.3]', 'peaks: APPLIED min/max');
check(JSON.stringify(peakExport.signals['head.yaw'].raw) === '[-0.1,0.2]', 'peaks: signed signals keep their minimum');
check(peakExport.signals['face.tongueOut'] === undefined, 'peaks: unavailable / idle signals left out');
check(peakExport.avatarMirrored === d.LIVEACT_MIRROR_AVATAR, 'peaks export states the avatar orientation');

const poseDrive = await bundle(
  'src/infrastructure/character/liveact/liveact-pose-drive.ts',
  'liveact-fidelity-pose-drive-bundle.mjs',
  { platform: 'node', external: ['three', '@pixiv/three-vrm'] },
);
const { VRMLookAtBoneApplier, VRMLookAtExpressionApplier, VRMLookAtRangeMap } = await import('@pixiv/three-vrm');

const headNode = new THREE.Object3D();
const headAxes = (pose, rest = new THREE.Quaternion()) => {
  poseDrive.applyLiveActHeadRotation(headNode, rest, pose, new THREE.Euler(), new THREE.Quaternion());
  return {
    forward: AXIS_Z.clone().applyQuaternion(headNode.quaternion),
    up: AXIS_Y.clone().applyQuaternion(headNode.quaternion),
  };
};
check(headAxes({ yaw: 0.35, pitch: 0, roll: 0 }).forward.x > 0.3, "+yaw turns the head toward the avatar's own left (+X)");
check(headAxes({ yaw: 0, pitch: 0.26, roll: 0 }).forward.y < -0.2, '+pitch turns the face down');
check(headAxes({ yaw: 0, pitch: 0, roll: 0.26 }).up.x < -0.2, "+roll tilts toward the avatar's right shoulder (−X)");
const headRestPose = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.16, 0, 0));
headAxes({ yaw: 0, pitch: 0, roll: 0 }, headRestPose);
check(headNode.quaternion.angleTo(headRestPose) < 1e-9, 'zero head pose keeps the authored rest');
headAxes({ yaw: 0.3, pitch: -0.2, roll: 0.15 });
const decodedHead = d.liveActHeadPoseFromFacialTransform(facialTransform(headNode.quaternion));
near(decodedHead.yaw, 0.3, 1e-6, 'avatar head → facial transform → same yaw');
near(decodedHead.pitch, -0.2, 1e-6, 'avatar head → facial transform → same pitch');
near(decodedHead.roll, 0.15, 1e-6, 'avatar head → facial transform → same roll');

const rangeMap = (inputMax, outputScale) => new VRMLookAtRangeMap(inputMax, outputScale);
const rawEyes = { leftEye: new THREE.Object3D(), rightEye: new THREE.Object3D() };
new THREE.Group().add(rawEyes.leftEye);
new THREE.Group().add(rawEyes.rightEye);
const normalizedEyes = { leftEye: new THREE.Object3D(), rightEye: new THREE.Object3D() };
const eyeHumanoid = {
  getRawBoneNode: (name) => rawEyes[name] ?? null,
  getNormalizedBoneNode: (name) => normalizedEyes[name] ?? null,
};
// Distinct vertical maps reveal which one three-vrm reads for up (pitch < 0) and for down.
const boneApplier = new VRMLookAtBoneApplier(eyeHumanoid, rangeMap(30, 30), rangeMap(30, 30), rangeMap(20, 12), rangeMap(40, 30));
const boneScale = poseDrive.liveActLookAtGazeScaleDeg(boneApplier);
check(
  boneScale.horizontal === 30 && boneScale.up === 20 && boneScale.down === 40,
  `bone LookAt scale from the declared ranges (got ${JSON.stringify(boneScale)})`,
);
const driveLookAt = (applier, x, y) => {
  const vrm = { lookAt: { applier, yaw: 0, pitch: 0 } };
  poseDrive.applyLiveActVrmEyeLookAt(vrm, { x, y }, { x, y });
  applier.applyYawPitch(vrm.lookAt.yaw, vrm.lookAt.pitch);
};
const leftEyeDeg = (x, y) => {
  driveLookAt(boneApplier, x, y);
  const forward = AXIS_Z.clone().applyQuaternion(rawEyes.leftEye.quaternion);
  return {
    toAvatarLeft: THREE.MathUtils.radToDeg(Math.asin(forward.x)),
    up: THREE.MathUtils.radToDeg(Math.asin(forward.y)),
  };
};
near(leftEyeDeg(1, 0).toAvatarLeft, 30, 1e-6, "gaze x +1 → the asset's full 30° toward the avatar's left (+X)");
near(leftEyeDeg(0.5, 0).toAvatarLeft, 15, 1e-6, 'gaze is linear inside the declared range');
near(leftEyeDeg(0, 1).up, 12, 1e-6, 'gaze up +1 → full output of the map three-vrm reads for up (rangeMapVerticalDown)');
near(leftEyeDeg(0, -1).up, -30, 1e-6, 'gaze down −1 → full output of the down map (rangeMapVerticalUp)');
near(leftEyeDeg(0, 0).up, 0, 1e-9, 'neutral gaze → eyes at rest (head-relative, no world target)');

const lookWeights = {};
const expressionApplier = new VRMLookAtExpressionApplier(
  { setValue: (name, value) => (lookWeights[name] = value) },
  rangeMap(90, 10),
  rangeMap(90, 10),
  rangeMap(90, 10),
  rangeMap(90, 10),
);
near(poseDrive.liveActLookAtGazeScaleDeg(expressionApplier).horizontal, 9, 1e-9, 'expression LookAt: full weight at 90° × 1/10');
for (const x of [0.25, 0.5, 1]) {
  driveLookAt(expressionApplier, x, 0);
  near(lookWeights.lookLeft, x, 1e-9, `expression gaze x ${x} → lookLeft ${x} (linear, not saturated early)`);
}
driveLookAt(expressionApplier, 0, 0.5);
near(lookWeights.lookUp, 0.5, 1e-9, 'expression gaze up 0.5 → lookUp 0.5');
check(lookWeights.lookDown === 0, 'expression gaze up → lookDown 0');
const fallbackScale = poseDrive.liveActLookAtGazeScaleDeg({ applyYawPitch() {} });
check(
  fallbackScale.horizontal === 30 && fallbackScale.up === 30 && fallbackScale.down === 30,
  'unknown LookAt applier → 30° fallback',
);

// --- 2. Ownership: idle suspended while LiveAct drives ------------------------------------
const anim = await bundle(
  'src/infrastructure/character/avatar/avatar-animation-runtime.ts',
  'liveact-fidelity-animation-bundle.mjs',
  { platform: 'node', external: ['three'] },
);

const scene = new THREE.Group();
const bones = {};
let parent = scene;
for (const name of ['Hips', 'Spine', 'Chest', 'Neck', 'Head']) {
  const bone = new THREE.Bone();
  bone.name = name;
  parent.add(bone);
  bones[name] = bone;
  parent = bone;
}
const headRest = new THREE.Quaternion(-0.1567, 0, 0, 0.9876).normalize();
bones.Head.quaternion.copy(headRest);
const analysis = {
  rig: {
    bones: { hips: 'Hips', spine: 'Spine', chest: 'Chest', neck: 'Neck', head: 'Head' },
    anchors: {},
  },
  capabilities: { flags: ['rigged'] },
};
const liveActHead = headRest
  .clone()
  .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.2, 'YXZ')));
const runtime = new anim.AvatarAnimationRuntime();
runtime.bind(scene, analysis);
check(runtime.getActiveAction() === null, 'bind stays in rest pose (no idle autoplay)');
check(runtime.play('idle') === true, 'idle starts on demand');

function driveHead(frames) {
  let maxError = 0;
  for (let i = 0; i < frames; i += 1) {
    bones.Head.quaternion.copy(liveActHead);
    runtime.update(1 / 30);
    maxError = Math.max(maxError, bones.Head.quaternion.angleTo(liveActHead));
  }
  return maxError;
}

check(driveHead(30) > 0.1, 'repro: running idle overwrites the LiveAct head');
runtime.setSuspended(true);
check(runtime.isSuspended() && runtime.getActiveAction() === null, 'suspend stops actions');
check(bones.Head.quaternion.angleTo(headRest) < 1e-6, 'suspend restores the authored head rest');
check(driveHead(60) < 1e-6, 'suspended: LiveAct head survives the render-loop update');
check(runtime.play('idle') === false, 'play blocked while suspended');
check(runtime.play('walk') === false, 'unsupported action rejected');
runtime.setSuspended(false);
check(runtime.getActiveAction() === 'idle', 'resume replays the remembered action');
runtime.setSuspended(true);
runtime.bind(scene, analysis);
check(runtime.getActiveAction() === null, 'rebind while suspended does not auto-play');
check(driveHead(30) < 1e-6, 'rebind while suspended keeps LiveAct head');
runtime.setSuspended(false);
check(runtime.getActiveAction() === null, 'resume after rebind stays still without prior play');
runtime.dispose();

// --- 3. Reference VRM teeth binds -----------------------------------------------------------
const TEETH = ['h_teeth.t_MouthOpen_h', 'h_teeth.t_Ljaw_h', 'h_teeth.t_Rjaw_h', 'h_teeth.t_JawFront_h'];
const JAW = ['jawOpen', 'jawLeft', 'jawRight', 'jawForward'];
const fixtureJson = (teeth = TEETH) => ({
  asset: { version: '2.0' },
  nodes: [
    { name: 'Skin', mesh: 0 },
    { name: 'h_TeethDown', mesh: 1 },
  ],
  meshes: [
    { extras: { targetNames: JAW }, primitives: [] },
    { extras: { targetNames: teeth }, primitives: [] },
  ],
  extensions: {
    VRMC_vrm: {
      expressions: {
        custom: Object.fromEntries(
          JAW.map((name, index) => [name, { morphTargetBinds: [{ node: 0, index, weight: 1 }] }]),
        ),
      },
    },
  },
});
const fixtureBin = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
const fixture = writeGlb(fixtureJson(), fixtureBin);
check(!hasReferenceVrmTeethBinds(readGlbChunks(fixture).json), 'fixture starts without teeth binds');
const patched = patchReferenceVrmTeethBinds(fixture);
check(patched.added.length === 4, 'patch adds 4 teeth binds');
const patchedChunks = readGlbChunks(patched.buffer);
check(hasReferenceVrmTeethBinds(patchedChunks.json), 'patched fixture has teeth binds');
check(Buffer.compare(patchedChunks.bin, fixtureBin) === 0, 'BIN chunk untouched');
const jawOpenBinds = patchedChunks.json.extensions.VRMC_vrm.expressions.custom.jawOpen.morphTargetBinds;
check(
  jawOpenBinds.length === 2 && jawOpenBinds[1].node === 1 && jawOpenBinds[1].index === 0,
  'jawOpen keeps skin bind and adds lower teeth',
);
const again = patchReferenceVrmTeethBinds(patched.buffer);
check(again.added.length === 0 && again.buffer === patched.buffer, 'patch is idempotent');
let missingThrown = false;
try {
  patchReferenceVrmTeethBinds(writeGlb(fixtureJson(TEETH.slice(0, 3)), fixtureBin));
} catch (error) {
  missingThrown = /morph target missing/.test(String(error));
}
check(missingThrown, 'missing teeth target fails loudly');

const vrmPath = join(root, 'public/assets/avatars/reference/valid-white-m1-default.vrm');
if (existsSync(vrmPath)) {
  check(
    hasReferenceVrmTeethBinds(readGlbChunks(readFileSync(vrmPath)).json),
    'local Reference VRM lacks teeth binds — run: node scripts/fetch-liveact-reference-vrm.mjs --skip-if-present',
  );
} else {
  console.log('liveact-fidelity-check: Reference VRM binary not present — asset check skipped');
}

// --- 4. Wiring ------------------------------------------------------------------------------
const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const viewer = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const pip = read('src/app/character/liveact/LiveActCameraPreview.tsx');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const fetchScript = read('scripts/fetch-liveact-reference-vrm.mjs');
const attribution = read('public/assets/avatars/reference/ATTRIBUTION.md');
const gate = read('scripts/test-gate.mjs');
const faceSource = read('src/infrastructure/character/liveact/mediapipe-face-source.ts');
const vrmOutput = read('src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts');

check(
  /const oriented = LIVEACT_MIRROR_AVATAR \? mirrorLiveActSourceSample\(sample\) : sample/.test(engine),
  'engine orients the sample between RAW and MAPPED',
);
check(/raw: snapshotLiveActDiagnosticsV2FromSample\(sample\)/.test(engine), 'Diagnostics RAW is the unmirrored sample');
check(/tickCalibration\(oriented\)/.test(engine), 'calibration runs in avatar orientation');
check(!/mirrorLiveActSourceSample|LIVEACT_MIRROR_AVATAR/.test(faceSource), 'face source stays anatomical');
check(
  /applyLiveActVrmEyeLookAt\(this\.deps\.vrm/.test(vrmOutput) && !/eyeLookTarget/.test(vrmOutput),
  'VRM output: head-relative LookAt, no world target',
);
check(/transform: 'scaleX\(-1\)'/.test(pip), 'PiP preview is mirrored');

check(/stepLiveActCalibratedFrame\(\s*this\.pipelineStep/.test(engine), 'engine uses calibrated step');
check(!/smoothLiveActFrame\(this\.frame/.test(engine), 'engine no longer smooths the calibrated frame');
check(/pipelineStep = null/.test(engine), 'engine resets pipeline state');
check(/rangeCalibration = null/.test(engine), 'engine clears range calibration');
check(/LIVEACT_RANGE_CALIBRATION_STEPS/.test(engine), 'engine runs stepped max pass');
check(/advanceCalibration\(/.test(engine), 'engine exposes advanceCalibration');
check(/liveActNeutralCalibrationPrompt\(/.test(engine), 'neutral step prompt from step total');
check(/liveact-calibrate-advance-pip/.test(pip), 'Weiter control in PiP');
check(/setLiveActDriveActive\(output !== null\)/.test(viewer), 'viewer suspends idle on bind');
check(/setLiveActDriveActive\(false\)/.test(viewer), 'viewer resumes idle on unbind');
check(
  /setLiveActDriveActive\(active: boolean\)[\s\S]{0,120}animationRuntime\.setSuspended\(active\)/.test(studio),
  'studio runtime forwards drive state to animation runtime',
);
check(/liveact-calibration-prompt/.test(pip), 'PiP shows calibration prompt');
check(/calibrationRunning=\{liveAct\.calibrationStatus === 'running'\}/.test(controls), 'prompt wiring');
check(/patchReferenceVrmTeethBinds/.test(fetchScript), 'fetch applies teeth patch');
check(!/const URL\b/.test(fetchScript), 'fetch script does not shadow global URL');
check(/Changes \(SagaDrive\)/.test(attribution) && /h_TeethDown/.test(attribution), 'CC BY change note');
check(/checkLiveActFidelity/.test(gate), 'test-gate wiring');

console.log('liveact-fidelity-check OK');
