#!/usr/bin/env node
/**
 * liveact-fidelity-check — regression guards for LiveAct 1:1 fidelity fixes.
 * Location: scripts/liveact-fidelity-check.mjs
 *
 * 1. Calibration pipeline: baseline subtracted once (no smoothing feedback), range gains,
 *    tracking-lost easing without jumps (real domain functions, engine order).
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

  const firstRun = engine.calibrate();
  check(
    engine.getState().calibrationStatus === 'running' &&
      /Schritt 1\/2/.test(engine.getState().calibrationMessage),
    'engine starts with neutral step',
  );
  feed(sample(), 30);
  check(engine.getState().hasNeutralBaseline, 'engine stores neutral after 30 frames');
  check(
    engine.getState().calibrationStatus === 'running' &&
      /Schritt 2\/2 \(5 s\)/.test(engine.getState().calibrationMessage),
    'engine continues with max pass',
  );
  const rangePass = feed((i) => (i < 80 ? grimace : sample()), 160);
  check(
    ['(4 s)', '(3 s)', '(2 s)', '(1 s)'].every((s) => [...rangePass.messages].some((m) => m.includes(s))),
    'max pass counts down',
  );
  const firstResult = await firstRun;
  check(firstResult.ok && /Neutral \+ Maximal/.test(firstResult.messageDe), 'engine resolves after max pass');
  check(engine.getState().hasRangeCalibration, 'engine exposes range calibration');
  check(engine.getState().calibrationStatus === 'success', 'calibration success status');
  near(feed(grimace, 60).last.face.jawOpen, 1, 1e-3, 'engine output reaches 1.0 at calibrated max');
  near(feed(sample(), 60).last.face.eyeBlinkLeft, 0, 1e-6, 'engine neutral stays 0');

  const secondRun = engine.calibrate();
  feed(sample(), 30);
  check(!engine.getState().hasRangeCalibration, 'new neutral clears previous range gains');
  feed(sample(), 160);
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
check(runtime.getActiveAction() === 'idle', 'idle auto-plays after bind');

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
check(runtime.getActiveAction() === 'idle', 'resume after rebind plays default idle');
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

check(/stepLiveActCalibratedFrame\(\s*this\.pipelineStep/.test(engine), 'engine uses calibrated step');
check(!/smoothLiveActFrame\(this\.frame/.test(engine), 'engine no longer smooths the calibrated frame');
check(/pipelineStep = null/.test(engine), 'engine resets pipeline state');
check(/rangeCalibration = null/.test(engine), 'engine clears range calibration');
check(/LIVEACT_RANGE_CALIBRATION_DURATION_MS/.test(engine), 'engine runs max pass');
check(/Schritt 2\/2/.test(engine), 'max pass prompt');
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
