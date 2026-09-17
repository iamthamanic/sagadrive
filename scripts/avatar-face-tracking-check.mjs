#!/usr/bin/env node
/**
 * avatar-face-tracking-check — deterministic tests for #12 MediaPipe face tracking.
 * Location: scripts/avatar-face-tracking-check.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
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
    console.error(`avatar-face-tracking-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/face-tracking-contract.ts');
const index = read('src/domains/character/avatar/index.ts');
const runtime = read('src/infrastructure/character/avatar/avatar-face-tracking-runtime.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const controls = read('src/app/character/avatar/AvatarFaceTrackingControls.tsx');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');

check(/FACE_TRACKING_CONTRACT_VERSION/.test(domain), 'contract version');
check(/mapFaceTrackingSample/.test(domain), 'sample mapper');
check(/smoothFaceTrackingDrive/.test(domain), 'smoothing');
check(/selectPrimaryFaceIndex/.test(domain), 'primary face rule');
check(/assertFaceTrackingDriveLocalOnly/.test(domain), 'privacy assert');
check(/resolveFaceTrackingFpsCap/.test(domain), 'fps cap');
check(!/from ['"]react['"]/.test(domain), 'domain no React');
check(!/from ['"]three['"]/.test(domain), 'domain no Three');
check(!/mediapipe|getUserMedia|HTMLVideoElement/.test(domain), 'domain no MediaPipe/DOM');

check(/export \{[\s\S]*mapFaceTrackingSample/.test(index), 'barrel exports mapper');
check(/FACE_TRACKING_CONTRACT_VERSION/.test(index), 'barrel exports version');

check(/AvatarFaceTrackingRuntime/.test(runtime), 'runtime class');
check(/getUserMedia/.test(runtime), 'camera permission path');
check(/explicit user action|Explicit user action/.test(runtime), 'explicit start comment');
check(/visibilitychange/.test(runtime), 'tab visibility pause');
check(/track\.stop/.test(runtime), 'track cleanup');
check(/createMediaPipeFaceTrackingDetector/.test(runtime), 'mediapipe factory');
check(!/localStorage|indexedDB|sessionStorage/.test(runtime), 'no landmark persistence');
check(!/fetch\([^)]*landmark|analytics|postMessage/.test(runtime), 'no landmark upload heur');

check(/applyFaceTrackingDrive/.test(studio), 'studio applies drive');
check(/resetFaceTrackingPose/.test(studio), 'studio resets pose');
check(/bindHeadBone/.test(studio), 'head bone bind');
check(!/appearance\.avatar\s*=/.test(studio), 'no appearance write from tracking');

check(/data-avatar-face-tracking-start/.test(controls), 'start control');
check(/data-avatar-face-tracking-stop/.test(controls), 'stop control');
check(/aria-label="Face Tracking starten"/.test(controls), 'start aria');
check(/Lokal im Browser/.test(controls), 'privacy copy');
check(/AvatarFaceTrackingControls/.test(canvas), 'canvas mounts controls');
check(/faceTracking\.dispose|faceTrackingRef\.current\?\.dispose|faceTracking\.dispose\(\)/.test(canvas), 'dispose on unmount');

// --- bundled domain behavior ---
const outDir = join(root, 'node_modules/.cache/avatar-face-tracking-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'face-tracking.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-tracking-contract.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const ft = await import(outfile);

check(ft.selectPrimaryFaceIndex([]) === -1, 'empty faces → -1');
check(ft.selectPrimaryFaceIndex([{ presence: 0.2 }, { presence: 0.9 }]) === 1, 'highest score');
check(ft.selectPrimaryFaceIndex([{ presence: 0.5 }, { presence: 0.5 }]) === 0, 'tie → first');

check(ft.resolveFaceTrackingFpsCap({ isMobile: true }) === 15, 'mobile fps');
check(ft.resolveFaceTrackingFpsCap({ isMobile: false }) === 30, 'desktop fps');

const active = ft.mapFaceTrackingSample({
  presence: 0.9,
  headYaw: 2,
  headPitch: -2,
  headRoll: 0.1,
  eyeLookX: 0.5,
  eyeLookY: -0.2,
  blinkLeft: 0.8,
  blinkRight: 0.2,
  smile: 0.7,
  browDown: 0.1,
  jawOpen: 0.4,
  faceIndex: 0,
  faceCount: 1,
});
check(active.trackingLost === false, 'active not lost');
check(active.head.yaw <= ft.DEFAULT_FACE_TRACKING_LIMITS.maxYaw, 'yaw clamped');
check(active.facialWeights.blink >= 0.79, 'blink from max eye');
check(active.facialWeights.happy >= 0.69, 'smile → happy');
ft.assertFaceTrackingDriveLocalOnly(active);

const lost = ft.mapFaceTrackingSample(ft.createEmptyFaceTrackingSample());
check(lost.trackingLost === true, 'empty → lost');

const smoothed = ft.smoothFaceTrackingDrive(active, lost, 0.5);
check(smoothed.trackingLost === true, 'smooth lost');
check(Math.abs(smoothed.head.yaw) < Math.abs(active.head.yaw), 'ease toward neutral');

console.log('avatar-face-tracking-check PASS');
