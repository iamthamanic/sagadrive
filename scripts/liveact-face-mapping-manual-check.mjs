#!/usr/bin/env node
/**
 * liveact-face-mapping-manual-check — Face Setup manual mapping (#420).
 * Location: scripts/liveact-face-mapping-manual-check.mjs
 *
 * Feature slug: liveact-face-mapping-manual
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
    console.error(`liveact-face-mapping-manual-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const draftSrc = read('src/domains/character/avatar/face-mapping-draft-v1.ts');
const raycastSrc = read('src/infrastructure/character/avatar/face-mapping-raycast.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const settings = read('src/app/character/avatar/AvatarPreviewSettings.tsx');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const panel = read('src/app/character/liveact/FaceMappingAuthoringPanel.tsx');
const layer = read('src/app/character/liveact/FaceMappingMarkerLayer.tsx');
const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const barrel = read('src/domains/character/avatar/index.ts');
const gate = read('scripts/test-gate.mjs');
const acceptance = read('.qa/acceptance/liveact-face-mapping-manual.md');

check(/SagaDriveFaceMappingDraftV1/.test(draftSrc), 'draft contract');
check(/FACE_MAPPING_MARKER_GROUP_DEFS/.test(draftSrc), 'marker groups');
check(/resolveFaceMappingMarkerStatus/.test(draftSrc), 'marker status');
check(/faceMappingDraftToManifest/.test(draftSrc), 'draft → manifest');
check(!/from ['"]three['"]/.test(draftSrc), 'draft domain pure');
check(!/from ['"]react['"]/.test(draftSrc), 'draft no React');

check(/raycastFaceMappingPointer/.test(raycastSrc), 'raycast helper');
check(/isFaceMappingAllowlistedMesh/.test(raycastSrc), 'mesh allowlist');
check(/barycentric/.test(raycastSrc), 'barycentric binding');
check(/EXCLUDE_NAME_RE|sagadriveExcludeFaceMapping/.test(raycastSrc), 'exclude helpers');

check(/setFaceMappingAuthoringActive/.test(studio), 'studio authoring mode');
check(/raycastFaceMappingAtCanvas/.test(studio), 'studio raycast API');
check(/bindFaceAnchorsManifestSession/.test(studio), 'session bind');
check(/getFaceAnchorsManifest/.test(studio), 'get manifest');

check(/face-setup-section/.test(settings), 'Face Setup section');
check(/Face Mapping öffnen/.test(settings), 'open action DE');
check(/FaceMappingAuthoringPanel/.test(controls), 'controls compose panel');
check(/FaceMappingMarkerLayer/.test(controls), 'controls compose markers');
check(/createPortal/.test(controls), 'panel portals below canvas');
check(/face-mapping-panel-host/.test(surface), 'panel host under canvas');
check(/belowViewportSlot|data-avatar-below-viewport/.test(surface), 'host slotted under 3D frame');
check(/belowViewportSlot/.test(read('src/app/character/avatar/AvatarCanvas.tsx')), 'AvatarCanvas belowViewportSlot');
check(/createEmptyFaceMappingDraft/.test(controls), 'draft lifecycle');
check(/Übernehmen/.test(panel), 'apply CTA');
check(/text-white/.test(panel), 'selected marker white text');
check(/FACE_MAPPING_ANCHOR_SHORT_DE/.test(draftSrc), 'short overlay labels');
check(/drawLabel|FACE_MAPPING_ANCHOR_SHORT_DE/.test(layer), '3D marker labels painted');
check(/drawModeBanner|Face Mapping/.test(layer), 'mode banner');
check(/HIT_RADIUS_PX = 28|HIT_RADIUS_PX = 2[4-9]/.test(layer), 'generous drag hit radius');
check(/requestAnimationFrame/.test(layer), 'imperative marker paint');
check(/drawGuidePaths|buildFaceMappingGuidePaths/.test(layer), 'lip/contour guides');
check(/setOrbitControlsEnabled/.test(layer) && /setOrbitControlsEnabled/.test(studio), 'drag disables orbit');
check(!/setDraft\(/.test(layer), 'layer no draft setState');

check(/face-mapping-draft-v1/.test(barrel), 'barrel export');
check(/checkLiveActFaceMappingManual|liveact-face-mapping-manual-check/.test(gate), 'test-gate');
check(/Face Mapping|SagaDriveFaceMappingDraftV1/.test(acceptance), 'acceptance');

const runsDir = join(root, '.qa/runs');
mkdirSync(runsDir, { recursive: true });
mkdirSync(join(root, '.qa/fixtures/liveact-face-mapping-manual'), { recursive: true });

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
check(draftMod.FACE_MAPPING_MARKER_GROUP_DEFS.length === 6, '6 groups');
const empty = draftMod.createEmptyFaceMappingDraft(null);
check(empty.dirty === false && empty.selectedAnchorId === null, 'empty draft');
check(draftMod.resolveFaceMappingMarkerStatus(empty, 'mouthUpper') === 'missing', 'missing status');

const withBinding = draftMod.setFaceMappingDraftBinding(empty, 'mouthUpper', {
  nodeIdentity: 'Face',
  primitiveIndex: 0,
  triangleIndex: 0,
  barycentric: { u: 0.5, v: 0.25, w: 0.25 },
});
check(draftMod.resolveFaceMappingMarkerStatus(withBinding, 'mouthUpper') === 'set', 'set status');
const manifest = draftMod.faceMappingDraftToManifest(withBinding);
check(manifest.anchors.mouthUpper?.nodeIdentity === 'Face', 'manifest has mouthUpper');
check(Object.keys(manifest.anchors).length === 1, 'only set anchors exported');

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
  new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]), 3),
);
geom.setIndex([0, 1, 2]);
const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
mesh.name = 'HeadMesh';
const rootObj = new THREE.Group();
rootObj.add(mesh);
rootObj.updateMatrixWorld(true);

check(rayMod.isFaceMappingAllowlistedMesh(mesh), 'head mesh allowlisted');
const hair = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
hair.name = 'Hair_Front';
check(!rayMod.isFaceMappingAllowlistedMesh(hair), 'hair excluded');
check(rayMod.collectFaceMappingRaycastMeshes(rootObj).length === 1, 'one raycast mesh');

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0.5, 0.4, 2);
camera.lookAt(0.5, 0.3, 0);
camera.updateProjectionMatrix();

const hit = rayMod.raycastFaceMappingPointer({
  camera,
  root: rootObj,
  canvasWidth: 200,
  canvasHeight: 200,
  canvasX: 100,
  canvasY: 100,
});
check(hit !== null, 'raycast hits face mesh');
check(hit.binding.nodeIdentity === 'HeadMesh', 'nodeIdentity from mesh name');
check(Number.isInteger(hit.binding.triangleIndex), 'triangleIndex int');
check(
  typeof hit.binding.barycentric.u === 'number' &&
    typeof hit.binding.barycentric.v === 'number' &&
    typeof hit.binding.barycentric.w === 'number',
  'barycentric present',
);

writeFileSync(
  join(root, '.qa/fixtures/liveact-face-mapping-manual/sample-binding.json'),
  `${JSON.stringify(hit.binding, null, 2)}\n`,
);

console.log('liveact-face-mapping-manual-check OK');
