#!/usr/bin/env node
/**
 * liveact-diagnostics-v2-check — Diagnostics V2 RAW→APPLIED trace (#397).
 * Location: scripts/liveact-diagnostics-v2-check.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-diagnostics-v2-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/liveact/liveact-diagnostics-v2.ts');
const domainIndex = read('src/domains/character/liveact/index.ts');
const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const outputPort = read('src/infrastructure/character/liveact/liveact-avatar-output.ts');
const gltfOut = read('src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts');
const vrmOut = read('src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const gate = read('scripts/test-gate.mjs');

check(/SagaDriveLiveActDiagnosticsV2/.test(domain), 'contract version');
check(/LIVEACT_DIAGNOSTICS_V2_STAGES/.test(domain), 'stages const');
check(/snapshotLiveActDiagnosticsV2FromSample/.test(domain), 'raw snapshot helper');
check(/snapshotLiveActDiagnosticsV2FromFrame/.test(domain), 'frame snapshot helper');
check(/assertLiveActDiagnosticsV2LocalOnly/.test(domain), 'privacy assert');
check(!/from ['"]react['"]/.test(domain), 'domain no React');
check(!/mediapipe|HTMLVideoElement|three/.test(domain), 'domain pure');
check(/landmarks\?: unknown/.test(domain), 'localOnly guards landmarks field');

check(/liveact-diagnostics-v2/.test(domainIndex), 'barrel export');
check(/createLiveActDiagnosticsV2Snapshot/.test(domainIndex), 'snapshot export');

check(/subscribeDiagnosticsV2/.test(engine), 'engine V2 subscription');
check(/getAppliedDiagnostics/.test(engine), 'engine reads applied from output');
check(/snapshotLiveActDiagnosticsV2FromSample/.test(engine), 'engine RAW stage');
check(/createLiveActDiagnosticsV2Snapshot/.test(engine), 'engine builds snapshot');
check(/assertLiveActDiagnosticsV2LocalOnly/.test(engine), 'engine privacy assert');
check(/diagnosticsV2 = null/.test(engine), 'stop/dispose clears V2');

check(/getAppliedDiagnostics\(\)/.test(outputPort), 'output port applied API');
check(/getAppliedDiagnostics/.test(gltfOut), 'gltf applied');
check(/getAppliedDiagnostics/.test(vrmOut), 'vrm applied');
check(/createUnavailableLiveActAppliedValues/.test(gltfOut), 'gltf dispose → unavailable');
check(/mode: 'neutral'/.test(gltfOut), 'gltf neutral applied');
check(/mode: 'neutral'/.test(vrmOut), 'vrm neutral applied');

check(/diagnosticsV2Ref/.test(hook), 'hook V2 ref');
check(/subscribeDiagnosticsV2/.test(hook), 'hook binds V2');
check(!/setDiagnosticsV2/.test(hook), 'no React setState for V2');

check(/checkLiveActDiagnosticsV2/.test(gate), 'test-gate wiring');

const outfile = join(root, '.qa/runs/liveact-diagnostics-v2-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-diagnostics-v2.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  write: true,
  logLevel: 'silent',
});

const mod = await import(outfile + `?t=${Date.now()}`);
check(mod.LIVEACT_DIAGNOSTICS_V2_VERSION === 'SagaDriveLiveActDiagnosticsV2', 'version runtime');
check(Array.isArray(mod.LIVEACT_DIAGNOSTICS_V2_STAGES), 'stages array');
check(mod.LIVEACT_DIAGNOSTICS_V2_STAGES.length === 6, 'six stages');
check(
  JSON.stringify(mod.LIVEACT_DIAGNOSTICS_V2_STAGES) ===
    JSON.stringify(['raw', 'mapped', 'smoothed', 'calibrated', 'retargeted', 'applied']),
  'stage order',
);

const sample = {
  presence: 1,
  headYaw: 0.1,
  headPitch: -0.2,
  headRoll: 0.05,
  eyeLeftX: 0.1,
  eyeLeftY: -0.1,
  eyeRightX: -0.1,
  eyeRightY: 0.05,
  face: { jawOpen: 0.4, eyeBlinkLeft: 0.2 },
  faceIndex: 0,
  faceCount: 1,
};
const raw = mod.snapshotLiveActDiagnosticsV2FromSample(sample);
check(raw['head.yaw'] === 0.1, 'raw head yaw');
check(raw['face.jawOpen'] === 0.4, 'raw jawOpen');
check(raw['face.eyeBlinkRight'] === null, 'missing face channel null');

const unavailable = mod.createUnavailableLiveActAppliedValues();
check(unavailable['face.jawOpen']?.status === 'unavailable', 'unavailable jaw');
check(unavailable['face.jawOpen']?.value === null, 'unavailable never fake 0');

const supported = new Set(['head.yaw', 'face.jawOpen', 'face._neutral']);
const neutral = mod.createNeutralLiveActAppliedValues(supported);
check(neutral['face.jawOpen']?.status === 'neutral' && neutral['face.jawOpen']?.value === 0, 'neutral jaw');
check(neutral['face._neutral']?.value === 1, 'neutral _neutral=1');
check(neutral['eyeLeft.x']?.status === 'unavailable', 'unsupported stays unavailable');

const applied = mod.buildLiveActAppliedValuesFromFace({
  headSupported: true,
  eyeLeftSupported: false,
  eyeRightSupported: false,
  faceSupported: new Set(['jawOpen']),
  face: { jawOpen: 0.55 },
  head: { yaw: 0.2, pitch: 0, roll: 0 },
  eyeLeft: null,
  eyeRight: null,
  mode: 'driven',
});
check(applied['head.yaw']?.status === 'supported' && applied['head.yaw']?.value === 0.2, 'driven head');
check(applied['face.jawOpen']?.value === 0.55, 'driven jaw');
check(applied['eyeLeft.x']?.status === 'unavailable' && applied['eyeLeft.x']?.value === null, 'eye unavailable');

const snap = mod.createLiveActDiagnosticsV2Snapshot({
  timestampMs: 12,
  sequence: 7,
  trackingLost: false,
  raw,
  mapped: raw,
  smoothed: raw,
  calibrated: raw,
  retargeted: raw,
  applied,
});
check(snap.sequence === 7 && snap.timestampMs === 12, 'correlation fields');
check(snap.stages.applied['face.jawOpen']?.value === 0.55, 'applied in snapshot');
mod.assertLiveActDiagnosticsV2LocalOnly(snap);

let threw = false;
try {
  mod.assertLiveActDiagnosticsV2LocalOnly({ ...snap, landmarks: [] });
} catch {
  threw = true;
}
check(threw, 'localOnly rejects landmarks');

console.log('liveact-diagnostics-v2-check OK');
