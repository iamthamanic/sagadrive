#!/usr/bin/env node
/**
 * liveact-camera-overlay-metrics-check — PiP object-cover transform + metrics (#398).
 * Location: scripts/liveact-camera-overlay-metrics-check.mjs
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
    console.error(`liveact-camera-overlay-metrics-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const transformSrc = read('src/domains/character/liveact/liveact-video-viewport-transform.ts');
const metricsSrc = read('src/domains/character/liveact/liveact-face-metrics.ts');
const domainIndex = read('src/domains/character/liveact/index.ts');
const overlay = read('src/app/character/liveact/LiveActFaceOverlay.tsx');
const pip = read('src/app/character/liveact/LiveActCameraPreview.tsx');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const settings = read('src/app/character/avatar/AvatarPreviewSettings.tsx');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const gate = read('scripts/test-gate.mjs');
const e2e = read('e2e/liveact-viewport-smoke.spec.ts');

check(/computeLiveActObjectCoverTransform/.test(transformSrc), 'transform API');
check(/projectLiveActLandmarkToCanvas/.test(transformSrc), 'project API');
check(!/from ['"]react['"]/.test(transformSrc), 'transform no React');
check(/computeLiveActFaceMetrics/.test(metricsSrc), 'metrics API');
check(/mouthGap/.test(metricsSrc), 'mouthGap');
check(!/from ['"]react['"]/.test(metricsSrc), 'metrics no React');
check(/liveact-video-viewport-transform/.test(domainIndex), 'barrel transform');
check(/liveact-face-metrics/.test(domainIndex), 'barrel metrics');

check(/computeLiveActObjectCoverTransform/.test(overlay), 'overlay uses transform');
check(/mirrorX: true/.test(overlay), 'overlay single mirror');
check(/metricsEnabled/.test(overlay), 'overlay metrics gate');
check(!/useState\(/.test(overlay), 'overlay no useState');
check(/1 - p\.x/.test(overlay) === false || /mirrorX/.test(overlay), 'no ad-hoc double mirror');

check(/metricsEnabled/.test(pip), 'pip metrics prop');
check(/LiveActPipMetricsPanel|liveact-pip-metrics-panel/.test(pip), 'metrics beside PiP video');
check(/diagnosticsV2Ref/.test(pip), 'pip V2 ref');
check(/videoRef=\{videoRef\}/.test(pip), 'pip passes videoRef');

check(/metricsEnabled/.test(hook) && /useState\(true\)/.test(hook), 'metrics initial true');
check(/setMetricsEnabled/.test(hook), 'metrics setter');
check(/liveact-face-metrics-toggle/.test(settings), 'settings metrics toggle');
check(/onMetricsChange/.test(controls), 'controls wire metrics');

check(/checkLiveActCameraOverlayMetrics/.test(gate), 'test-gate');
check(/liveact-face-metrics-toggle/.test(e2e), 'e2e metrics toggle');

const outfile = join(root, '.qa/runs/liveact-camera-overlay-metrics-bundle.mjs');
await build({
  entryPoints: [
    join(root, 'src/domains/character/liveact/liveact-video-viewport-transform.ts'),
  ],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  write: true,
  logLevel: 'silent',
});
const metricsOut = join(root, '.qa/runs/liveact-face-metrics-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-face-metrics.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: metricsOut,
  write: true,
  logLevel: 'silent',
});

const t = await import(outfile + `?t=${Date.now()}`);
const m = await import(metricsOut + `?t=${Date.now()}`);

// Wide video in tall canvas → crop sides
const wide = t.computeLiveActObjectCoverTransform({
  videoWidth: 1920,
  videoHeight: 1080,
  canvasWidth: 160,
  canvasHeight: 120,
  mirrorX: true,
});
check(wide.contentHeight === 120, 'wide cover height');
check(wide.contentWidth > 160, 'wide cover crops X');
check(Math.abs(wide.offsetX) > 0, 'wide offsetX');

const mid = t.projectLiveActLandmarkToCanvas(0.5, 0.5, wide);
check(Math.abs(mid.x - 80) < 1.5, 'mirrored center X ≈ canvas mid');

// Portrait video
const tall = t.computeLiveActObjectCoverTransform({
  videoWidth: 720,
  videoHeight: 1280,
  canvasWidth: 160,
  canvasHeight: 120,
  mirrorX: false,
});
check(tall.contentWidth === 160, 'tall cover width');
check(tall.contentHeight > 120, 'tall cover crops Y');

const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
landmarks[13] = { x: 0.5, y: 0.55 };
landmarks[14] = { x: 0.5, y: 0.62 };
landmarks[61] = { x: 0.42, y: 0.58 };
landmarks[291] = { x: 0.58, y: 0.58 };
landmarks[159] = { x: 0.35, y: 0.4 };
landmarks[145] = { x: 0.35, y: 0.45 };
landmarks[133] = { x: 0.38, y: 0.42 };
landmarks[33] = { x: 0.32, y: 0.42 };
landmarks[386] = { x: 0.65, y: 0.4 };
landmarks[374] = { x: 0.65, y: 0.45 };
landmarks[362] = { x: 0.62, y: 0.42 };
landmarks[263] = { x: 0.68, y: 0.42 };
landmarks[105] = { x: 0.35, y: 0.32 };
landmarks[334] = { x: 0.65, y: 0.32 };

const metrics = m.computeLiveActFaceMetrics(landmarks);
check(metrics.available, 'metrics available');
check(typeof metrics.mouthGap === 'number' && metrics.mouthGap > 0, 'mouthGap ratio');
check(typeof metrics.eyeOpenLeft === 'number', 'eyeOpenLeft');
check(m.formatLiveActMetric(null) === '—', 'null format');

console.log('liveact-camera-overlay-metrics-check OK');
