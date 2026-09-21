#!/usr/bin/env node
/**
 * liveact-hardening-check — LiveAct 7/7 performance, privacy, races (#335).
 * Location: scripts/liveact-hardening-check.mjs
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
    console.error(`liveact-hardening-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const policy = read('src/domains/character/liveact/liveact-runtime-policy.ts');
const domainIndex = read('src/domains/character/liveact/index.ts');
const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const overlay = read('src/app/character/liveact/LiveActFaceOverlay.tsx');
const gate = read('scripts/test-gate.mjs');
const e2e = read('e2e/liveact-viewport-smoke.spec.ts');

check(/LIVEACT_UI_STATUS_MAX_HZ = 5/.test(policy), 'UI status capped at 5 Hz');
check(/LIVEACT_INFERENCE_MAX_IN_FLIGHT = 1/.test(policy), 'single in-flight inference');
check(/shouldDropLiveActInferenceTick/.test(policy), 'drop helper');
check(/shouldThrottleLiveActUiStatus/.test(policy), 'UI throttle helper');
check(/liveact-runtime-policy/.test(domainIndex), 'barrel exports policy');

check(/startGeneration/.test(engine), 'start/stop generation token');
check(/shouldDropLiveActInferenceTick/.test(engine), 'engine uses inference backpressure');
check(/shouldThrottleLiveActUiStatus/.test(engine), 'engine throttles UI status');
check(/switchCameraDevice/.test(engine), 'camera switch API');
check(/devicechange/.test(engine), 'device removal listener');
check(/droppedInferenceFrames/.test(engine), 'dropped frame metric');
check(/track\.stop/.test(engine), 'track cleanup on stop');
check(/deviceId/.test(engine), 'deviceId constraint path');
check(!/localStorage|sessionStorage|indexedDB/.test(engine), 'engine no persistence');
check(!/console\.(log|info|debug)\([^)]*landmark/i.test(engine), 'no landmark console logs');

check(/switchCameraDevice/.test(hook), 'hook switches camera');
check(/skipDeviceSwitchAfterStartRef/.test(hook), 'hook avoids race on start');
check(!/setState\([^)]*diagnosticsRef/.test(hook), 'diagnostics stay off React state');
check(/subscribeDiagnostics/.test(hook), 'diagnostics via ref only');

check(/runWithoutHelper/.test(studio), 'portrait excludes rig debug bones');
check(/capturePortraitDataUrl/.test(studio), 'portrait capture path');

check(/requestAnimationFrame/.test(overlay), 'overlay rAF not React per frame');
check(!/useState\(\s*.*diagnostics/.test(overlay), 'overlay no diagnostics useState');

check(/liveact-viewport-smoke/.test(e2e), 'e2e smoke spec present');
check(/use-fake-device-for-media-stream/.test(e2e), 'fake camera launch args');

const liveactApp = [
  'src/app/character/liveact/useLiveActViewport.ts',
  'src/app/character/liveact/LiveActFaceOverlay.tsx',
  'src/app/character/liveact/LiveActCameraPreview.tsx',
  'src/infrastructure/character/liveact/liveact-engine.ts',
  'src/infrastructure/character/liveact/mediapipe-face-source.ts',
  'src/infrastructure/character/liveact/liveact-face-diagnostics.ts',
].map(read).join('\n');
check(!/localStorage|sessionStorage|indexedDB/.test(liveactApp), 'LiveAct stack no storage persist');
check(!/analytics|posthog|segment|gtag/.test(liveactApp), 'no analytics landmark upload heur');

check(/checkLiveActHardening/.test(gate), 'test-gate wiring');

const outfile = join(root, '.qa/runs/liveact-hardening-bundle.mjs');
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

check(ft.LIVEACT_UI_STATUS_MAX_HZ === 5, 'runtime UI Hz const');
check(ft.LIVEACT_INFERENCE_MAX_IN_FLIGHT === 1, 'runtime in-flight const');
check(
  ft.shouldDropLiveActInferenceTick(1) === true,
  'drop when one inference in flight',
);
check(ft.shouldDropLiveActInferenceTick(0) === false, 'allow when idle');
check(
  ft.shouldThrottleLiveActUiStatus(1000, 1100, 5) === true,
  'throttle inside 200ms window',
);
check(
  ft.shouldThrottleLiveActUiStatus(1000, 1250, 5) === false,
  'emit after 200ms window',
);

console.log('liveact-hardening-check OK');
