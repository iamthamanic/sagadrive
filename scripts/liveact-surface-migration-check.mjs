#!/usr/bin/env node
/**
 * liveact-surface-migration-check — LiveAct 6/7 shared runtime on all surfaces (#334).
 * Location: scripts/liveact-surface-migration-check.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));
function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}
function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-surface-migration-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');
const player = read('src/app/character/avatar/PlayerAvatarPanel.tsx');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const singleton = read('src/app/character/liveact/liveact-engine-singleton.ts');
const liveControls = read('src/app/character/liveact/LiveActSurfaceControls.tsx');
const gate = read('scripts/test-gate.mjs');
const claim = read('src/infrastructure/character/liveact/liveact-camera-claim.ts');
const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');

check(/acquireSharedLiveActEngine/.test(singleton), 'shared engine singleton');
check(/releaseSharedLiveActTracking/.test(singleton), 'shared tracking ref-count');
check(/acquireSharedLiveActEngine/.test(hook), 'hook uses shared engine');
check(!/new LiveActEngine\(\)/.test(hook), 'hook does not construct second engine');

check(/LiveActSurfaceControls/.test(surface), 'surface hosts live controls');
check(/liveSurface && faceTrackingOn/.test(surface), 'live controls gated by surface policy');
check(/enableFaceTracking=\{false\}/.test(surface), 'canvas legacy FT disabled');
check(/bindOutput/.test(surface), 'surface binds LiveAct output');
check(/liveActEnabled/.test(surface), 'editor + live share bind path');

check(!/AvatarFaceTrackingRuntime/.test(canvas), 'canvas no legacy runtime');
check(!/AvatarFaceTrackingControls/.test(canvas), 'canvas no legacy FT UI');

check(/useLiveActViewport|LiveActSurfaceControls|AvatarSurfaceViewer/.test(player), 'player uses LiveAct surface');
check(/claimLiveActCamera/.test(engine), 'engine uses camera claim');
check(/claimLiveActCamera/.test(claim), 'claim module present');

check(/data-liveact-surface-start/.test(liveControls), 'live start control');
check(/setTrackingEnabled/.test(liveControls), 'live controls drive hook');

check(/checkLiveActSurfaceMigration/.test(gate), 'test-gate wiring');

console.log('liveact-surface-migration-check OK');
