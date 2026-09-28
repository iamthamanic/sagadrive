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
check(/listRaycastCandidates|listFaceMappingRaycastCandidates/.test(pipeSrc), 'reuses ordered raycast candidates');
check(/listFaceMappingRaycastCandidatesAtCanvas/.test(controls), 'controls list candidates for Auto');
check(/selectFaceMappingSurfaceAwareCandidate/.test(pipeSrc), 'pipeline surface-aware select');
check(/screen_snap|buildFaceMappingScreenSnapOffsets/.test(pipeSrc), 'pipeline screen snap fallback');
check(!/minAvailability/.test(autoDomain), 'dead minAvailability option removed');
check(/countsAsGroundTruthMeta/.test(autoDomain), 'GT provenance helper exported/used');
check(/isValidFaceMappingReviewedAtV1/.test(autoDomain), 'strict reviewedAt V1 helper');
check(!/Date\.parse\(meta\.reviewedAt\)/.test(autoDomain), 'GT does not use permissive Date.parse');
check(/reviewedAt/.test(autoDomain) && /manual_override/.test(autoDomain), 'GT requires reviewedAt + manual source');
check(
  /face-mapping-copy-json[\s\S]*?h-11 min-h-\[44px\]|h-11 min-h-\[44px\][\s\S]*?face-mapping-copy-json/.test(
    panel,
  ),
  'Auto JSON export ≥44px touch',
);
check(/Mouth Upper\/Lower|#422 Verification|jawOpen/.test(acceptance), 'mouth functional QA deferred to #422');
check(/listFaceMappingRaycastCandidates/.test(read('src/infrastructure/character/avatar/face-mapping-raycast.ts')), 'ordered candidates API');
check(
  /selectFaceMappingSurfaceAwareCandidate|manual eyeUpper/.test(
    read('scripts/liveact-face-mapping-manual-check.mjs'),
  ),
  'manual surface-aware regression wired',
);
check(/captureFaceMappingAutoFrame/.test(studio), 'studio capture');
check(/face-mapping-overlay-view-mode|face-mapping-view-both/.test(panel), 'overlay view mode toggle');
check(
  /face-mapping-overlay-view-mode[\s\S]*?h-11 min-h-\[44px\]/.test(panel),
  'overlay view options ≥44px touch',
);
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
check(/reviewed === true/.test(autoDomain) || /meta\.reviewed === true/.test(autoDomain), 'GT requires reviewed=true');
check(/face-mapping-gt-needs-review-banner|Als Ground Truth markieren/.test(panel), 'GT review UI copy');
check(/face-mapping-surface-semantics/.test(barrel), 'surface semantics barrel');
check(/classifyFaceMappingSurfaceFromNodeIdentity/.test(read('src/domains/character/avatar/face-mapping-surface-semantics-v1.ts')), 'surface classifier');
check(/applyFaceMappingAutoCameraState/.test(studio), 'studio shared auto camera state');
check(/applyFaceMappingAutoCameraState/.test(controls), 'controls freeze on auto camera');
check(/autoSessionTokenRef|groundTruthReferenceRef/.test(controls), 'stale-session + GT refs');
check(/lastAutoSessionRef\.current = null/.test(controls), 'mark GT clears prior auto session');
check(/surface_mismatch/.test(pipeSrc), 'pipeline rejects invalid surfaces');
check(/surface_mismatch/.test(autoDomain), 'surface_mismatch outcome');
check(/Only explicit Clear removes provenance/.test(controls), 'miss click keeps provenance');
check(/min-h-\[44px\]/.test(panel), 'auto button 44px touch target');
check(/face-mapping-mark-ground-truth/.test(panel), 'mark GT button');
check(/GT JSON kopiert|Als Ground Truth markieren und GT-JSON/.test(panel), 'GT mark copies GT JSON');
check(/getAutoExportJson/.test(controls) && /getAutoExportJson/.test(panel), 'Auto JSON export from session');
check(/Auto JSON|Nur Auto-Mapping/.test(panel), 'Auto JSON button copy');
check(/stringifyFaceMappingGroundTruthReference/.test(autoDomain), 'GT stringify');
check(/stringifyFaceMappingAutoSessionExport/.test(autoDomain), 'Auto session stringify');
check(!/GT-Referenz \+ Auto-Vorschlag als Compare-JSON/.test(panel), 'no mixed compare clipboard copy');
check(/stringifyFaceMappingCompareExport/.test(autoDomain), 'compare builder kept in domain');
check(/editingAllowed=\{!autoBusy\}/.test(controls), 'edits locked while auto busy');
check(/isFaceMappingSaveDisabled/.test(controls), 'save gate helper used in controls');
check(
  /isFaceMappingSaveDisabled\(\{[\s\S]*autoBusy[\s\S]*draftValid/.test(controls),
  'Speichern disabled via isFaceMappingSaveDisabled(autoBusy, draftValid)',
);
check(
  /Speichern blocked — Auto Mapping running/.test(controls),
  'applyFaceMapping fail-closed while autoBusy',
);
check(
  !/disabled=\{!draftValidation\?\.ok\}/.test(controls),
  'Speichern no longer only gated on draftValidation',
);
check(/face-mapping-viewport-cancel/.test(controls), 'Cancel remains available during auto');
check(/Valid hit only|leave last binding/.test(layer), 'drag keeps last valid comment');
check(
  /raycastFaceMappingAtCanvas\([\s\S]*anchorId/.test(layer),
  'manual click/drag pass anchorId for surface-aware select',
);
check(
  /selectFaceMappingSurfaceAwareCandidate/.test(studio),
  'studio manual raycast uses surface-aware select',
);
check(
  !/screen_snap|buildFaceMappingScreenSnapOffsets/.test(layer),
  'manual layer has no screen-snap',
);
check(/MediaPipe|mouthCornerLeft|291/.test(design), 'design map table');
check(/Auto Mapping|IMAGE|Ground Truth|validForGroundTruthComparison/.test(acceptance), 'acceptance');
const semanticsDesign = read('.qa/design/liveact-face-anchor-semantics-v1.md');
check(/SagaDriveFaceAnchorSemanticsV1|mouthUpper|chin pad|oral_interior/.test(semanticsDesign), 'semantics V1 design contract');
check(/kind: 'midpoint'|midpoint/.test(mapSrc), 'map supports midpoint derived samples');
check(/oral_interior/.test(read('src/domains/character/avatar/face-mapping-surface-semantics-v1.ts')), 'oral_interior surface class');
check(/same_ray_expanded_depth|resolveFaceMappingSameRayExpandedMaxDepthDelta/.test(read('src/domains/character/avatar/face-mapping-auto-surface-select-v1.ts')), 'same-ray expanded depth before snap');
check(/countsAsGroundTruthAnchor/.test(autoDomain), 'GT requires surface-valid binding helper');
check(/isFaceMappingSurfaceSemanticsOk/.test(read('src/domains/character/avatar/face-mapping-draft-v1.ts')), 'marker invalid on bad surface');
check(/Eyes\/Eyelashes\/Teeth|ungültig/.test(panel), 'GT UI mentions invalid surfaces');

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
const ANAT_RIGHT = new Set([
  61, 33, 133, 159, 158, 157, 145, 144, 153, 107, 105, 70,
  46, 52, 53, 55, 63, 65, 66, // RIGHT_EYEBROW full set
]);
for (let i = 0; i < 478; i += 1) {
  if (ANAT_LEFT.has(i)) landmarks[i] = { x: 0.72 + (i % 5) * 0.001, y: 0.45, z: 0 };
  else if (ANAT_RIGHT.has(i)) landmarks[i] = { x: 0.28 + (i % 5) * 0.001, y: 0.45, z: 0 };
}
// Midline / mouth lip body / chin pad / forehead (semantics V1 — not seam-only 13/14 or oval 152/10 alone)
for (const [idx, y] of [
  [1, 0.48], // noseTip
  [0, 0.58], // upper lip outer
  [13, 0.62], // upper lip inner
  [14, 0.66], // lower lip inner
  [17, 0.7], // lower lip outer
  [10, 0.12], // oval top / hairline
  [151, 0.22], // mid forehead
  [152, 0.9], // oval bottom (must NOT be chin sample alone)
  [175, 0.8], // chin pad
  [199, 0.82], // chin pad
]) {
  landmarks[idx] = { x: 0.5, y, z: 0 };
}
// Lid + brows: unmirrored MediaPipe anatomy —
// LEFT (high-X side): temple outer has highest X, glabella inner lower toward midline.
// RIGHT (low-X side): temple outer has lowest X, glabella inner higher toward midline.
for (const idx of [386, 385, 387, 374, 380, 373]) {
  landmarks[idx] = { x: 0.72 + (idx % 3) * 0.001, y: 0.4, z: 0 };
}
landmarks[300] = { x: 0.78, y: 0.32, z: 0 }; // left outer (temple, lateral)
landmarks[296] = { x: 0.75, y: 0.31, z: 0 };
landmarks[334] = { x: 0.73, y: 0.30, z: 0 };
landmarks[282] = { x: 0.72, y: 0.31, z: 0 };
landmarks[336] = { x: 0.7, y: 0.32, z: 0 }; // left inner (glabella)
for (const idx of [295, 293, 285, 283, 276]) {
  landmarks[idx] = { x: 0.74 + (idx % 5) * 0.002, y: 0.32, z: 0 };
}
for (const idx of [159, 158, 157, 145, 144, 153]) {
  landmarks[idx] = { x: 0.28 + (idx % 3) * 0.001, y: 0.4, z: 0 };
}
landmarks[70] = { x: 0.22, y: 0.32, z: 0 }; // right outer (temple)
landmarks[66] = { x: 0.25, y: 0.31, z: 0 };
landmarks[105] = { x: 0.27, y: 0.30, z: 0 };
landmarks[52] = { x: 0.28, y: 0.31, z: 0 };
landmarks[107] = { x: 0.3, y: 0.32, z: 0 }; // right inner (glabella)
for (const idx of [46, 53, 55, 63, 65]) {
  landmarks[idx] = { x: 0.26 + (idx % 5) * 0.002, y: 0.32, z: 0 };
}

const samples = mapMod.resolveAllMediaPipeAnchorSamples(landmarks);
check(samples.every((s) => s.available), 'all 21 samples available from synthetic');
const sampleLeft = samples.find((s) => s.anchorId === 'mouthCornerLeft');
const sampleRight = samples.find((s) => s.anchorId === 'mouthCornerRight');
check(sampleLeft.x > sampleRight.x, 'L/R: anatomical left (291) has higher image x than right (61)');

// Semantic regression: mouth lip body separation, chin/forehead vs oval extremes, brow centerline
const mouthU = samples.find((s) => s.anchorId === 'mouthUpper');
const mouthL = samples.find((s) => s.anchorId === 'mouthLower');
check(mouthU.y < mouthL.y, 'mouthUpper.y < mouthLower.y (lip body midpoints)');
check(Math.abs(mouthU.y - mouthL.y) > 0.02, 'mouth upper/lower not collapsed to inner seam');
check(
  Math.abs(mouthU.y - (0.58 + 0.62) / 2) < 1e-6 && Math.abs(mouthL.y - (0.66 + 0.7) / 2) < 1e-6,
  'mouth samples are midpoints of outer/inner lip landmarks',
);
const chinS = samples.find((s) => s.anchorId === 'chin');
const foreheadS = samples.find((s) => s.anchorId === 'forehead');
check(chinS.y < landmarks[152].y, 'chin pad sample above FACE_OVAL bottom 152');
check(foreheadS.y > landmarks[10].y, 'forehead sample below hairline-only 10');
check(foreheadS.y < mouthU.y && chinS.y > mouthL.y, 'midline order: forehead < mouth < chin');
const browLI = samples.find((s) => s.anchorId === 'browLeftInner');
const browLC = samples.find((s) => s.anchorId === 'browLeftCenter');
const browLO = samples.find((s) => s.anchorId === 'browLeftOuter');
const browRI = samples.find((s) => s.anchorId === 'browRightInner');
const browRC = samples.find((s) => s.anchorId === 'browRightCenter');
const browRO = samples.find((s) => s.anchorId === 'browRightOuter');
// Unmirrored MediaPipe anatomy (do NOT read map.laterality for expected direction):
// LEFT side = high image X → outer(temple) > center > inner(glabella).
// RIGHT side = low image X → outer(temple) < center < inner(glabella).
check(
  browLO.x > browLC.x && browLC.x > browLI.x,
  'LEFT brow outer→center→inner orientation (unmirrored)',
);
check(
  browRO.x < browRC.x && browRC.x < browRI.x,
  'RIGHT brow outer→center→inner orientation (unmirrored)',
);
// Swap detection: if map indices for left inner/outer were swapped, orientation fails above.
const mpLeftBrow = connectionIndices(FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW);
const leftOuterIdx = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find(
  (e) => e.anchorId === 'browLeftOuter',
).landmarkIndices[0];
const leftInnerIdx = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find(
  (e) => e.anchorId === 'browLeftInner',
).landmarkIndices[0];
check(mpLeftBrow.has(leftOuterIdx) && mpLeftBrow.has(leftInnerIdx), 'LEFT brow endpoints ∈ LEFT_EYEBROW');
check(leftOuterIdx === 300 && leftInnerIdx === 336, 'LEFT brow outer=300 inner=336 (MediaPipe topology)');
const mpRightBrow = connectionIndices(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW);
const rightOuterIdx = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find(
  (e) => e.anchorId === 'browRightOuter',
).landmarkIndices[0];
const rightInnerIdx = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find(
  (e) => e.anchorId === 'browRightInner',
).landmarkIndices[0];
check(mpRightBrow.has(rightOuterIdx) && mpRightBrow.has(rightInnerIdx), 'RIGHT brow endpoints ∈ RIGHT_EYEBROW');
check(rightOuterIdx === 70 && rightInnerIdx === 107, 'RIGHT brow outer=70 inner=107 (MediaPipe topology)');
const mouthEntryU = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === 'mouthUpper');
const mouthEntryL = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === 'mouthLower');
check(
  mouthEntryU.kind === 'midpoint' &&
    mouthEntryU.landmarkIndices.includes(0) &&
    mouthEntryU.landmarkIndices.includes(13) &&
    !mouthEntryU.landmarkIndices.every((i) => i === 13),
  'mouthUpper is midpoint 0+13 not single 13',
);
check(
  mouthEntryL.kind === 'midpoint' &&
    mouthEntryL.landmarkIndices.includes(14) &&
    mouthEntryL.landmarkIndices.includes(17),
  'mouthLower is midpoint 14+17 not single 14',
);
const chinEntry = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === 'chin');
check(!chinEntry.landmarkIndices.includes(152), 'chin not oval-bottom 152');
check(chinEntry.landmarkIndices.includes(175) && chinEntry.landmarkIndices.includes(199), 'chin uses 175+199');
const browCenterEntry = mapMod.MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === 'browLeftCenter');
check(
  browCenterEntry.kind === 'centroid' &&
    browCenterEntry.landmarkIndices.length >= 3 &&
    browCenterEntry.landmarkIndices.every((i) => mpLeftBrow.has(i)) &&
    !browCenterEntry.landmarkIndices.includes(336) &&
    !browCenterEntry.landmarkIndices.includes(300),
  'browLeftCenter mid-arc centroid ⊆ LEFT_EYEBROW (not endpoints alone)',
);

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

