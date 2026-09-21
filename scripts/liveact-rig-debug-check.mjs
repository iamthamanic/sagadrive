#!/usr/bin/env node
/**
 * liveact-rig-debug-check — structural acceptance for LiveAct 5/7 (#333).
 * Location: scripts/liveact-rig-debug-check.mjs
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
    console.error(`liveact-rig-debug-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const rigDebug = read('src/infrastructure/character/liveact/liveact-rig-debug.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const inspectorDomain = read('src/domains/character/liveact/liveact-capability-inspector.ts');
const inspectorUi = read('src/app/character/liveact/LiveActCapabilityInspector.tsx');
const settings = read('src/app/character/avatar/AvatarPreviewSettings.tsx');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const gate = read('scripts/test-gate.mjs');
const domainIndex = read('src/domains/character/liveact/index.ts');
const runtimeRegression = read('scripts/avatar-runtime-regression-check.mjs');

check(/SkeletonHelper/.test(rigDebug), 'SkeletonHelper debug layer');
check(/findPrimarySkinnedMesh/.test(rigDebug), 'skinned mesh from loaded model');
check(!/analyzeAvatarRig/.test(rigDebug), 'no second rig scanner');

check(/createLiveActRigDebugController/.test(studio), 'studio binds rig debug');
check(/liveActRigDebug\.bindModelRoot/.test(studio), 'bind on model load/swap');
check(/setLiveActRigDebugEnabled/.test(studio), 'toggle API');
check(/hasLiveActSkeleton/.test(studio), 'skeleton availability API');
check(/runWithoutHelper/.test(studio) && /capturePortraitDataUrl/.test(studio), 'portrait excludes helper');

check(/buildLiveActCapabilityInspectorRows/.test(inspectorDomain), 'inspector row builder');
check(
  /input: boolean/.test(inspectorDomain) &&
    /mapping: boolean/.test(inspectorDomain) &&
    /avatar: boolean/.test(inspectorDomain),
  'three-axis rows',
);
check(/liveact-capability-inspector/.test(domainIndex), 'domain barrel export');

check(/liveact-capability-inspector/.test(inspectorUi), 'inspector UI test id');
check(/data-liveact-inspector-avatar/.test(inspectorUi), 'avatar column markers');

check(/LiveActCapabilityInspector/.test(settings), 'gear hosts inspector');
check(/liveact-bones-toggle/.test(settings), 'bones toggle');
check(!/Bald \(5\/7\)/.test(settings), 'bones no longer stubbed');
check(/bonesAvailable/.test(settings), 'bones availability hint');

check(/bonesAvailable/.test(hook), 'hook exposes bones availability');
check(/getBonesAvailable/.test(hook), 'hook reads skeleton from runtime');
check(/modelRevision/.test(hook), 'hook refreshes on model swap');

check(/setLiveActRigDebugEnabled/.test(surface), 'surface wires bone toggle');
check(/capabilities=\{liveActCapabilities\}/.test(surface), 'capabilities to chrome');

check(/capabilities/.test(controls) && /inputLive/.test(controls), 'controls pass inspector props');

check(/checkLiveActRigDebug/.test(gate), 'test-gate wiring');

const escapePatterns = [/@ts-ignore/, /@ts-expect-error/, / as any/, / as unknown as /];
for (const [label, src] of [
  ['rigDebug', rigDebug],
  ['inspectorDomain', inspectorDomain],
  ['inspectorUi', inspectorUi],
  ['hook', hook],
]) {
  for (const pattern of escapePatterns) {
    check(!pattern.test(src), `${label} no type escape ${pattern}`);
  }
}

const outfile = join(root, '.qa/runs/liveact-rig-debug-bundle.mjs');
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

const caps = ft.createLiveActCapabilities({
  face: true,
  headPose: true,
  eyeGaze: true,
  headBone: true,
  leftEyeBone: true,
  rightEyeBone: false,
  avatarFace: { jawOpen: true },
});

const rows = ft.buildLiveActCapabilityInspectorRows(caps);
check(rows.some((r) => r.id === 'head' && r.avatar), 'head row avatar');
check(rows.some((r) => r.id === 'rightEye' && !r.avatar), 'missing eye target shown');
check(
  rows.some((r) => r.id === 'face:mouthSmileLeft' && r.mapping && !r.avatar),
  'missing smile morph not global error',
);

check(/capturePortraitDataUrl/.test(runtimeRegression), 'runtime regression still covers portrait');

console.log('liveact-rig-debug-check OK');
