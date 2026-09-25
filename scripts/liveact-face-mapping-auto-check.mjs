#!/usr/bin/env node
/**
 * liveact-face-mapping-auto-check — Face Setup Auto Mapping (#421).
 * Location: scripts/liveact-face-mapping-auto-check.mjs
 *
 * Feature slug: liveact-face-mapping-auto
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';
import * as THREE from 'three';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-mapping-auto-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const autoDomain = read('src/domains/character/avatar/face-mapping-auto-v1.ts');
const mapSrc = read('src/infrastructure/character/liveact/mediapipe-sagadrive-face-anchor-map-v1.ts');
const imageSrc = read('src/infrastructure/character/liveact/mediapipe-face-image-landmarker.ts');
const pipeSrc = read('src/infrastructure/character/avatar/face-mapping-auto-pipeline.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const videoSrc = read('src/infrastructure/character/liveact/mediapipe-face-source.ts');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const panel = read('src/app/character/liveact/FaceMappingAuthoringPanel.tsx');
const barrel = read('src/domains/character/avatar/index.ts');
const gate = read('scripts/test-gate.mjs');
const acceptance = read('.qa/acceptance/liveact-face-mapping-auto.md');
const design = read('.qa/design/liveact-face-mapping-auto-mediapipe-map-v1.md');

check(/SagaDriveFaceMappingAutoV1|FACE_MAPPING_AUTO_CONTRACT_VERSION/.test(autoDomain), 'auto domain contract');
check(/applyAutoMappingToDraft/.test(autoDomain), 'merge apply');
check(/isProtectedFaceMappingAnchor/.test(autoDomain), 'manual_override protection');
check(/evaluateAutoVsManualScreenPoints/.test(autoDomain), 'auto-vs-manual eval');
check(/needs-calibration/.test(autoDomain), 'non-normative thresholds');
check(!/from ['"]three['"]/.test(autoDomain), 'auto domain pure');
check(!/mediapipe|@mediapipe/.test(autoDomain), 'auto domain no MediaPipe');

check(/MediaPipeSagaDriveFaceAnchorMapV1/.test(mapSrc), 'map version');
check(/MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1/.test(mapSrc), 'map table');
check(/FACE_ANCHOR_MAP_V1_LIMITATIONS/.test(mapSrc), 'V1 limits documented');
check(/mouthCornerLeft[\s\S]*mouthLeft|laterality: 'left'/.test(mapSrc), 'L/R laterality');
check(/no_iris_pupil_representation/.test(mapSrc), 'iris out of scope');

check(/runningMode: 'IMAGE'/.test(imageSrc), 'IMAGE mode');
check(/createMediaPipeFaceImageLandmarker/.test(imageSrc), 'image factory');
check(/delegate: 'CPU'/.test(imageSrc), 'CPU still frames');
check(/MEDIAPIPE_VISION_WASM_PATH/.test(imageSrc), 'first-party wasm');
check(/runningMode: 'VIDEO'/.test(videoSrc), 'VIDEO source unchanged');
check(!/runningMode: 'IMAGE'/.test(videoSrc), 'VIDEO source not IMAGE');

check(/runFaceMappingAutoPipeline/.test(pipeSrc), 'pipeline');
check(/raycastFaceMappingPointer|raycast\(/.test(pipeSrc), 'reuses raycast path');
check(/captureFaceMappingAutoFrame/.test(studio), 'studio capture');
check(/face-mapping-copy-json|JSON kopieren/.test(panel), 'compare JSON copy button');
check(/stringifyFaceMappingCompareExport|buildFaceMappingCompareExport/.test(autoDomain), 'compare export builder');
check(/SagaDriveFaceMappingCompareV1|FACE_MAPPING_COMPARE_EXPORT_KIND/.test(autoDomain), 'compare export kind');
check(/createMediaPipeFaceImageLandmarker/.test(controls), 'controls use IMAGE landmarker');
check(/autoCoordsFromSession|projectManualCoords|manualCoords/.test(controls), 'coord projection wired');
check(/applyAutoMappingToDraft/.test(controls), 'controls merge');
check(/replaceProtected|window\.confirm/.test(controls), 'explicit replace for protected');
check(/face-mapping-auto-v1/.test(barrel), 'barrel export');
check(/checkLiveActFaceMappingAuto|liveact-face-mapping-auto-check/.test(gate), 'test-gate wired');
check(/Auto Mapping|IMAGE/.test(acceptance), 'acceptance');
check(/MediaPipe|mouthCornerLeft|61/.test(design), 'design map table');

const runsDir = join(root, '.qa/runs');
const fixturesDir = join(root, '.qa/fixtures/liveact-face-mapping-auto');
mkdirSync(runsDir, { recursive: true });
mkdirSync(fixturesDir, { recursive: true });

const mapOut = join(runsDir, 'liveact-face-mapping-auto-map-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/infrastructure/character/liveact/mediapipe-sagadrive-face-anchor-map-v1.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: mapOut,
  logLevel: 'silent',
});
const mapMod = await import(`${mapOut}?t=${Date.now()}`);
check(mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.length === 21, '21 map entries');
mapMod.assertMediaPipeSagaDriveFaceAnchorMapComplete();

const leftMouth = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === 'mouthCornerLeft');
const rightMouth = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === 'mouthCornerRight');
check(leftMouth?.laterality === 'left' && rightMouth?.laterality === 'right', 'mouth L/R laterality');
check(leftMouth.landmarkIndices[0] === 61 && rightMouth.landmarkIndices[0] === 291, 'mouth MediaPipe indices');

// Synthetic landmarks: subject's left at higher x (unmirrored frontal).
const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
for (const entry of mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1) {
  const baseX = entry.laterality === 'left' ? 0.72 : entry.laterality === 'right' ? 0.28 : 0.5;
  const baseY =
    entry.expectedRegion === 'mouth'
      ? 0.62
      : entry.expectedRegion.startsWith('eye')
        ? 0.42
        : entry.expectedRegion.startsWith('brow')
          ? 0.32
          : entry.anchorId === 'forehead'
            ? 0.18
            : entry.anchorId === 'chin'
              ? 0.82
              : 0.48;
  for (const idx of entry.landmarkIndices) {
    landmarks[idx] = { x: baseX + (idx % 3) * 0.001, y: baseY + (idx % 2) * 0.001, z: 0 };
  }
}

const samples = mapMod.resolveAllMediaPipeAnchorSamples(landmarks);
check(samples.every((s) => s.available), 'all 21 samples available from synthetic');
const sampleLeft = samples.find((s) => s.anchorId === 'mouthCornerLeft');
const sampleRight = samples.find((s) => s.anchorId === 'mouthCornerRight');
check(sampleLeft.x > sampleRight.x, 'L/R: subject left has higher image x (unmirrored)');

const autoOut = join(runsDir, 'liveact-face-mapping-auto-domain-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-mapping-auto-v1.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: autoOut,
  logLevel: 'silent',
});
const autoMod = await import(`${autoOut}?t=${Date.now()}`);

const pipeOut = join(runsDir, 'liveact-face-mapping-auto-pipeline-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/infrastructure/character/avatar/face-mapping-auto-pipeline.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: pipeOut,
  external: ['three'],
  logLevel: 'silent',
});
const pipeMod = await import(`${pipeOut}?t=${Date.now()}`);

const rayOut = join(runsDir, 'liveact-face-mapping-raycast-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/infrastructure/character/avatar/face-mapping-raycast.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: rayOut,
  external: ['three'],
  logLevel: 'silent',
});
const rayMod = await import(`${rayOut}?t=${Date.now()}`);

const geom = new THREE.BufferGeometry();
geom.setAttribute(
  'position',
  new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0, -1, 1, 0]), 3),
);
geom.setIndex([0, 1, 2, 0, 2, 3]);
const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
mesh.name = 'HeadMesh';
const rootObj = new THREE.Group();
rootObj.add(mesh);
rootObj.updateMatrixWorld(true);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 3);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();

const noFace = pipeMod.runFaceMappingAutoPipeline({
  landmarks: [],
  faceCount: 0,
  canvasWidth: 200,
  canvasHeight: 200,
  raycast: () => null,
});
check(noFace.status === 'no_face', '0 faces → no_face');

const multi = pipeMod.runFaceMappingAutoPipeline({
  landmarks,
  faceCount: 2,
  canvasWidth: 200,
  canvasHeight: 200,
  raycast: () => null,
});
check(multi.status === 'multi_face', '>1 face → multi_face');

const session = pipeMod.runFaceMappingAutoPipeline({
  landmarks,
  faceCount: 1,
  canvasWidth: 200,
  canvasHeight: 200,
  raycast: (x, y) =>
    rayMod.raycastFaceMappingPointer({
      camera,
      root: rootObj,
      canvasWidth: 200,
      canvasHeight: 200,
      canvasX: x,
      canvasY: y,
    }),
});
check(session.anchors.length === 21, 'pipeline returns 21 rows');
const mapped = session.anchors.filter((a) => a.outcome === 'mapped').length;
check(mapped >= 10, `pipeline maps majority (got ${mapped})`);

const draftOut = join(runsDir, 'liveact-face-mapping-draft-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-mapping-draft-v1.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: draftOut,
  logLevel: 'silent',
});
const draftMod = await import(`${draftOut}?t=${Date.now()}`);
let draft = draftMod.createEmptyFaceMappingDraft(null);
draft = draftMod.setFaceMappingDraftBinding(draft, 'noseTip', {
  nodeIdentity: 'HeadMesh',
  primitiveIndex: 0,
  triangleIndex: 0,
  barycentric: { u: 0.34, v: 0.33, w: 0.33 },
});
let meta = autoMod.createEmptyAnchorAuthoringMeta(draft);
check(meta.noseTip?.source === 'manual', 'baseline meta = manual');

const protectedApply = autoMod.applyAutoMappingToDraft(draft, session, meta, {
  replaceProtected: false,
});
check(protectedApply.skippedProtectedCount >= 1, 'manual noseTip protected');
check(
  protectedApply.draft.anchors.noseTip?.nodeIdentity === 'HeadMesh',
  'protected binding unchanged',
);

meta = autoMod.markFaceMappingAnchorManual(meta, 'mouthUpper', true);
check(meta.mouthUpper?.source === 'manual_override', 'manual edit after auto → override');

const manualScreen = {};
for (const row of session.anchors) {
  if (row.screenX != null && row.screenY != null) {
    manualScreen[row.anchorId] = { x: row.screenX + 2, y: row.screenY - 1 };
  }
}
const evalReport = autoMod.evaluateAutoVsManualScreenPoints({
  manualScreen,
  autoSession: session,
  faceWidthPx: 120,
});
check(evalReport.summary.thresholdStatus === 'needs-calibration', 'thresholds non-normative');
check(evalReport.summary.expectedAnchors === 21, 'eval expected 21');
check(typeof evalReport.summary.medianErrorPx === 'number', 'median error present');
check(typeof evalReport.summary.p95ErrorPx === 'number', 'p95 error present');
check(typeof evalReport.summary.maxErrorPx === 'number', 'max error present');

const compareExport = autoMod.buildFaceMappingCompareExport({
  draft: protectedApply.draft,
  manualCoords: { noseTip: { x: 100, y: 120, meshLabel: 'HeadMesh/t0' } },
  autoCoords: {
    noseTip: { outcome: 'mapped', x: 102, y: 119, meshLabel: 'HeadMesh/t1' },
  },
  meta: protectedApply.meta,
  nowIso: '2026-09-25T00:00:00.000Z',
});
check(compareExport.kind === 'SagaDriveFaceMappingCompareV1', 'compare export kind value');
check(compareExport.anchors.length === 21, 'compare export 21 anchors');
check(compareExport.anchors.find((a) => a.anchorId === 'noseTip')?.deltaPx != null, 'compare delta');
const compareJson = autoMod.stringifyFaceMappingCompareExport({
  draft: protectedApply.draft,
  manualCoords: {},
  autoCoords: {},
  nowIso: '2026-09-25T00:00:00.000Z',
});
check(compareJson.includes('SagaDriveFaceMappingCompareV1'), 'stringify compare export');

const hair = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
hair.name = 'Hair_Front';
check(!rayMod.isFaceMappingAllowlistedMesh(hair), 'hair excluded from auto raycast path');

writeFileSync(
  join(fixturesDir, 'synthetic-landmarks-summary.json'),
  `${JSON.stringify(
    {
      mapVersion: mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_VERSION,
      sampleCount: samples.length,
      leftMouthX: sampleLeft.x,
      rightMouthX: sampleRight.x,
      pipelineStatus: session.status,
      mapped,
      evalSummary: evalReport.summary,
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(runsDir, 'liveact-face-mapping-auto-eval.json'),
  `${JSON.stringify(evalReport, null, 2)}\n`,
);

console.log('liveact-face-mapping-auto-check OK');
console.log(
  `eval median=${evalReport.summary.medianErrorPx} p95=${evalReport.summary.p95ErrorPx} max=${evalReport.summary.maxErrorPx} threshold=${evalReport.summary.thresholdStatus}`,
);
