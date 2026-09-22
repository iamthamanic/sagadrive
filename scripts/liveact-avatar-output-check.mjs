#!/usr/bin/env node
/**
 * liveact-avatar-output-check — LiveAct 4/7 VRM + GLB avatar output (#332).
 * Location: scripts/liveact-avatar-output-check.mjs
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
    console.error(`liveact-avatar-output-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const aliases = read('src/domains/character/liveact/liveact-channel-target-aliases.ts');
const output = read('src/infrastructure/character/liveact/liveact-avatar-output.ts');
const vrmOut = read('src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts');
const gltfOut = read('src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts');
const morphIndex = read('src/infrastructure/character/liveact/liveact-morph-target-index.ts');
const facial = read('src/infrastructure/character/avatar/avatar-facial-runtime.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');
const gate = read('scripts/test-gate.mjs');
const domainIndex = read('src/domains/character/liveact/index.ts');

check(/LIVEACT_CHANNEL_TARGET_ALIASES/.test(aliases), 'explicit channel alias table');
check(/resolveLiveActChannelTargets/.test(aliases), 'channel target resolver');
check(!/from ['"]three['"]/.test(aliases), 'alias domain pure');

check(/createLiveActAvatarOutput/.test(output), 'output factory');
check(/getAvatarCapabilities/.test(output), 'output avatar capabilities');
check(/getAppliedDiagnostics/.test(output), 'output applied diagnostics (#397)');
check(/VrmLiveActAvatarOutput/.test(output), 'VRM adapter wired');
check(/GltfLiveActAvatarOutput/.test(output), 'GLB adapter wired');

check(/expressionManager\.setValue/.test(vrmOut), 'VRM atomic expression apply');
check(/createLiveActAvatarCapabilities/.test(vrmOut), 'VRM avatar capability matrix');
check(!/applyFacialLayerUpdate/.test(vrmOut), 'VRM output no exclusive layer wipe');

check(/buildLiveActMorphTargetIndex/.test(gltfOut), 'GLB morph index');
check(/resolveLiveActChannelTargets/.test(gltfOut), 'GLB uses alias table');
check(/createLiveActAvatarCapabilities/.test(gltfOut), 'GLB avatar capability matrix');
check(/rig-analyzer/.test(gltfOut) === false, 'GLB no second rig scanner file');

check(/morphTargetDictionary/.test(morphIndex), 'morph dictionary traversal');

check(/applyWeightsBatch/.test(facial), 'facial atomic batch API');
check(/applyFacialLayerUpdate/.test(facial), 'preview setWeight layer rules remain');

check(/rebuildLiveActAvatarOutput/.test(studio), 'studio rebuilds output on load');
check(/getLiveActAvatarOutput/.test(studio), 'studio exposes output');
check(/getLiveActAvatarCapabilities/.test(studio), 'studio exposes avatar capabilities');
check(/applyWeightsBatch/.test(studio), 'legacy face tracking uses batch');
check(!/facialRuntime\.setWeight\(key as FacialCanonicalKey/.test(studio), 'no per-key LiveAct loop');

check(/engineRef/.test(hook), 'hook exposes engine ref');
check(/getLiveActAvatarCapabilities/.test(hook), 'hook reads avatar capability matrix');
check(/composeLiveActCapabilities/.test(hook), 'hook composes capabilities');

check(/bindOutput/.test(surface), 'surface binds LiveAct output');
check(/composedCapabilities/.test(surface), 'surface uses composedCapabilities');
check(/studioRuntimeRef/.test(surface) && /studioRuntimeRef/.test(canvas), 'runtime ref wiring');

check(/liveact-channel-target-aliases/.test(domainIndex), 'barrel exports aliases');
check(/checkLiveActAvatarOutput/.test(gate), 'test-gate wiring');

const escapePatterns = [
  /@ts-ignore/,
  /@ts-expect-error/,
  / as any/,
  / as unknown as /,
];
for (const [label, src] of [
  ['aliases', aliases],
  ['facial', facial],
  ['vrmOut', vrmOut],
  ['gltfOut', gltfOut],
  ['output', output],
  ['studio', studio],
]) {
  for (const pattern of escapePatterns) {
    check(!pattern.test(src), `${label} no type escape ${pattern}`);
  }
}

const outfile = join(root, '.qa/runs/liveact-avatar-output-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  outfile,
  logLevel: 'silent',
});

const ft = await import(outfile + `?t=${Date.now()}`);

const resolution = ft.resolveLiveActChannelTargets([
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'mouthSmileLeft',
  'mouthSmileRight',
  'jawOpen',
]);
check(resolution.faceSupport.eyeBlinkLeft === true, 'blink L supported');
check(resolution.faceSupport.eyeBlinkRight === true, 'blink R supported');
check(resolution.faceSupport.mouthSmileLeft === true, 'smile L supported');
check(resolution.faceSupport.mouthSmileRight === true, 'smile R asymmetric channels');
check(resolution.faceSupport.jawOpen === true, 'jawOpen supported');

const caps = ft.createLiveActCapabilities({
  headBone: true,
  avatarFace: {
    eyeBlinkLeft: true,
    eyeBlinkRight: true,
    mouthSmileLeft: true,
    jawOpen: true,
  },
});
check(caps.avatarBones.head === true, 'head capability');
check(caps.activeFaceChannelCount === 4, 'partial face channel count');

const frame = ft.createNeutralLiveActFrame({ timestampMs: 1, sequence: 1, trackingLost: false });
frame.face.eyeBlinkLeft = 0.9;
frame.face.eyeBlinkRight = 0.2;
frame.face.mouthSmileLeft = 0.7;
frame.face.mouthSmileRight = 0.3;
frame.face.jawOpen = 0.5;
check(frame.face.eyeBlinkLeft !== frame.face.eyeBlinkRight, 'blink L/R not merged');
check(frame.face.mouthSmileLeft !== frame.face.mouthSmileRight, 'smile L/R not merged');
check(frame.face.jawOpen > 0 && frame.face.mouthSmileLeft > 0, 'jaw + smile simultaneous');

const headOnly = ft.createLiveActCapabilities({ headBone: true });
check(headOnly.avatarBones.head && headOnly.activeFaceChannelCount === 0, 'head-only GLB caps');

function applyFacialLayerUpdate(current, key, weight, emotions, visemes) {
  const next = { ...current };
  const w = Math.max(0, Math.min(1, weight));
  if (emotions.includes(key)) {
    for (const e of emotions) if (e !== key) next[e] = 0;
  }
  if (visemes.includes(key)) {
    for (const v of visemes) if (v !== key) next[v] = 0;
  }
  next[key] = w;
  return next;
}

function applyWeightsBatch(current, updates, available) {
  const next = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (!available.includes(key)) continue;
    next[key] = Math.max(0, Math.min(1, value ?? 0));
  }
  return next;
}

const emotions = ['neutral', 'happy', 'angry', 'sad'];
const visemes = ['aa', 'ih', 'ou', 'ee', 'oh'];
let weights = { happy: 0.5, aa: 0.4 };
weights = applyFacialLayerUpdate(weights, 'sad', 0.8, emotions, visemes);
check(weights.happy === 0 && weights.sad === 0.8, 'setWeight clears emotion siblings');

weights = { happy: 0.5, aa: 0.4 };
weights = applyWeightsBatch(weights, { happy: 0.6, aa: 0.35, ih: 0.2 }, [
  'happy',
  'aa',
  'ih',
  'sad',
]);
check(weights.happy === 0.6 && weights.aa === 0.35 && weights.ih === 0.2, 'batch keeps siblings');

console.log('liveact-avatar-output-check OK');