// Save gate: Auto busy blocks Speichern even when draft is valid; idle + valid enables.
check(
  autoMod.isFaceMappingSaveDisabled({ autoBusy: true, draftValid: true }) === true,
  'Save disabled while autoBusy (draft valid)',
);
check(
  autoMod.isFaceMappingSaveDisabled({ autoBusy: true, draftValid: false }) === true,
  'Save disabled while autoBusy (draft invalid)',
);
check(
  autoMod.isFaceMappingSaveDisabled({ autoBusy: false, draftValid: false }) === true,
  'Save disabled when draft invalid and idle',
);
check(
  autoMod.isFaceMappingSaveDisabled({ autoBusy: false, draftValid: true }) === false,
  'Save enabled when Auto idle and draft valid',
);

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
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('Helmet') === 'equipment', 'Helmet → equipment');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('Headwear') === 'equipment', 'Headwear → equipment (not face_skin)');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('eyepatch') === 'equipment', 'eyepatch → equipment');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('goggles') === 'equipment', 'goggles → equipment');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('beard-full') === 'equipment', 'beard-full → equipment');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('mouthUpper', 'equipment'), 'mouth on helmet = mismatch');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('forehead', 'equipment'), 'forehead on headwear = mismatch');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('chin', 'equipment'), 'chin on beard = mismatch');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftOuter', 'eyeball'), 'canthus on eyeball = mismatch');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftUpper', 'eyeball'), 'lid on eyeball = mismatch');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('mouthUpper', 'hair'), 'mouth on hair = mismatch');
check(surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftLower', 'eyelid_or_skin'), 'lid on eyelid_or_skin ok');
check(surfMod.isFaceMappingSurfaceSemanticsOk('mouthUpper', 'face_skin'), 'mouth on face_skin ok');
check(surfMod.isFaceMappingSurfaceSemanticsOk('mouthUpper', 'unknown'), 'unlabeled mesh ok for face_skin anchors');
check(
  surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftLower', 'unknown'),
  'unlabeled *_mesh/HighRes ok for lid when class unknown',
);
check(
  surfMod.classifyFaceMappingSurfaceFromNodeIdentity('human-male-quality-20260921-m5_mesh') ===
    'unknown',
  'preset mesh name classifies unknown (no token hack)',
);
check(
  surfMod.isFaceMappingSurfaceSemanticsOk(
    'noseTip',
    surfMod.classifyFaceMappingSurfaceFromNodeIdentity('human-male-quality-20260921-m5_mesh'),
  ),
  'preset mesh allowed for nose via unknown→face_skin policy',
);
check(!surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftLower', 'eyelash'), 'lid on eyelash = mismatch (#421 fail-closed)');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftLower', 'eyeball'), 'lid on eyeball = mismatch');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('Teeth') === 'oral_interior', 'Teeth → oral_interior');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('Tongue') === 'oral_interior', 'Tongue → oral_interior');
check(surfMod.classifyFaceMappingSurfaceFromNodeIdentity('Gums') === 'oral_interior', 'Gums → oral_interior');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('mouthUpper', 'oral_interior'), 'mouth rejects oral_interior');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('noseTip', 'oral_interior'), 'nose rejects oral_interior');
check(!surfMod.isFaceMappingSurfaceSemanticsOk('eyeLeftInner', 'oral_interior'), 'eye rejects oral_interior');
check(/projectAutoCoordsFromBindings|projectWorldToFaceMappingCanvas/.test(controls), 'auto coords reprojected with camera');
check(/autoSessionTokenRef\.current \+= 1/.test(controls), 'token monotonic bump on open');
check(!/autoSessionTokenRef\.current = 0/.test(controls), 'token never reset to zero');
check(
  /return \(\) => \{[\s\S]*autoSessionTokenRef\.current \+= 1[\s\S]*faceMappingOpenRef\.current = false/.test(
    controls,
  ),
  'unmount invalidates auto session token',
);

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

const listCandidates = (x, y) =>
  rayMod.listFaceMappingRaycastCandidates({
    camera,
    root: rootObj,
    canvasWidth: 200,
    canvasHeight: 200,
    canvasX: x,
    canvasY: y,
  });

const noFace = pipeMod.runFaceMappingAutoPipeline({
  landmarks: [],
  faceCount: 0,
  canvasWidth: 200,
  canvasHeight: 200,
  listRaycastCandidates: () => [],
});
check(noFace.status === 'no_face', '0 faces → no_face');

const multi = pipeMod.runFaceMappingAutoPipeline({
  landmarks,
  faceCount: 2,
  canvasWidth: 200,
  canvasHeight: 200,
  listRaycastCandidates: () => [],
});
check(multi.status === 'multi_face', '>1 face → multi_face');

const session = pipeMod.runFaceMappingAutoPipeline({
  landmarks,
  faceCount: 1,
  canvasWidth: 200,
  canvasHeight: 200,
  listRaycastCandidates: listCandidates,
});
check(session.anchors.length === 21, 'pipeline returns 21 rows');
const mapped = session.anchors.filter((a) => a.outcome === 'mapped').length;
check(mapped >= 10, `pipeline maps majority (got ${mapped})`);

// Layered Eyes (near) + Body (far): lid Auto must pick Body within depth gate, not eyeball.
const eyeGeom = new THREE.BufferGeometry();
eyeGeom.setAttribute(
  'position',
  new THREE.BufferAttribute(new Float32Array([-0.4, -0.4, 0.05, 0.4, -0.4, 0.05, 0, 0.4, 0.05]), 3),
);
eyeGeom.setIndex([0, 1, 2]);
const eyesMesh = new THREE.Mesh(eyeGeom, new THREE.MeshBasicMaterial());
eyesMesh.name = 'Eyes';
const bodyGeom = new THREE.BufferGeometry();
bodyGeom.setAttribute(
  'position',
  new THREE.BufferAttribute(new Float32Array([-1, -1, 0.04, 1, -1, 0.04, 0, 1, 0.04]), 3),
);
bodyGeom.setIndex([0, 1, 2]);
const bodyMesh = new THREE.Mesh(bodyGeom, new THREE.MeshBasicMaterial());
bodyMesh.name = 'Body';
const layeredRoot = new THREE.Group();
layeredRoot.add(eyesMesh);
layeredRoot.add(bodyMesh);
layeredRoot.updateMatrixWorld(true);

const layeredCandidates = rayMod.listFaceMappingRaycastCandidates({
  camera,
  root: layeredRoot,
  canvasWidth: 200,
  canvasHeight: 200,
  canvasX: 100,
  canvasY: 100,
});
check(layeredCandidates.length >= 2, `layered ray has ≥2 hits (got ${layeredCandidates.length})`);
check(layeredCandidates[0].nodeIdentity === 'Eyes', 'first layered hit is Eyes');
check(
  layeredCandidates.some((c) => c.nodeIdentity === 'Body'),
  'Body exists behind Eyes on same ray',
);

const selectOut = join(runsDir, 'liveact-face-mapping-auto-surface-select-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-mapping-auto-surface-select-v1.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: selectOut,
  logLevel: 'silent',
});
const selectMod = await import(`${selectOut}?t=${Date.now()}`);
const lidSelect = selectMod.selectFaceMappingSurfaceAwareCandidate(
  layeredCandidates.map((c) => ({
    order: c.order,
    distance: c.distance,
    nodeIdentity: c.nodeIdentity,
  })),
  'eyeLeftUpper',
);
check(lidSelect.selectedIndex != null, 'lid selects allowed hit behind Eyes');
check(
  lidSelect.candidates[lidSelect.selectedIndex].nodeIdentity === 'Body',
  'lid selects Body not Eyes',
);
check(lidSelect.strategy === 'first_allowed_depth_gated', 'depth-gated first allowed');

// Far Body behind Eyes must be rejected (not through-the-head).
const farSelect = selectMod.selectFaceMappingSurfaceAwareCandidate(
  [
    { order: 0, distance: 0.05, nodeIdentity: 'Eyes' },
    { order: 1, distance: 0.8, nodeIdentity: 'Body' },
  ],
  'eyeLeftUpper',
);
check(farSelect.selectedIndex == null, 'far Body behind Eyes rejected');
check(farSelect.strategy === 'depth_rejected_only', 'strategy depth_rejected_only');
check(
  selectMod.resolveFaceMappingSurfaceSelectMaxDepthDelta(2.5) <= 0.02,
  'depth gate ignores large camera distance (absolute face-scale fallback)',
);
check(
  selectMod.resolveFaceMappingSurfaceSelectMaxDepthDelta(0.05, { faceWidthWorld: 0.2 }) ===
    Math.max(0.008, 0.2 * 0.08),
  'depth gate uses face width when provided',
);

// Prefer original screen ray with expanded depth before snap (eye lid evidence).
const midSelect = selectMod.selectFaceMappingSurfaceAwareCandidate(
  [
    { order: 0, distance: 0.05, nodeIdentity: 'Eyes' },
    { order: 1, distance: 0.05 + 0.025, nodeIdentity: 'Body' },
  ],
  'eyeLeftUpper',
  { faceWidthWorld: 0.15 },
);
check(midSelect.selectedIndex === 1, 'same-ray expanded depth selects Body');
check(midSelect.strategy === 'same_ray_expanded_depth', 'strategy same_ray_expanded_depth');
check(
  selectMod.resolveFaceMappingSameRayExpandedMaxDepthDelta({ faceWidthWorld: 0.15 }) === 0.15 * 0.2,
  'A: expanded gate = faceWidth * 0.2 (no absolute floor)',
);
check(
  selectMod.resolveFaceMappingSameRayExpandedMaxDepthDelta({ faceWidthWorld: 0.01 }) === 0.01 * 0.2,
  'B: tiny faceWidth → tiny gate (no 0.02 floor)',
);
check(
  selectMod.resolveFaceMappingSameRayExpandedMaxDepthDelta({ faceWidthWorld: null }) === null,
  'C: null faceWidth → no expanded depth',
);
check(
  selectMod.resolveFaceMappingSameRayExpandedMaxDepthDelta({}) === null,
  'C: missing faceWidth → no expanded depth',
);
const noExpandSelect = selectMod.selectFaceMappingSurfaceAwareCandidate(
  [
    { order: 0, distance: 0.05, nodeIdentity: 'Eyes' },
    { order: 1, distance: 0.05 + 0.025, nodeIdentity: 'Body' },
  ],
  'eyeLeftUpper',
  { faceWidthWorld: null },
);
check(noExpandSelect.selectedIndex == null, 'C: without faceWidth no expanded hit');
check(noExpandSelect.strategy === 'depth_rejected_only', 'C: stays depth_rejected_only without faceWidth');
// D already covered by farSelect above
// E = midSelect with faceWidthWorld

// Pipeline with mocked canonical-style candidates (Eyes then Body close behind).
const mockCanonicalCandidates = [
  {
    order: 0,
    distance: 0.04,
    nodeIdentity: 'Eyes',
    triangleIndex: 0,
    binding: {
      nodeIdentity: 'Eyes',
      primitiveIndex: 0,
      triangleIndex: 0,
      barycentric: { u: 0.34, v: 0.33, w: 0.33 },
    },
    worldPoint: { x: 0, y: 0.1, z: 0.04 },
  },
  {
    order: 1,
    distance: 0.045,
    nodeIdentity: 'Body',
    triangleIndex: 1,
    binding: {
      nodeIdentity: 'Body',
      primitiveIndex: 0,
      triangleIndex: 1,
      barycentric: { u: 0.34, v: 0.33, w: 0.33 },
    },
    worldPoint: { x: 0, y: 0.1, z: 0.02 },
  },
];
const eyelashThenBody = [
  {
    ...mockCanonicalCandidates[0],
    nodeIdentity: 'Eyelashes',
    binding: {
      nodeIdentity: 'Eyelashes',
      primitiveIndex: 0,
      triangleIndex: 0,
      barycentric: { u: 0.34, v: 0.33, w: 0.33 },
    },
  },
  mockCanonicalCandidates[1],
];

const mockedSession = pipeMod.runFaceMappingAutoPipeline({
  landmarks,
  faceCount: 1,
  canvasWidth: 200,
  canvasHeight: 200,
  listRaycastCandidates: (_x, _y) => mockCanonicalCandidates,
});
for (const id of [
  'eyeLeftUpper',
  'eyeLeftLower',
  'eyeRightOuter',
  'eyeRightUpper',
  'eyeRightLower',
]) {
  const row = mockedSession.anchors.find((a) => a.anchorId === id);
  check(row?.outcome === 'mapped', `${id} mapped via surface-aware select (got ${row?.outcome})`);
  check(row?.meshNodeIdentity === 'Body', `${id} on Body not Eyes (got ${row?.meshNodeIdentity})`);
  check(
    row?.surfaceSelection?.candidates?.length >= 2,
    `${id} exposes ≥2 ray candidates`,
  );
  check(
    row?.surfaceSelection?.candidates?.[0]?.nodeIdentity === 'Eyes',
    `${id} first candidate Eyes`,
  );
  check(
    row?.surfaceSelection?.strategy === 'first_allowed_depth_gated',
    `${id} strategy depth-gated`,
  );
}

const lashSession = pipeMod.runFaceMappingAutoPipeline({
  landmarks,
  faceCount: 1,
  canvasWidth: 200,
  canvasHeight: 200,
  listRaycastCandidates: () => eyelashThenBody,
});
const lower = lashSession.anchors.find((a) => a.anchorId === 'eyeLeftLower');
check(lower?.outcome === 'mapped', 'lower lid mapped behind Eyelashes');
check(lower?.meshNodeIdentity === 'Body', 'lower lid Body behind Eyelashes');

const rejectOnlyEyes = pipeMod.runFaceMappingAutoPipeline({
  landmarks,
  faceCount: 1,
  canvasWidth: 200,
  canvasHeight: 200,
  listRaycastCandidates: () => [mockCanonicalCandidates[0]],
});
const rejectRow = rejectOnlyEyes.anchors.find((a) => a.anchorId === 'eyeLeftUpper');
check(
  rejectRow?.outcome === 'surface_mismatch' || rejectRow?.outcome === 'mapped',
  'Eyes-only ray either mismatches or snaps',
);
if (rejectRow?.outcome === 'surface_mismatch') {
  check(
    rejectRow.surfaceSelection?.candidates?.[0]?.allowed === false,
    'Eyes-only first candidate not allowed for lid',
  );
  const mismatchCompare = autoMod.buildFaceMappingCompareExport({
    reference: null,
    autoSession: rejectOnlyEyes,
  });
  const lidProp = mismatchCompare.proposal?.anchors?.find((a) => a.anchorId === 'eyeLeftUpper');
  check(lidProp?.binding == null, 'surface_mismatch proposal has no binding');
  check(lidProp?.screen == null, 'surface_mismatch proposal screen omitted from compare');
  const mismatchEval = autoMod.evaluateAutoVsManualScreenPoints({
    manualScreen: { eyeLeftUpper: { x: 10, y: 10 } },
    autoSession: rejectOnlyEyes,
  });
  const lidEval = mismatchEval.rows.find((r) => r.anchorId === 'eyeLeftUpper');
  check(lidEval?.screenErrorPx == null, 'unmapped lid not counted in eval errors');
  check(lidEval?.autoPresent === false, 'unmapped lid autoPresent false');
}

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
check(meta.noseTip?.source === 'manual' && meta.noseTip?.reviewed !== true, 'baseline meta protected manual unreviewed');

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

// GT: reviewed-only — source alone never grants validForGroundTruthComparison.
const ANCHOR_IDS = [
  'noseTip', 'chin', 'forehead', 'mouthUpper', 'mouthLower', 'mouthCornerLeft', 'mouthCornerRight',
  'eyeLeftInner', 'eyeLeftOuter', 'eyeLeftUpper', 'eyeLeftLower',
  'eyeRightInner', 'eyeRightOuter', 'eyeRightUpper', 'eyeRightLower',
  'browLeftInner', 'browLeftCenter', 'browLeftOuter',
  'browRightInner', 'browRightCenter', 'browRightOuter',
];
function fillAllBindings(baseDraft) {
  let d = baseDraft;
  for (const id of ANCHOR_IDS) {
    d = draftMod.setFaceMappingDraftBinding(d, id, {
      nodeIdentity: 'HeadMesh',
      primitiveIndex: 0,
      triangleIndex: 0,
      barycentric: { u: 0.34, v: 0.33, w: 0.33 },
    });
  }
  return d;
}
const gtScreens = Object.fromEntries(ANCHOR_IDS.map((id) => [id, { x: 100, y: 100 }]));
const gtDraft = fillAllBindings(draftMod.createEmptyFaceMappingDraft(null));

// A) 21× manual, reviewed=false → false
const manualUnreviewedMeta = Object.fromEntries(
  ANCHOR_IDS.map((id) => [id, { source: 'manual', reviewed: false }]),
);
const refA = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: manualUnreviewedMeta,
  screenCoords: gtScreens,
});
check(refA.validForGroundTruthComparison === false, 'A: 21 manual unreviewed → not valid GT');
check(refA.status !== 'reviewed_manual_complete', 'A: status not reviewed_manual_complete');

