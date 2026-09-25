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
const layer = read('src/app/character/liveact/FaceMappingMarkerLayer.tsx');
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
check(/face-mapping-overlay-view-mode|face-mapping-view-both/.test(panel), 'overlay view mode toggle');
check(/FaceMappingOverlayViewMode|viewMode|autoBindingsRef/.test(layer), 'marker layer view mode');
check(/drawAutoGhosts|AUTO_STROKE|viewModeRef/.test(layer), 'auto ghost draw');
check(/stringifyFaceMappingCompareExport|buildFaceMappingCompareExport/.test(autoDomain), 'compare export builder');
check(/SagaDriveFaceMappingCompareV1|FACE_MAPPING_COMPARE_EXPORT_KIND/.test(autoDomain), 'compare export kind');
check(/createMediaPipeFaceImageLandmarker/.test(controls), 'controls use IMAGE landmarker');
check(/autoCoordsFromSession|projectManualCoords|manualCoords/.test(controls), 'coord projection wired');
check(/applyAutoMappingToDraft/.test(controls), 'controls merge');
check(/replaceProtected|window\.confirm/.test(controls), 'explicit replace for protected');
check(/face-mapping-auto-v1/.test(barrel), 'barrel export');
check(/checkLiveActFaceMappingAuto|liveact-face-mapping-auto-check/.test(gate), 'test-gate wired');
check(/Auto Mapping|IMAGE/.test(acceptance), 'acceptance');
check(/freezeFaceMappingGroundTruthReference/.test(autoDomain), 'GT freeze');
check(/validForGroundTruthComparison/.test(autoDomain), 'GT validity flag');
check(/clearFaceMappingAuthoringMetaForAnchor/.test(autoDomain), 'clear meta helper');
check(/markAllBoundFaceMappingAnchorsAsReviewedManual/.test(autoDomain), 'mark reviewed GT');
check(/face-mapping-surface-semantics/.test(barrel), 'surface semantics barrel');
check(/classifyFaceMappingSurfaceFromNodeIdentity/.test(read('src/domains/character/avatar/face-mapping-surface-semantics-v1.ts')), 'surface classifier');
check(/autoSessionTokenRef|groundTruthReferenceRef/.test(controls), 'stale-session + GT refs');
check(/face-mapping-mark-ground-truth/.test(panel), 'mark GT button');
check(/getCompareExportJson/.test(controls) && /getCompareExportJson/.test(panel), 'compare from frozen GT');
check(/editingAllowed=\{!autoBusy\}/.test(controls), 'edits locked while auto busy');
check(/Valid hit only|leave last binding/.test(layer), 'drag keeps last valid comment');
check(/MediaPipe|mouthCornerLeft|291/.test(design), 'design map table');
check(/Auto Mapping|IMAGE|Ground Truth|validForGroundTruthComparison/.test(acceptance), 'acceptance');

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
const leftEyeOuter = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === 'eyeLeftOuter');
const rightEyeOuter = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === 'eyeRightOuter');
check(leftMouth?.laterality === 'left' && rightMouth?.laterality === 'right', 'mouth L/R laterality');
// Anatomical LEFT = MediaPipe FACE_LANDMARKS_LEFT_* (291 / 263), not historic LiveAct mouthLeft=61.
check(leftMouth.landmarkIndices[0] === 291 && rightMouth.landmarkIndices[0] === 61, 'mouth MediaPipe anatomical indices');
check(leftEyeOuter.landmarkIndices[0] === 263 && rightEyeOuter.landmarkIndices[0] === 33, 'eye outer MediaPipe anatomical indices');

// Independent L/R evidence from @mediapipe/tasks-vision topology (not from our laterality metadata).
const { FaceLandmarker } = await import('@mediapipe/tasks-vision');
function connectionIndices(conns) {
  const out = new Set();
  for (const c of conns ?? []) {
    if (typeof c?.start === 'number') out.add(c.start);
    if (typeof c?.end === 'number') out.add(c.end);
  }
  return out;
}
const mpLeftEye = connectionIndices(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE);
const mpRightEye = connectionIndices(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);
check(mpLeftEye.has(263) && mpLeftEye.has(362), 'MediaPipe LEFT_EYE contains 263/362');
check(mpRightEye.has(33) && mpRightEye.has(133), 'MediaPipe RIGHT_EYE contains 33/133');
check(mpLeftEye.has(leftEyeOuter.landmarkIndices[0]), 'map eyeLeftOuter ∈ FACE_LANDMARKS_LEFT_EYE');
check(mpRightEye.has(rightEyeOuter.landmarkIndices[0]), 'map eyeRightOuter ∈ FACE_LANDMARKS_RIGHT_EYE');
check(!mpLeftEye.has(33), '33 is not MediaPipe LEFT_EYE');
const leftTestIdx = mapMod.mediapipeAnatomicalLeftLandmarkIndicesForTests();
check(leftTestIdx.includes(291) && leftTestIdx.includes(263), 'left test helper indices');

