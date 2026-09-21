#!/usr/bin/env node
/**
 * liveact-retarget-profile-check — LiveActRetargetProfileV1 domain + wiring (#385).
 * Location: scripts/liveact-retarget-profile-check.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-retarget-profile-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = readFileSync(join(root, 'src/domains/character/liveact/liveact-retarget-profile.ts'), 'utf8');
const barrel = readFileSync(join(root, 'src/domains/character/liveact/index.ts'), 'utf8');
const engine = readFileSync(join(root, 'src/infrastructure/character/liveact/liveact-engine.ts'), 'utf8');
const gate = readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8');
const gltf = readFileSync(join(root, 'src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts'), 'utf8');
const vrm = readFileSync(join(root, 'src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts'), 'utf8');

check(/LiveActRetargetProfileV1/.test(domain), 'profile type');
check(/deadZone/.test(domain) && /gain/.test(domain), 'gain+deadZone only');
check(/_neutral/.test(domain), 'neutral guard');
check(/createIdentityLiveActRetargetProfile/.test(barrel), 'barrel export');
check(/applyLiveActRetargetProfile/.test(engine), 'engine wiring');
check(/setRetargetProfile/.test(engine), 'engine setter');
check(/liveact-retarget-profile-check/.test(gate), 'test-gate wiring');
check(!/gain\s*[:=]\s*[0-9.]/.test(gltf) && !/deadZone/.test(gltf), 'no gain magic in gltf adapter');
check(!/deadZone/.test(vrm) && !/m5-face1/.test(vrm), 'no asset-specific retarget in vrm adapter');
check(!/QtMeshEditor|Faceit|Blender/.test(domain), 'domain provider-neutral');

const outDir = join(root, '.qa/runs');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'liveact-retarget-profile-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-retarget-profile.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  write: true,
});

const mod = await import(outfile + `?t=${Date.now()}`);
const identity = mod.createIdentityLiveActRetargetProfile();
check(identity.contractVersion === mod.LIVEACT_RETARGET_PROFILE_VERSION, 'version');
check(mod.retargetLiveActChannel('jawOpen', 0.5, identity) === 0.5, 'identity passthrough');
check(mod.retargetLiveActChannel('_neutral', 0.8, identity) === 0.8, 'neutral identity');

const boosted = mod.normalizeLiveActRetargetProfile({
  contractVersion: mod.LIVEACT_RETARGET_PROFILE_VERSION,
  channels: { jawOpen: { gain: 2, deadZone: 0.1 } },
});
check(mod.retargetLiveActChannel('jawOpen', 0.05, boosted) === 0, 'deadZone zeros');
check(mod.retargetLiveActChannel('jawOpen', 0.4, boosted) === 0.8, 'gain applies');
check(mod.retargetLiveActChannel('jawOpen', 0.9, boosted) === 1, 'clamp after gain');
check(mod.retargetLiveActChannel('_neutral', 0.2, boosted) === 0.2, 'neutral ignores override');

const bad = mod.normalizeLiveActRetargetProfile({
  contractVersion: mod.LIVEACT_RETARGET_PROFILE_VERSION,
  channels: { jawOpen: { gain: Number.NaN, deadZone: 0.1 } },
});
check(Object.keys(bad.channels).length === 0, 'non-finite dropped');

const frame = {
  contractVersion: 'SagaDriveLiveActFrameV1',
  faceContractVersion: 'SagaDriveLiveActFaceV1',
  timestampMs: 1,
  sequence: 1,
  confidence: 1,
  trackingLost: false,
  head: { yaw: 0.1, pitch: 0, roll: 0 },
  eyeLeft: { x: 0, y: 0 },
  eyeRight: { x: 0, y: 0 },
  face: Object.fromEntries(
    [
      '_neutral',
      'jawOpen',
      'eyeBlinkLeft',
      'eyeBlinkRight',
      'mouthSmileLeft',
      'mouthSmileRight',
      'mouthFrownLeft',
      'mouthFrownRight',
      'mouthPucker',
      'mouthShrugUpper',
      'mouthShrugLower',
    ].map((id) => [id, id === 'jawOpen' ? 0.4 : 0]),
  ),
};
// fill remaining channels with 0 for type completeness in apply
for (const id of [
  'browDownLeft','browDownRight','browInnerUp','browOuterUpLeft','browOuterUpRight',
  'cheekPuff','cheekSquintLeft','cheekSquintRight','eyeLookDownLeft','eyeLookDownRight',
  'eyeLookInLeft','eyeLookInRight','eyeLookOutLeft','eyeLookOutRight','eyeLookUpLeft','eyeLookUpRight',
  'eyeSquintLeft','eyeSquintRight','eyeWideLeft','eyeWideRight','jawForward','jawLeft','jawRight',
  'mouthClose','mouthDimpleLeft','mouthDimpleRight','mouthFunnel','mouthLeft','mouthLowerDownLeft',
  'mouthLowerDownRight','mouthPressLeft','mouthPressRight','mouthRight','mouthRollLower','mouthRollUpper',
  'mouthStretchLeft','mouthStretchRight','mouthUpperUpLeft','mouthUpperUpRight','noseSneerLeft','noseSneerRight',
  'tongueOut',
]) {
  if (frame.face[id] == null) frame.face[id] = 0;
}

const out = mod.applyLiveActRetargetProfile(frame, boosted);
check(out.head.yaw === 0.1, 'head unchanged');
check(out.face.jawOpen === 0.8, 'frame face retargeted');
check(out.trackingLost === false, 'tracking flag unchanged');

const lost = mod.applyLiveActRetargetProfile({ ...frame, trackingLost: true }, boosted);
check(lost.face.jawOpen === 0.4, 'trackingLost skips retarget (output resets anyway)');

check(mod.DEFAULT_LIVEACT_RETARGET_PROFILE.channels && Object.keys(mod.DEFAULT_LIVEACT_RETARGET_PROFILE.channels).length === 0, 'prod identity');

console.log('liveact-retarget-profile-check OK');