// B) 21× manual_override, reviewed=false → false
const overrideUnreviewedMeta = Object.fromEntries(
  ANCHOR_IDS.map((id) => [id, { source: 'manual_override', reviewed: false }]),
);
const refB = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: overrideUnreviewedMeta,
  screenCoords: gtScreens,
});
check(refB.validForGroundTruthComparison === false, 'B: 21 manual_override unreviewed → not valid GT');

// C) 20 reviewed + 1 unreviewed → false / partial
const partialMeta = Object.fromEntries(
  ANCHOR_IDS.map((id, i) => [
    id,
    i === 0
      ? { source: 'manual', reviewed: false }
      : { source: 'manual', reviewed: true, reviewedAt: '2026-09-25T00:00:00.000Z' },
  ]),
);
const refC = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: partialMeta,
  screenCoords: gtScreens,
});
check(refC.validForGroundTruthComparison === false, 'C: partial reviewed → not valid GT');
check(refC.status === 'partial_reviewed_manual', 'C: status partial_reviewed_manual');

// D) 21 reviewed → true
const reviewedMeta = Object.fromEntries(
  ANCHOR_IDS.map((id) => [
    id,
    { source: 'manual', reviewed: true, reviewedAt: '2026-09-25T00:00:00.000Z' },
  ]),
);
const reviewedRef = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: reviewedMeta,
  screenCoords: gtScreens,
  nowIso: '2026-09-25T00:00:00.000Z',
});
check(reviewedRef.validForGroundTruthComparison === true, 'D: 21 reviewed → valid GT');
check(reviewedRef.status === 'reviewed_manual_complete', 'D: status reviewed_manual_complete');