// Synthetic landmarks by INDEX from MediaPipe topology (higher X = anatomical left on unmirrored frame).
// Do NOT derive X from entry.laterality — that would circularly test our own metadata.
const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
const ANAT_LEFT = new Set(leftTestIdx);
const ANAT_RIGHT = new Set([61, 33, 133, 159, 158, 157, 145, 144, 153, 107, 105, 70]);
for (let i = 0; i < 478; i += 1) {
  if (ANAT_LEFT.has(i)) landmarks[i] = { x: 0.72 + (i % 5) * 0.001, y: 0.45, z: 0 };
  else if (ANAT_RIGHT.has(i)) landmarks[i] = { x: 0.28 + (i % 5) * 0.001, y: 0.45, z: 0 };
}
// Midline / mouth centers
for (const [idx, y] of [
  [1, 0.48],
  [13, 0.62],
  [14, 0.68],
  [10, 0.18],
  [152, 0.82],
]) {
  landmarks[idx] = { x: 0.5, y, z: 0 };
}
// Lid centroids need their indices present
for (const idx of [386, 385, 387, 374, 380, 373, 336, 334, 300]) {
  if (!landmarks[idx] || landmarks[idx].x === 0.5) {
    landmarks[idx] = { x: 0.72 + (idx % 3) * 0.001, y: idx >= 336 ? 0.32 : 0.4, z: 0 };
  }
}
for (const idx of [159, 158, 157, 145, 144, 153, 107, 105, 70]) {
  landmarks[idx] = { x: 0.28 + (idx % 3) * 0.001, y: idx <= 70 || idx >= 105 ? 0.32 : 0.4, z: 0 };
}

const samples = mapMod.resolveAllMediaPipeAnchorSamples(landmarks);
check(samples.every((s) => s.available), 'all 21 samples available from synthetic');
const sampleLeft = samples.find((s) => s.anchorId === 'mouthCornerLeft');
const sampleRight = samples.find((s) => s.anchorId === 'mouthCornerRight');
check(sampleLeft.x > sampleRight.x, 'L/R: anatomical left (291) has higher image x than right (61)');

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

const surfOut = join(runsDir, 'liveact-face-mapping-surface-semantics-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-mapping-surface-semantics-v1.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: surfOut,
  logLevel: 'silent',
});
const surfMod = await import(`${surfOut}?t=${Date.now()}`);
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('Eyes') === 'eyeball', 'Eyes → eyeball');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('Eyelashes') === 'eyelash', 'Eyelashes → eyelash');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('Head') === 'face_skin', 'Head → face_skin');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftOuter', 'eyeball'), 'canthus on eyeball = mismatch');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftUpper', 'eyeball'), 'lid on eyeball = mismatch');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('mouthUpper', 'hair'), 'mouth on hair = mismatch');
check(surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftLower', 'eyelash'), 'lid on eyelash allowed');
check(surfMod.isFaceMappingSurfaceSemanticsOk('mouthUpper', 'face_skin'), 'mouth on face_skin ok');

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

// Fail-closed seed: baseline bindings are auto/unreviewed, not invented manual GT.
let draft = draftMod.createEmptyFaceMappingDraft(null);
draft = draftMod.setFaceMappingDraftBinding(draft, 'noseTip', {
  nodeIdentity: 'HeadMesh',
  primitiveIndex: 0,
  triangleIndex: 0,
  barycentric: { u: 0.34, v: 0.33, w: 0.33 },
});
let meta = autoMod.createEmptyAnchorAuthoringMeta(draft);
check(meta.noseTip?.source === 'auto' && meta.noseTip?.reviewed !== true, 'baseline meta fail-closed auto');

// Explicit manual binding is protected.
meta = { ...meta, noseTip: { source: 'manual', reviewed: false } };
const protectedApply = autoMod.applyAutoMappingToDraft(draft, session, meta, {
  replaceProtected: false,
});
check(protectedApply.skippedProtectedCount >= 1, 'manual noseTip protected');
check(
  protectedApply.draft.anchors.noseTip?.nodeIdentity === 'HeadMesh',
  'protected binding unchanged',
);

// Cleared protected: meta orphan must NOT block fill-empty.
let cleared = draftMod.clearFaceMappingDraftBinding(draft, 'noseTip');
let clearedMeta = autoMod.clearFaceMappingAuthoringMetaForAnchor(
  { noseTip: { source: 'manual', reviewed: false } },
  'noseTip',
);
check(!clearedMeta.noseTip, 'clear removes meta');
const refill = autoMod.applyAutoMappingToDraft(cleared, session, clearedMeta, {
  replaceProtected: false,
});
const noseAuto = session.anchors.find((a) => a.anchorId === 'noseTip');
if (noseAuto?.binding) {
  check(refill.draft.anchors.noseTip != null, 'cleared anchor refillable by auto');
}

// Orphan meta without binding is not protected.
check(
  !autoMod.isProtectedFaceMappingAnchor({ source: 'manual', reviewed: false }, null),
  'orphan meta not protected',
);

meta = autoMod.markFaceMappingAnchorManual(meta, 'mouthUpper', true);
check(meta.mouthUpper?.source === 'manual_override', 'manual edit after auto → override');

// GT: unreviewed auto is NOT valid comparison.
const allAutoDraft = draftMod.createEmptyFaceMappingDraft(null);
const allAutoScreens = {};
const allAutoMeta = {};
for (const id of draftMod.SAGA_DRIVE_FACE_ANCHOR_IDS ?? Object.keys({})) {
  /* filled below */
}
const ANCHOR_IDS = [
  'noseTip', 'chin', 'forehead', 'mouthUpper', 'mouthLower', 'mouthCornerLeft', 'mouthCornerRight',
  'eyeLeftInner', 'eyeLeftOuter', 'eyeLeftUpper', 'eyeLeftLower',
  'eyeRightInner', 'eyeRightOuter', 'eyeRightUpper', 'eyeRightLower',
  'browLeftInner', 'browLeftCenter', 'browLeftOuter',
  'browRightInner', 'browRightCenter', 'browRightOuter',
];
let gtDraft = draftMod.createEmptyFaceMappingDraft(null);
const gtMeta = {};
const gtScreens = {};
for (const id of ANCHOR_IDS) {
  gtDraft = draftMod.setFaceMappingDraftBinding(gtDraft, id, {
    nodeIdentity: 'HeadMesh',
    primitiveIndex: 0,
    triangleIndex: 0,
    barycentric: { u: 0.34, v: 0.33, w: 0.33 },
  });
  gtMeta[id] = { source: 'auto', reviewed: false };
  gtScreens[id] = { x: 100, y: 100 };
}
const unreviewedRef = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: gtMeta,
  screenCoords: gtScreens,
});
check(unreviewedRef.validForGroundTruthComparison === false, 'unreviewed auto not valid GT');
check(unreviewedRef.status === 'unreviewed_auto', 'status unreviewed_auto');

