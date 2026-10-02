/**
 * Face Agent Review capture harness — implements __SAGA_FACE_AGENT_REVIEW_CAPTURE__.
 * Location: public/face-agent-review-capture.mjs
 *
 * Loads candidate GLB + SagaDriveFaceAnchorsV1 (triangle/barycentric), resolves
 * world positions on the mesh, draws 21 labeled markers, poses camera for the
 * seven evidence views. Served by face-anchor-agent-review-evidence-capture --harness.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const statusEl = document.getElementById('status');
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('stage'));

const params = new URLSearchParams(location.search);
const modelUrl = params.get('model') || '';
const anchorsUrl = params.get('anchors') || '';

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  alpha: false,
});
renderer.setSize(1280, 720, false);
renderer.setPixelRatio(1);
renderer.setClearColor(0x0b1020, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1280 / 720, 0.01, 100);

scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(0.6, 2.2, 1.4);
scene.add(key);

/** @type {THREE.Object3D | null} */
let root = null;
/** @type {THREE.Group} */
const markers = new THREE.Group();
scene.add(markers);

/** @type {Record<string, THREE.Vector3>} */
const anchorPositions = {};

/** Face framing center derived from resolved markers. */
const faceCenter = new THREE.Vector3(0, 1.42, 0);
let faceSpan = 0.18;

const ANCHOR_IDS = [
  'mouthUpper',
  'mouthLower',
  'mouthCornerLeft',
  'mouthCornerRight',
  'eyeLeftInner',
  'eyeLeftOuter',
  'eyeLeftUpper',
  'eyeLeftLower',
  'eyeRightInner',
  'eyeRightOuter',
  'eyeRightUpper',
  'eyeRightLower',
  'browLeftInner',
  'browLeftOuter',
  'browLeftCenter',
  'browRightInner',
  'browRightOuter',
  'browRightCenter',
  'noseTip',
  'chin',
  'forehead',
];

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function clearMarkers() {
  while (markers.children.length) {
    const child = markers.children.pop();
    if (!child) break;
    child.geometry?.dispose?.();
    if (child.material?.map) child.material.map.dispose?.();
    child.material?.dispose?.();
  }
}

function addLabeledMarker(id, position) {
  const geom = new THREE.SphereGeometry(Math.max(0.004, faceSpan * 0.035), 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff4d6d, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(position);
  mesh.name = id;
  mesh.renderOrder = 10;
  markers.add(mesh);

  const canvas2 = document.createElement('canvas');
  canvas2.width = 256;
  canvas2.height = 64;
  const ctx = canvas2.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px monospace';
    ctx.fillText(id, 8, 40);
  }
  const tex = new THREE.CanvasTexture(canvas2);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }),
  );
  sprite.scale.set(faceSpan * 0.9, faceSpan * 0.22, 1);
  sprite.position.copy(position).add(new THREE.Vector3(0, faceSpan * 0.08, 0));
  sprite.renderOrder = 11;
  markers.add(sprite);
}

/**
 * Find a mesh whose name / parent chain matches nodeIdentity.
 * @param {THREE.Object3D} sceneRoot
 * @param {string} nodeIdentity
 */
function findMeshByIdentity(sceneRoot, nodeIdentity) {
  const target = String(nodeIdentity || '').trim();
  if (!target) return null;
  /** @type {THREE.Mesh | null} */
  let found = null;
  sceneRoot.traverse((obj) => {
    if (found || !obj.isMesh) return;
    if (obj.name === target || obj.parent?.name === target) {
      found = /** @type {THREE.Mesh} */ (obj);
    }
  });
  if (found) return found;
  // Fallback: first SkinnedMesh / Mesh in scene (single-body avatars).
  sceneRoot.traverse((obj) => {
    if (found || !obj.isMesh) return;
    found = /** @type {THREE.Mesh} */ (obj);
  });
  return found;
}

/**
 * Resolve SagaDriveFaceAnchorsV1 triangle/barycentric binding to world position.
 * @param {THREE.Mesh} mesh
 * @param {{ primitiveIndex?: number; triangleIndex?: number; barycentric?: { u?: number; v?: number; w?: number } }} binding
 */
function resolveBindingWorldPosition(mesh, binding) {
  const geom = mesh.geometry;
  if (!geom?.attributes?.position) return null;
  const posAttr = geom.attributes.position;
  const index = geom.index;
  const tri = typeof binding.triangleIndex === 'number' ? binding.triangleIndex : -1;
  if (tri < 0) return null;
  const bary = binding.barycentric || { u: 1 / 3, v: 1 / 3, w: 1 / 3 };
  const u = Number(bary.u);
  const v = Number(bary.v);
  const w = Number(bary.w);
  if (![u, v, w].every(Number.isFinite)) return null;

  let i0;
  let i1;
  let i2;
  if (index) {
    const base = tri * 3;
    if (base + 2 >= index.count) return null;
    i0 = index.getX(base);
    i1 = index.getX(base + 1);
    i2 = index.getX(base + 2);
  } else {
    i0 = tri * 3;
    i1 = i0 + 1;
    i2 = i0 + 2;
    if (i2 >= posAttr.count) return null;
  }

  const a = new THREE.Vector3().fromBufferAttribute(posAttr, i0);
  const b = new THREE.Vector3().fromBufferAttribute(posAttr, i1);
  const c = new THREE.Vector3().fromBufferAttribute(posAttr, i2);
  const local = new THREE.Vector3()
    .set(0, 0, 0)
    .addScaledVector(a, u)
    .addScaledVector(b, v)
    .addScaledVector(c, w);
  mesh.updateWorldMatrix(true, false);
  return local.applyMatrix4(mesh.matrixWorld);
}