// Surface-invalid eye bindings cannot be normative GT even when reviewed.
const eyesDraft = fillAllBindings(draftMod.createEmptyFaceMappingDraft(null));
const eyesBound = draftMod.setFaceMappingDraftBinding(eyesDraft, 'eyeLeftOuter', {
  nodeIdentity: 'Eyes',
  primitiveIndex: 0,
  triangleIndex: 0,
  barycentric: { u: 0.34, v: 0.33, w: 0.33 },
});
const eyesRef = autoMod.freezeFaceMappingGroundTruthReference({
  draft: eyesBound,
  meta: reviewedMeta,
  screenCoords: gtScreens,
});
check(eyesRef.validForGroundTruthComparison === false, 'Eyes binding → not valid GT');
check(eyesRef.status === 'partial_reviewed_manual', 'Eyes binding → partial GT status');
check(
  autoMod.countsAsGroundTruthAnchor({
    anchorId: 'eyeLeftOuter',
    binding: eyesBound.anchors.eyeLeftOuter,
    meta: reviewedMeta.eyeLeftOuter,
  }) === false,
  'countsAsGroundTruthAnchor rejects eyeball surface',
);
check(
  autoMod.countsAsGroundTruthAnchor({
    anchorId: 'mouthUpper',
    binding: gtDraft.anchors.mouthUpper,
    meta: reviewedMeta.mouthUpper,
  }) === true,
  'countsAsGroundTruthAnchor accepts HeadMesh face_skin',
);

