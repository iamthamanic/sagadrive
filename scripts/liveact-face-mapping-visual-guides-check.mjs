#!/usr/bin/env node
/**
 * liveact-face-mapping-visual-guides-check — Face-Rig Editor visual guides.
 * Location: scripts/liveact-face-mapping-visual-guides-check.mjs
 *
 * Feature slug: liveact-face-mapping-visual-guides
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
    console.error(`liveact-face-mapping-visual-guides-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const draftSrc = read('src/domains/character/avatar/face-mapping-draft-v1.ts');
const guideSrc = read('src/domains/character/avatar/face-mapping-guide-geometry.ts');
const raycastSrc = read('src/infrastructure/character/avatar/face-mapping-raycast.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const panel = read('src/app/character/liveact/FaceMappingAuthoringPanel.tsx');
const detail = read('src/app/character/liveact/FaceMappingDetailCard.tsx');
const layer = read('src/app/character/liveact/FaceMappingMarkerLayer.tsx');
const barrel = read('src/domains/character/avatar/index.ts');
const gate = read('scripts/test-gate.mjs');
const acceptance = read('.qa/acceptance/liveact-face-mapping-visual-guides.md');

// Binding DE labels (exact list — inner/outer = eye corners, not pupil).
check(/Innerer Augenwinkel/.test(draftSrc), 'label eye inner');
check(/Äußerer Augenwinkel/.test(draftSrc), 'label eye outer');
check(/Oberes Augenlid/.test(draftSrc), 'label eye upper');
check(/Unteres Augenlid/.test(draftSrc), 'label eye lower');
check(/Oberlippe Mitte/.test(draftSrc), 'label mouth upper');
check(/Unterlippe Mitte/.test(draftSrc), 'label mouth lower');
check(/Linker Mundwinkel/.test(draftSrc), 'label mouth corner L');
check(/Rechter Mundwinkel/.test(draftSrc), 'label mouth corner R');
check(/Inneres Ende/.test(draftSrc), 'label brow inner');
check(/Äußeres Ende/.test(draftSrc), 'label brow outer');
check(/Kinnmitte/.test(draftSrc), 'label chin');
check(/Stirnmitte/.test(draftSrc), 'label forehead');
check(/browLeft/.test(draftSrc) && /browRight/.test(draftSrc), 'brow L/R groups');

// Guide geometry domain (pure).
check(/buildFaceMappingGuidePaths/.test(guideSrc), 'guide paths builder');
check(/sampleCatmullRomSpline/.test(guideSrc), 'smooth Catmull-Rom');
check(/buildClosedQuadGuide/.test(guideSrc), 'closed eye/mouth guide');
check(/buildOpenTripleGuide/.test(guideSrc), 'open brow guide');
check(/resolveFaceMappingFeatureGroupDe/.test(guideSrc), 'feature group DE');
check(!/from ['"]three['"]/.test(guideSrc), 'guide domain pure (no three)');
check(!/from ['"]react['"]/.test(guideSrc), 'guide domain pure (no react)');
check(/face-mapping-guide-geometry/.test(barrel), 'barrel exports guides');

// Single raycast path — no second mapping implementation.
check(/raycastFaceMappingPointer/.test(raycastSrc), 'canonical raycast');
check(!/raycastFaceMappingPointer/.test(guideSrc), 'guides do not reimplement raycast');
check(/setFaceMappingAuthoringActive/.test(studio), 'studio authoring');
check(/applyCameraFrame\('face'\)/.test(studio), 'open frames face frontal');
check(/dollyFaceMappingCamera|minDistance = 0\.0[6-9]/.test(studio), 'face mapping close zoom');
check(/panFaceMappingCamera/.test(studio), 'face mapping pan');
check(/Scroll = zoomen|Scroll zoomen|verschieben/.test(layer) || /Scroll zoomen|verschieben/.test(panel), 'zoom/pan hint in UI');
check(/enableRotate = false/.test(studio) && /applyFaceMappingOrbitMode/.test(studio), 'rotate off zoom on');

// UI: pulse + detail + smooth guides + bidirectional select.
check(/FaceMappingDetailCard/.test(panel), 'panel hosts detail card');
check(/face-mapping-detail-card/.test(detail), 'detail testid');
check(/face-mapping-detail-pulse/.test(detail) && /FaceMappingFeatureIcon|face-mapping-feature-icon/.test(detail), 'detail feature silhouette + pulse');
check(/FaceMappingFeatureIcon/.test(panel), 'panel row feature icons');
check(/buildFaceMappingGuidePaths/.test(layer), 'layer uses domain guides');
check(/performance\.now\(\).*sin|Math\.sin\(performance\.now/.test(layer), 'viewport marker pulse');
check(/onSelectAnchor/.test(layer) && /onSelectAnchor/.test(controls), 'viewport → panel select');
check(/Valid hit only|leave last binding/.test(layer), 'drag keeps last valid');
check(/pointer-events-auto/.test(layer), 'overlay owns pointer events');
check(/setPointerCapture|grabbedExisting|select only/.test(layer), 'click selects without relocating');
check(/dollyFaceMappingCamera/.test(studio) && /wheel/.test(layer), 'overlay wheel zooms face');
check(/panFaceMappingCamera/.test(studio) && /panning/.test(layer), 'overlay empty-drag pans face');
check(/resetFaceMappingDraft/.test(controls), 'reset clears draft/selection');
check(/setFaceMappingAuthoringActive\(false\)/.test(controls), 'cancel clears authoring');
check(/setTrackingEnabled\(false\)/.test(controls), 'pauses tracking on open');
check(/setBonesEnabled\(false\)/.test(controls), 'pauses bones on open');
check(/setFaceOverlayEnabled\(false\)/.test(controls), 'pauses overlay on open');

check(/checkLiveActFaceMappingVisualGuides|liveact-face-mapping-visual-guides-check/.test(gate), 'test-gate');
check(/visual guides|Face-Rig|binding/.test(acceptance), 'acceptance');

const runsDir = join(root, '.qa/runs');
mkdirSync(runsDir, { recursive: true });
mkdirSync(join(root, '.qa/fixtures/liveact-face-mapping-visual-guides'), { recursive: true });

const guideOut = join(runsDir, 'liveact-face-mapping-guide-geometry-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-mapping-guide-geometry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: guideOut,
  logLevel: 'silent',
});
const guideMod = await import(`${guideOut}?t=${Date.now()}`);

const eye = guideMod.buildClosedQuadGuide(
  { x: 0, y: 0 },
  { x: 0.5, y: -0.4 },
  { x: 1, y: 0 },
  { x: 0.5, y: 0.4 },
  4,
);
check(eye.length >= 12, 'closed quad samples enough points');

const brow = guideMod.buildOpenTripleGuide({ x: 0, y: 0 }, { x: 0.5, y: -0.2 }, { x: 1, y: 0 }, 4);
check(brow.length >= 8, 'open triple samples enough points');
check(brow[0].x === 0 && brow[brow.length - 1].x === 1, 'brow ends at controls');

const screen = {
  eyeLeftInner: { x: 10, y: 20 },
  eyeLeftUpper: { x: 20, y: 10 },
  eyeLeftOuter: { x: 30, y: 20 },
  eyeLeftLower: { x: 20, y: 30 },
  mouthCornerLeft: { x: 40, y: 50 },
  mouthUpper: { x: 50, y: 40 },
  mouthCornerRight: { x: 60, y: 50 },
  mouthLower: { x: 50, y: 60 },
  browLeftInner: { x: 12, y: 5 },
  browLeftCenter: { x: 22, y: 2 },
  browLeftOuter: { x: 32, y: 5 },
  noseTip: { x: 50, y: 35 },
};
const paths = guideMod.buildFaceMappingGuidePaths(screen, 4);
check(paths.some((p) => p.kind === 'eyeLeft' && p.closed), 'eyeLeft closed guide');
check(paths.some((p) => p.kind === 'mouth' && p.closed), 'mouth closed guide');
check(paths.some((p) => p.kind === 'browLeft' && !p.closed), 'browLeft open guide');
check(!paths.some((p) => p.kind === 'eyeRight'), 'missing eyeRight skipped');
check(guideMod.resolveFaceMappingFeatureGroupDe('eyeRightOuter') === 'Rechtes Auge', 'feature DE');
check(guideMod.resolveFaceMappingFeatureGroupDe('mouthUpper') === 'Mund', 'mouth feature DE');

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
check(draftMod.FACE_MAPPING_MARKER_GROUP_DEFS.length === 6, '6 marker groups');
check(draftMod.FACE_MAPPING_ANCHOR_LABEL_DE.eyeLeftInner === 'Innerer Augenwinkel', 'binding label');
check(draftMod.FACE_MAPPING_ANCHOR_LABEL_DE.chin === 'Kinnmitte', 'chin binding label');
check(draftMod.FACE_MAPPING_ANCHOR_SHORT_DE.eyeLeftInner === 'Innen L', 'short DE inner');
const empty = draftMod.createEmptyFaceMappingDraft(null);
check(empty.selectedAnchorId === null, 'empty selection');
const reset = draftMod.resetFaceMappingDraft(
  draftMod.selectFaceMappingAnchor(empty, 'noseTip'),
);
check(reset.selectedAnchorId === null, 'reset clears selection');

writeFileSync(
  join(root, '.qa/fixtures/liveact-face-mapping-visual-guides/sample-guides.json'),
  `${JSON.stringify(
    {
      pathKinds: paths.map((p) => p.kind),
      eyeSampleCount: eye.length,
      browSampleCount: brow.length,
    },
    null,
    2,
  )}\n`,
);

console.log('liveact-face-mapping-visual-guides-check OK');
