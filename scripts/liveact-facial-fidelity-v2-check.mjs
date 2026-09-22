#!/usr/bin/env node
/**
 * liveact-facial-fidelity-v2-check — gaze exclusivity + channel table + identity retarget (#403).
 * Location: scripts/liveact-facial-fidelity-v2-check.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
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
    console.error(`liveact-facial-fidelity-v2-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const gaze = read('src/domains/character/liveact/liveact-gaze-path.ts');
const domainIndex = read('src/domains/character/liveact/index.ts');
const gltfOut = read('src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts');
const vrmOut = read('src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts');
const registry = read('src/infrastructure/character/liveact/liveact-retarget-profile-registry.ts');
const infraIndex = read('src/infrastructure/character/liveact/index.ts');
const table = read('src/app/character/liveact/LiveActDiagnosticsChannelTable.tsx');
const settings = read('src/app/character/avatar/AvatarPreviewSettings.tsx');
const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const gate = read('scripts/test-gate.mjs');
const acceptance = join(root, '.qa/acceptance/liveact-facial-fidelity-v2.md');

check(/LIVEACT_EYE_LOOK_FACE_CHANNELS/.test(gaze), 'eyeLook channel list');
check(/resolveLiveActGazeDrivePath/.test(gaze), 'gaze path resolver');
check(/bones.*lookAt.*morphs|hasEyeBones/.test(gaze), 'preference bones→lookAt→morphs');
check(/liveact-gaze-path/.test(domainIndex), 'domain barrel exports gaze path');

check(/resolveLiveActGazeDrivePath/.test(gltfOut), 'GLB uses gaze path');
check(/liveActGazePathSkipsEyeLookMorphs/.test(gltfOut), 'GLB skips eyeLook when bones');
check(/resolveLiveActGazeDrivePath/.test(vrmOut), 'VRM uses gaze path');
check(/liveActGazePathSkipsEyeLookMorphs/.test(vrmOut), 'VRM skips eyeLook when LookAt');

check(/resolveLiveActRetargetProfile/.test(registry), 'retarget registry');
check(!/m5-face1|f5-face1|\.glb/.test(registry), 'registry no filename magic');
check(/createIdentityLiveActRetargetProfile/.test(registry), 'default identity profile');
check(/liveact-retarget-profile-registry/.test(infraIndex), 'infra barrel exports registry');
check(/resolveLiveActRetargetProfile/.test(surface), 'surface applies registry on bind');

check(/liveact-diagnostics-channel-table/.test(table), 'channel table test id');
check(/LIVEACT_DIAGNOSTICS_V2_SIGNAL_KEYS/.test(table), 'full signal key table');
check(/requestAnimationFrame/.test(table), 'rAF poll while open');
check(/LiveActDiagnosticsChannelTable/.test(settings), 'settings hosts channel table');
check(/diagnosticsV2Ref/.test(settings), 'settings receives diagnostics ref');

check(existsSync(acceptance), 'acceptance doc present');
check(/checkLiveActFacialFidelityV2/.test(gate), 'test-gate wiring');

for (const [label, src] of [
  ['gaze', gaze],
  ['registry', registry],
  ['gltfOut', gltfOut],
  ['vrmOut', vrmOut],
  ['table', table],
]) {
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, / as any/, / as unknown as /]) {
    check(!pattern.test(src), `${label} no type escape ${pattern}`);
  }
}

const outfile = join(root, '.qa/runs/liveact-facial-fidelity-v2-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-gaze-path.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
});

const { resolveLiveActGazeDrivePath, isLiveActEyeLookFaceChannel } = await import(outfile);

check(
  resolveLiveActGazeDrivePath({
    hasEyeBones: true,
    hasLookAt: true,
    hasEyeLookMorphs: true,
  }) === 'bones',
  'bones win over lookAt+morphs',
);
check(
  resolveLiveActGazeDrivePath({
    hasEyeBones: false,
    hasLookAt: true,
    hasEyeLookMorphs: true,
  }) === 'lookAt',
  'lookAt wins over morphs',
);
check(
  resolveLiveActGazeDrivePath({
    hasEyeBones: false,
    hasLookAt: false,
    hasEyeLookMorphs: true,
  }) === 'morphs',
  'morphs when no pose driver',
);
check(
  resolveLiveActGazeDrivePath({
    hasEyeBones: false,
    hasLookAt: false,
    hasEyeLookMorphs: false,
  }) === 'none',
  'none when empty',
);
check(isLiveActEyeLookFaceChannel('eyeLookOutLeft') === true, 'eyeLookOutLeft classified');
check(isLiveActEyeLookFaceChannel('eyeBlinkLeft') === false, 'blink not gaze morph');

console.log('liveact-facial-fidelity-v2-check OK');