const teethDraft = draftMod.setFaceMappingDraftBinding(gtDraft, 'mouthUpper', {
  nodeIdentity: 'Teeth',
  primitiveIndex: 0,
  triangleIndex: 0,
  barycentric: { u: 0.34, v: 0.33, w: 0.33 },
});
check(
  draftMod.resolveFaceMappingMarkerStatus(teethDraft, 'mouthUpper') === 'invalid',
  'Teeth mouth binding → marker invalid',
);

// Provenance: auto+reviewed and reviewed without reviewedAt are NOT GT.
check(
  autoMod.countsAsGroundTruthMeta({
    source: 'auto',
    reviewed: true,
    reviewedAt: '2026-09-25T00:00:00.000Z',
  }) === false,
  'auto+reviewed is not GT',
);
check(
  autoMod.countsAsGroundTruthMeta({ source: 'manual', reviewed: true }) === false,
  'reviewed without reviewedAt is not GT',
);
check(
  autoMod.countsAsGroundTruthMeta({
    source: 'manual',
    reviewed: true,
    reviewedAt: 'not-a-date',
  }) === false,
  'invalid reviewedAt is not GT',
);
check(
  autoMod.countsAsGroundTruthMeta({
    source: 'manual_override',
    reviewed: true,
    reviewedAt: '2026-09-25T00:00:00.000Z',
  }) === true,
  'manual_override+reviewed+reviewedAt is GT',
);
const inventedReviewed = autoMod.createEmptyAnchorAuthoringMeta(gtDraft, {
  defaultReviewed: true,
});
check(
  inventedReviewed.noseTip?.reviewed !== true,
  'defaultReviewed without reviewedAt stays unreviewed',
);

