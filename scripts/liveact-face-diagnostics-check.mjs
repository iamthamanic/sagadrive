#!/usr/bin/env node
/**
 * liveact-face-diagnostics-check — LiveAct 3/7 overlay + calibration (#331).
 * Location: scripts/liveact-face-diagnostics-check.mjs
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
    console.error(`liveact-face-diagnostics-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const diagnosticsDomain = read('src/domains/character/liveact/liveact-face-diagnostics.ts');
const calibration = read('src/domains/character/liveact/liveact-calibration.ts');
const domainIndex = read('src/domains/character/liveact/index.ts');
const contract = read('src/domains/character/liveact/liveact-contract.ts');
const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const source = read('src/infrastructure/character/liveact/mediapipe-face-source.ts');
const diagInfra = read('src/infrastructure/character/liveact/liveact-face-diagnostics.ts');
const overlay = read('src/app/character/liveact/LiveActFaceOverlay.tsx');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const pip = read('src/app/character/liveact/LiveActCameraPreview.tsx');
const settings = read('src/app/character/avatar/AvatarPreviewSettings.tsx');
const gate = read('scripts/test-gate.mjs');

check(/LiveActFaceDiagnosticsFrameV1/.test(diagnosticsDomain), 'diagnostics frame type');
check(/assertLiveActFaceDiagnosticsLocalOnly/.test(diagnosticsDomain), 'diagnostics privacy assert');
check(!/from ['"]react['"]/.test(diagnosticsDomain), 'diagnostics domain no React');
check(!/mediapipe|HTMLVideoElement|three/.test(diagnosticsDomain), 'diagnostics domain pure');

check(/LIVEACT_CALIBRATION_FRAME_TARGET = 30/.test(calibration), '30 frame target');
check(/LIVEACT_CALIBRATION_TIMEOUT_MS = 2000/.test(calibration), '2s timeout');
check(/applyLiveActNeutralBaseline/.test(calibration), 'neutralization helper');
check(!/from ['"]react['"]/.test(calibration), 'calibration domain no React');

check(/liveact-face-diagnostics/.test(domainIndex), 'barrel exports diagnostics');
check(/liveact-calibration/.test(domainIndex), 'barrel exports calibration');

check(/subscribeDiagnostics/.test(engine), 'engine diagnostics subscription');
check(/calibrate\(\)/.test(engine), 'engine calibrate API');
check(/applyLiveActNeutralBaseline/.test(engine), 'engine applies baseline');
check(/neutralBaseline = null/.test(engine), 'dispose clears baseline');

check(/LiveActFaceDetectResult/.test(source), 'detect returns samples + diagnostics');
check(/faceLandmarks/.test(source), 'mediapipe landmarks path');
check(/mapMediaPipeLandmarksToLiveActDiagnostics/.test(source), 'diagnostics mapper used');

check(/LiveActFaceOverlay/.test(pip), 'pip hosts overlay');
check(/requestAnimationFrame/.test(overlay), 'overlay rAF loop');
check(!/useState\(/.test(overlay), 'overlay no useState hot path');

check(/subscribeDiagnostics/.test(hook), 'hook binds diagnostics ref');
check(/calibrateNeutral/.test(hook), 'hook exposes calibrate');
check(/canCalibrate/.test(hook), 'hook calibrate guard');

check(/Kamera-PiP \+ Character-Mesh/.test(settings), 'face overlay enabled copy DE');
check(/liveact-calibrate/.test(settings), 'calibrate control');
check(!/Bald \(3\/7\)/.test(settings), 'face overlay no longer stub');

check(/landmarks/.test(contract), 'LiveActFrame comment still no landmarks on frame');
check(/assertLiveActFrameLocalOnly/.test(contract), 'frame privacy assert remains');

check(/checkLiveActFaceDiagnostics/.test(gate), 'test-gate wiring');

const outfile = join(root, '.qa/runs/liveact-face-diagnostics-bundle.mjs');
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

const acc = ft.createLiveActCalibrationAccumulator();
for (let i = 0; i < 29; i += 1) {
  const ok = ft.pushLiveActCalibrationSample(
    acc,
    {
      presence: 0.9,
      headYaw: 0.1,
      headPitch: 0.05,
      headRoll: 0.02,
      eyeLeftX: 0.1,
      eyeLeftY: -0.05,
      eyeRightX: 0.08,
      eyeRightY: -0.04,
      face: { mouthSmileLeft: 0.2, jawOpen: 0.1 },
      faceIndex: 0,
      faceCount: 1,
    },
    { headPoseSupported: true },
  );
  check(ok, 'calibration sample push');
}
check(ft.finalizeLiveActCalibration(acc) === null, '29 frames → no baseline');

ft.pushLiveActCalibrationSample(
  acc,
  {
    presence: 0.9,
    headYaw: 0.1,
    headPitch: 0.05,
    headRoll: 0.02,
    eyeLeftX: 0.1,
    eyeLeftY: -0.05,
    eyeRightX: 0.08,
    eyeRightY: -0.04,
    face: { mouthSmileLeft: 0.2, jawOpen: 0.1 },
    faceIndex: 0,
    faceCount: 1,
  },
  { headPoseSupported: true },
);
const baseline = ft.finalizeLiveActCalibration(acc);
check(Boolean(baseline), '30 frames → baseline');

const raw = ft.mapLiveActSourceSample(
  {
    presence: 0.95,
    headYaw: 0.3,
    headPitch: 0.1,
    headRoll: 0.05,
    eyeLeftX: 0.2,
    eyeLeftY: 0.1,
    eyeRightX: 0.18,
    eyeRightY: 0.08,
    face: { mouthSmileLeft: 0.5, jawOpen: 0.3 },
    faceIndex: 0,
    faceCount: 1,
  },
  { timestampMs: 1, sequence: 1 },
);
ft.assertLiveActFrameLocalOnly(raw);
const neutralized = ft.applyLiveActNeutralBaseline(raw, baseline);
check(neutralized.head.yaw < raw.head.yaw, 'head neutralized');
check(neutralized.face.mouthSmileLeft < raw.face.mouthSmileLeft, 'face neutralized');

const diag = ft.createEmptyLiveActFaceDiagnosticsFrame({ timestampMs: 0, sequence: 0 });
diag.landmarks = [{ x: 0.5, y: 0.5 }];
let threw = false;
try {
  ft.assertLiveActFaceDiagnosticsLocalOnly(diag);
} catch {
  threw = false;
}
check(!('landmarks' in (raw)), 'frame type has no landmarks field at runtime mapping');
ft.assertLiveActFaceDiagnosticsLocalOnly(
  ft.createEmptyLiveActFaceDiagnosticsFrame({ timestampMs: 0, sequence: 0 }),
);

check(/mapMediaPipeLandmarksToLiveActDiagnostics/.test(diagInfra), 'infra mapper present');

console.log('liveact-face-diagnostics-check OK');