function recomputeFaceFraming() {
  const pts = Object.values(anchorPositions);
  if (!pts.length) return;
  const box = new THREE.Box3();
  for (const p of pts) box.expandByPoint(p);
  box.getCenter(faceCenter);
  const size = new THREE.Vector3();
  box.getSize(size);
  faceSpan = Math.max(0.12, Math.max(size.x, size.y) * 0.55);
}

function applyView(cfg) {
  const yaw = ((cfg.yawDeg || 0) * Math.PI) / 180;
  const pitch = ((cfg.pitchDeg || 0) * Math.PI) / 180;
  const framing = cfg.framing || 'face';
  let distance = faceSpan * 3.2;
  let target = faceCenter.clone();
  let fov = 35;
  if (framing === 'eyes_brows') {
    distance = faceSpan * 1.55;
    target = faceCenter.clone().add(new THREE.Vector3(0, faceSpan * 0.35, 0));
    fov = 28;
  } else if (framing === 'mouth_nose') {
    distance = faceSpan * 1.85;
    target = faceCenter.clone().add(new THREE.Vector3(0, -faceSpan * 0.12, 0));
    fov = 30;
  }
  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance,
  );
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  // Keep key light near camera for stable shading.
  key.position.copy(camera.position).add(new THREE.Vector3(0.4, 0.6, 0.2));
  renderer.render(scene, camera);
}

async function loadAnchors(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`anchors fetch failed: ${res.status}`);
  const json = await res.json();
  const anchors = json.anchors || json;
  clearMarkers();
  Object.keys(anchorPositions).forEach((k) => delete anchorPositions[k]);

  for (const [id, entry] of Object.entries(anchors)) {
    if (!entry || typeof entry !== 'object') continue;
    let pos = null;
    if (Array.isArray(entry.position) && entry.position.length >= 3) {
      pos = new THREE.Vector3(entry.position[0], entry.position[1], entry.position[2]);
    } else if (
      typeof entry.x === 'number' &&
      typeof entry.y === 'number' &&
      typeof entry.z === 'number'
    ) {
      pos = new THREE.Vector3(entry.x, entry.y, entry.z);
    } else if (entry.world && Array.isArray(entry.world) && entry.world.length >= 3) {
      pos = new THREE.Vector3(entry.world[0], entry.world[1], entry.world[2]);
    } else if (root && typeof entry.triangleIndex === 'number') {
      const mesh = findMeshByIdentity(root, String(entry.nodeIdentity || ''));
      if (mesh) pos = resolveBindingWorldPosition(mesh, entry);
    }
    if (!pos) continue;
    anchorPositions[id] = pos;
  }

  // Do NOT invent placeholder chest markers — missing bindings stay missing.
  recomputeFaceFraming();
  for (const [id, pos] of Object.entries(anchorPositions)) {
    addLabeledMarker(id, pos);
  }
}

async function loadModel(url) {
  if (!url) return;
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  if (root) scene.remove(root);
  root = gltf.scene;
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (obj.isMesh) obj.frustumCulled = false;
  });
  scene.add(root);
}

async function boot() {
  try {
    setStatus('loading model/anchors');
    if (modelUrl) await loadModel(modelUrl);
    if (anchorsUrl) await loadAnchors(anchorsUrl);
    else await loadAnchors('data:application/json,{"anchors":{}}');
    applyView({ yawDeg: 0, pitchDeg: 0, framing: 'face' });
    const resolved = Object.keys(anchorPositions).length;
    setStatus(`ready markers=${resolved}`);
    window.__SAGA_FACE_AGENT_REVIEW_CAPTURE_READY__ = resolved === 21;
    if (resolved !== 21) {
      console.error(`[capture] expected 21 resolved anchors, got ${resolved}`);
    }
  } catch (error) {
    console.error(error);
    setStatus(`error: ${error instanceof Error ? error.message : String(error)}`);
    window.__SAGA_FACE_AGENT_REVIEW_CAPTURE_READY__ = false;
  }
}

window.__SAGA_FACE_AGENT_REVIEW_CAPTURE__ = async function capture(cfg) {
  applyView(cfg || {});
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return {
    ok: true,
    view: cfg?.view || 'unknown',
    markerCount: Object.keys(anchorPositions).length,
  };
};

await boot();