// Strict reviewedAt V1: canonical UTC with milliseconds only (writer = toISOString).
check(
  autoMod.isValidFaceMappingReviewedAtV1('2026-09-28T08:54:12.123Z') === true,
  'canonical reviewedAt with ms is valid',
);
check(
  autoMod.countsAsGroundTruthMeta({
    source: 'manual',
    reviewed: true,
    reviewedAt: '2026-09-28T08:54:12.123Z',
  }) === true,
  'canonical reviewedAt yields GT',
);
for (const bad of [
  '09/28/2026',
  '0',
  'Sun, 28 Sep 2026 08:54:12 GMT',
  '2026-09-28',
  '2026-09-28T08:54:12Z',
  '2026-13-28T08:54:12.123Z',
  '2026-09-31T08:54:12.123Z',
  '',
]) {
  check(
    autoMod.isValidFaceMappingReviewedAtV1(bad) === false,
    `reviewedAt invalid: ${JSON.stringify(bad)}`,
  );
  check(
    autoMod.countsAsGroundTruthMeta({
      source: 'manual',
      reviewed: true,
      reviewedAt: bad,
    }) === false,
    `non-ISO reviewedAt is not GT: ${JSON.stringify(bad)}`,
  );
}
check(autoMod.isValidFaceMappingReviewedAtV1(undefined) === false, 'reviewedAt undefined invalid');
check(
  autoMod.createEmptyAnchorAuthoringMeta(gtDraft, {
    defaultReviewed: true,
    reviewedAt: '09/28/2026',
  }).noseTip?.reviewed !== true,
  'createEmpty rejects Date.parse-permissive reviewedAt',
);
check(
  autoMod.markAllBoundFaceMappingAnchorsAsReviewedManual(
    {},
    gtDraft,
    '09/28/2026',
  ).noseTip?.reviewed !== true,
  'markAllBound fails closed on non-canonical nowIso',
);

