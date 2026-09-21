#!/usr/bin/env node
/**
 * liveact-capability-ownership-check — Input vs Avatar capability split (#381).
 * Location: scripts/liveact-capability-ownership-check.mjs
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
    console.error(`liveact-capability-ownership-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const caps = read('src/domains/character/liveact/liveact-capabilities.ts');
const barrel = read('src/domains/character/liveact/index.ts');
const output = read('src/infrastructure/character/liveact/liveact-avatar-output.ts');
const gltf = read('src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts');
const vrm = read('src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts');
const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const gate = read('scripts/test-gate.mjs');

check(/composeLiveActCapabilities/.test(caps), 'domain compose function');
check(/createLiveActAvatarCapabilities/.test(caps), 'avatar-only factory');
check(/createLiveActInputCapabilities/.test(caps), 'input-only factory');
check(/LiveActAvatarCapabilities/.test(caps), 'avatar capabilities type');
check(/composeLiveActCapabilities/.test(barrel), 'barrel exports compose');

check(/getAvatarCapabilities/.test(output), 'output port avatar-only');
check(!/getCapabilities\(\): LiveActCapabilitiesV1/.test(output), 'output port no full V1 getter');

check(/createLiveActAvatarCapabilities/.test(gltf), 'GLB uses avatar factory');
check(!/face:\s*true/.test(gltf), 'GLB adapter does not set input face');
check(!/headPose:/.test(gltf), 'GLB adapter does not set input headPose');
check(/getAvatarCapabilities/.test(gltf), 'GLB getAvatarCapabilities');

check(/createLiveActAvatarCapabilities/.test(vrm), 'VRM uses avatar factory');
check(!/face:\s*true/.test(vrm), 'VRM adapter does not set input face');
check(/getAvatarCapabilities/.test(vrm), 'VRM getAvatarCapabilities');

check(/getInputCapabilities/.test(engine), 'engine exposes input capabilities');
check(/createLiveActInputCapabilities/.test(engine), 'engine builds input caps');

check(/getLiveActAvatarCapabilities/.test(studio), 'studio exposes avatar caps');
check(!/getLiveActCapabilities/.test(studio), 'studio no longer composes full matrix');

check(/composedCapabilities/.test(surface), 'surface uses composedCapabilities');
check(/getLiveActAvatarCapabilities/.test(hook), 'hook takes avatar caps');
check(/composeLiveActCapabilities/.test(hook), 'hook composes for status');
check(/composedCapabilities/.test(hook), 'hook exposes composedCapabilities');

check(/liveact-capability-ownership-check/.test(gate), 'test-gate wiring');

const outfile = join(root, '.qa/runs/liveact-capability-ownership-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  outfile,
  logLevel: 'silent',
});

const { composeLiveActCapabilities, createLiveActAvatarCapabilities, createLiveActInputCapabilities } =
  await import(outfile);

const avatarOnly = createLiveActAvatarCapabilities({
  headBone: true,
  avatarFace: {},
});
const inputOnly = createLiveActInputCapabilities({
  face: true,
  headPose: true,
  eyeGaze: true,
});
const composed = composeLiveActCapabilities(inputOnly, avatarOnly);

check(composed.input.face === true, 'compose Input face true');
check(composed.input.headPose === true, 'compose Input headPose true');
check(composed.avatarBones.head === true, 'compose Avatar head true');
check(composed.activeFaceChannelCount === 0, 'compose no face morphs');
check(
  composed.input.face === true && composed.activeFaceChannelCount === 0,
  'Input ✓ / Avatar face — representable',
);

const swapped = composeLiveActCapabilities(
  inputOnly,
  createLiveActAvatarCapabilities({ headBone: false, leftEyeBone: true }),
);
check(swapped.avatarBones.head === false, 'model swap rebuilds avatar caps');
check(swapped.avatarBones.leftEye === true, 'model swap eye bone');

console.log('liveact-capability-ownership-check OK');
