#!/usr/bin/env node
/**
 * liveact-character-face-overlay-check — mesh-bound character overlay (#400).
 * Location: scripts/liveact-character-face-overlay-check.mjs
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
    console.error(`liveact-character-face-overlay-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const debug = read('src/infrastructure/character/liveact/liveact-character-face-debug.ts');
const manifestUrl = read('src/infrastructure/character/liveact/face-anchors-manifest-url.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const metrics = read('src/domains/character/liveact/liveact-face-metrics.ts');
const overlay = read('src/app/character/liveact/LiveActCharacterFaceOverlay.tsx');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const settings = read('src/app/character/avatar/AvatarPreviewSettings.tsx');
const gate = read('scripts/test-gate.mjs');
const acceptance = read('.qa/acceptance/liveact-character-face-overlay.md');

check(/evaluateFaceAnchorsManifest/.test(debug), 'debug evaluates anchors');
check(/computeLiveActFaceMetrics/.test(debug), 'debug uses shared metrics');
check(!/billboard|headBone/i.test(debug), 'no billboard/head-bone heuristic');
check(/resolveFaceAnchorsManifestUrlFromModelUrl/.test(manifestUrl), 'manifest URL resolver');
check(/listFaceAnchorsManifestUrlCandidates/.test(manifestUrl), 'stem + fallback candidates');
check(/-face-anchors\.json/.test(manifestUrl), 'model-stem sidecar naming');
check(/getLiveActCharacterFaceDebugHandle/.test(studio), 'runtime debug handle');
check(/setLiveActCharacterFaceDebugEnabled/.test(studio), 'runtime debug toggle');
check(/runWithoutSampling/.test(studio), 'portrait suppresses sampling');
check(/buildLiveActFaceLandmarksFromAnchorScreenPoints/.test(metrics), 'anchor landmark bridge');

check(/LiveActCharacterFaceOverlay/.test(controls), 'controls compose character overlay');
check(/characterFaceMappingAvailable/.test(controls), 'controls mapping gate');
check(/setFaceOverlayEnabled\(true\)/.test(controls), 'Speichern enables mesh overlay');
check(/setLiveActCharacterFaceDebugEnabled\(true\)/.test(controls), 'Speichern re-enables debug sampling');
check(/hasLiveActCharacterFaceMapping/.test(controls), 'overlay uses live runtime mapping');
check(/snap\.points/.test(overlay), 'overlay draws anchor points');
check(/OVERLAY_POINT_IDS/.test(debug), 'partial anchors including nose/chin/forehead');
check(/faceOverlayEnabled && characterFaceMappingAvailable/.test(surface), 'mesh overlay independent of webcam tracking');
check(
  /Face Overlay[\s\S]{0,400}?disabled=\{actionsDisabled\}[\s\S]{0,200}?liveact-face-overlay-toggle/.test(settings),
  'face overlay toggle not gated on tracking',
);
check(/Character geometry/.test(overlay), 'geometry HUD label');
check(/Applied/.test(overlay), 'applied HUD section');
check(/face\.jawOpen/.test(overlay), 'applied jawOpen');
check(/diagnosticsV2Ref/.test(controls), 'controls pass diagnostics to character overlay');
check(/cal: OFF|hasNeutralBaseline/.test(read('src/app/character/liveact/LiveActPipMetricsPanel.tsx')), 'cal status in PiP metrics');
check(/characterFaceDebugHandleRef/.test(surface), 'surface binds handle ref');
check(/liveact-character-face-mapping-unavailable/.test(settings), 'settings capability hint');
check(/liveact-pip-metrics-panel|LiveActPipMetricsPanel/.test(read('src/app/character/liveact/LiveActCameraPreview.tsx')), 'PiP hosts side metrics panel');
check(/liveact-pip-metrics-panel/.test(read('src/app/character/liveact/LiveActPipMetricsPanel.tsx')), 'pip metrics panel component');
check(/checkLiveActCharacterFaceOverlay/.test(gate), 'test-gate wiring');
check(/SagaDriveFaceAnchorsV1|face-anchors/.test(acceptance), 'acceptance mentions anchors');

const metricsOut = join(root, '.qa/runs/liveact-character-face-metrics-anchor-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-face-metrics.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: metricsOut,
  write: true,
  logLevel: 'silent',
});

const m = await import(metricsOut + `?t=${Date.now()}`);
const landmarks = m.buildLiveActFaceLandmarksFromAnchorScreenPoints({
  mouthUpper: { x: 0.5, y: 0.55 },
  mouthLower: { x: 0.5, y: 0.62 },
  mouthCornerLeft: { x: 0.42, y: 0.58 },
  mouthCornerRight: { x: 0.58, y: 0.58 },
  eyeLeftUpper: { x: 0.35, y: 0.4 },
  eyeLeftLower: { x: 0.35, y: 0.45 },
  eyeLeftInner: { x: 0.38, y: 0.42 },
  eyeLeftOuter: { x: 0.32, y: 0.42 },
  eyeRightUpper: { x: 0.65, y: 0.4 },
  eyeRightLower: { x: 0.65, y: 0.45 },
  eyeRightInner: { x: 0.62, y: 0.42 },
  eyeRightOuter: { x: 0.68, y: 0.42 },
  browLeftCenter: { x: 0.35, y: 0.32 },
  browRightCenter: { x: 0.65, y: 0.32 },
});
const computed = m.computeLiveActFaceMetrics(landmarks);
check(computed.available, 'anchor-derived metrics available');
check(typeof computed.mouthGap === 'number' && computed.mouthGap > 0, 'mouthGap from anchors');

console.log('liveact-character-face-overlay-check OK');