// D2) 21 reviewed but one screen missing → false
const screensMissingOne = { ...gtScreens };
delete screensMissingOne.noseTip;
const refMissingScreen = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: reviewedMeta,
  screenCoords: screensMissingOne,
});
check(
  refMissingScreen.validForGroundTruthComparison === false,
  'D2: 21 reviewed but missing screen → not valid GT',
);
check(refMissingScreen.status === 'reviewed_manual_complete', 'D2: status still reviewed_manual_complete');

// E) 21 auto/unreviewed → unreviewed_auto / false
const autoUnreviewedMeta = Object.fromEntries(
  ANCHOR_IDS.map((id) => [id, { source: 'auto', reviewed: false }]),
);
const unreviewedRef = autoMod.freezeFaceMappingGroundTruthReference({
  draft: gtDraft,
  meta: autoUnreviewedMeta,
  screenCoords: gtScreens,
});
check(unreviewedRef.validForGroundTruthComparison === false, 'E: unreviewed auto not valid GT');
check(unreviewedRef.status === 'unreviewed_auto', 'E: status unreviewed_auto');

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

const compareNoAuto = autoMod.buildFaceMappingCompareExport({
  reference: immutableRef,
  autoSession: null,
});
check(
  compareNoAuto.validForGroundTruthComparison === false,
  'compare invalid without auto session even if GT reviewed',
);
check(compareNoAuto.comparison == null, 'no comparison when auto session missing');