const reviewedMeta = {};
for (const id of ANCHOR_IDS) {
  reviewedMeta[id] = { source: 'manual', reviewed: true, reviewedAt: '2026-09-25T00:00:00.000Z' };
}
const reviewedRef = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: reviewedMeta,
  screenCoords: gtScreens,
  nowIso: '2026-09-25T00:00:00.000Z',
});
check(reviewedRef.validForGroundTruthComparison === true, 'reviewed manual is valid GT');

// Reference immutability: compare uses frozen reference screens, not post-auto draft.
const refScreensOffset = {};
for (const row of session.anchors) {
  if (row.screenX != null && row.screenY != null) {
    refScreensOffset[row.anchorId] = { x: row.screenX + 5, y: row.screenY - 3 };
  }
}
const immutableRef = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: reviewedMeta,
  screenCoords: Object.fromEntries(
    ANCHOR_IDS.map((id) => [
      id,
      refScreensOffset[id] ?? { x: 10, y: 10 },
    ]),
  ),
});
const appliedAuto = autoMod.applyAutoMappingToDraft(gtDraft, session, reviewedMeta, {
  replaceProtected: true,
});
check(appliedAuto.meta.noseTip?.source === 'auto', 'after replace meta is auto');
const compareValid = autoMod.buildFaceMappingCompareExport({
  reference: immutableRef,
  autoSession: session,
  draftAfter: appliedAuto.draft,
  metaAfter: appliedAuto.meta,
});
check(compareValid.validForGroundTruthComparison === true, 'compare inherits valid GT');
check(compareValid.comparison != null, 'comparison present when valid');
const noseDelta =
  compareValid.comparison?.anchors?.find((r) => r.anchorId === 'noseTip')?.screenErrorPx ?? null;
if (session.anchors.find((a) => a.anchorId === 'noseTip')?.screenX != null) {
  check(noseDelta != null && noseDelta > 0, `immutable ref yields non-zero delta (got ${noseDelta})`);
}

const compareInvalid = autoMod.buildFaceMappingCompareExport({
  reference: unreviewedRef,
  autoSession: session,
});
check(compareInvalid.validForGroundTruthComparison === false, 'invalid GT flagged');
check(
  compareInvalid.comparison == null || compareInvalid.summary?.medianErrorPx == null,
  'no fake 0px quality when GT invalid',
);

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
      leftMouthIndex: leftMouth.landmarkIndices[0],
      rightMouthIndex: rightMouth.landmarkIndices[0],
      mediapipeLeftEyeHas263: mpLeftEye.has(263),
      pipelineStatus: session.status,
      mapped,
      evalSummary: evalReport.summary,
      unreviewedGtValid: unreviewedRef.validForGroundTruthComparison,
      reviewedGtValid: reviewedRef.validForGroundTruthComparison,
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