const compareEmptyDetect = autoMod.buildFaceMappingCompareExport({
  reference: immutableRef,
  autoSession: noFace,
});
check(
  compareEmptyDetect.validForGroundTruthComparison === false,
  'compare invalid for no_face session even if GT reviewed',
);
check(
  !autoMod.isUsableFaceMappingAutoSessionForCompare(noFace),
  'no_face session not usable for compare',
);
check(
  !autoMod.isUsableFaceMappingAutoSessionForCompare(multi),
  'multi_face session not usable for compare',
);
check(
  autoMod.isUsableFaceMappingAutoSessionForCompare(session),
  'mapped session usable for compare',
);

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
const weaponLeaf = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
weaponLeaf.name = 'Weapon_Sword';
check(!rayMod.isFaceMappingAllowlistedMesh(weaponLeaf), 'weapon leaf still excluded by leaf policy');

function bodyUnderNamedParent(parentName) {
  const parent = new THREE.Group();
  parent.name = parentName;
  const body = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
  body.name = 'Body';
  parent.add(body);
  return body;
}

// Broad ancestor substrings must NOT exclude legitimate Body meshes.
check(
  rayMod.isFaceMappingAllowlistedMesh(bodyUnderNamedParent('Character_Hair')),
  'Body under Character_Hair allowlisted',
);
check(
  rayMod.isFaceMappingAllowlistedMesh(bodyUnderNamedParent('PropsRoot')),
  'Body under PropsRoot allowlisted',
);
check(
  rayMod.isFaceMappingAllowlistedMesh(bodyUnderNamedParent('Chair')),
  'Body under Chair allowlisted (no fuzzy hair substring)',
);
const scene = new THREE.Group();
scene.name = 'Scene';
const character = new THREE.Group();
character.name = 'Character';
const nestedBody = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
nestedBody.name = 'Body';
character.add(nestedBody);
scene.add(character);
check(rayMod.isFaceMappingAllowlistedMesh(nestedBody), 'Body under Scene/Character allowlisted');

// Precise SagaDrive equipment roots + explicit markers still exclude descendants.
const sagaRigid = new THREE.Group();
sagaRigid.name = 'saga-rigid-equipment';
const rigidMesh = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
rigidMesh.name = 'Mesh';
sagaRigid.add(rigidMesh);
check(!rayMod.isFaceMappingAllowlistedMesh(rigidMesh), 'Mesh under saga-rigid-equipment excluded');

const rigidRoot = new THREE.Group();
rigidRoot.name = 'rigid-helmet-1';
const helmetChild = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
helmetChild.name = 'Mesh';
rigidRoot.add(helmetChild);
const skinnedRoot = new THREE.Group();
skinnedRoot.name = 'skinned-goggles-1';
const goggleChild = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
goggleChild.name = 'Mesh';
skinnedRoot.add(goggleChild);
const sagaSkin = new THREE.Group();
sagaSkin.name = 'saga-skinned-wearables';
const skinMesh = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
skinMesh.name = 'Mesh';
sagaSkin.add(skinMesh);
const bodyOk = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
bodyOk.name = 'Body';
check(!rayMod.isFaceMappingAllowlistedMesh(helmetChild), 'generic Mesh under rigid-* excluded');
check(!rayMod.isFaceMappingAllowlistedMesh(goggleChild), 'generic Mesh under skinned-* excluded');
check(!rayMod.isFaceMappingAllowlistedMesh(skinMesh), 'Mesh under saga-skinned-wearables excluded');
check(rayMod.isFaceMappingAllowlistedMesh(bodyOk), 'Body without equipment ancestor still allowlisted');
check(
  rayMod.isUnderFaceMappingExcludedAncestor(helmetChild),
  'isUnderFaceMappingExcludedAncestor detects rigid-*',
);

const excludeParent = new THREE.Group();
excludeParent.name = 'Outfit';
excludeParent.userData = { sagadriveExcludeFaceMapping: true };
const excludeChild = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
excludeChild.name = 'Body';
excludeParent.add(excludeChild);
check(!rayMod.isFaceMappingAllowlistedMesh(excludeChild), 'Body under sagadriveExcludeFaceMapping excluded');

const helperParent = new THREE.Group();
helperParent.name = 'HelperRoot';
helperParent.userData = { isHelper: true };
const helperChild = new THREE.Mesh(geom.clone(), new THREE.MeshBasicMaterial());
helperChild.name = 'Body';
helperParent.add(helperChild);
check(!rayMod.isFaceMappingAllowlistedMesh(helperChild), 'Body under isHelper ancestor excluded');

// Fuzzy ancestor names must not trip isUnderFaceMappingExcludedAncestor.
check(
  !rayMod.isUnderFaceMappingExcludedAncestor(bodyUnderNamedParent('Character_Hair')),
  'Character_Hair is not an equipment ancestor',
);
check(
  !rayMod.isUnderFaceMappingExcludedAncestor(bodyUnderNamedParent('Chair')),
  'Chair is not an equipment ancestor',
);

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
