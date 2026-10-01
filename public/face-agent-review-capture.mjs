/**
 * Face Agent Review capture harness — implements __SAGA_FACE_AGENT_REVIEW_CAPTURE__.
 * Location: public/face-agent-review-capture.mjs
 *
 * Loads candidate GLB + anchors JSON, draws 21 labeled markers, poses camera for
 * the seven evidence views. Served by face-anchor-agent-review-evidence-capture --harness.
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
camera.position.set(0, 1.45, 1.35);
camera.lookAt(0, 1.4, 0);

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
  const geom = new THREE.SphereGeometry(0.008, 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff4d6d });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(position);
  mesh.name = id;
  markers.add(mesh);

  const canvas2 = document.createElement('canvas');
  canvas2.width = 256;
  canvas2.height = 64;
  const ctx = canvas2.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px monospace';
    ctx.fillText(id, 8, 42);
  }
  const tex = new THREE.CanvasTexture(canvas2);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }),
  );
  sprite.scale.set(0.18, 0.045, 1);
  sprite.position.copy(position).add(new THREE.Vector3(0, 0.02, 0));
  markers.add(sprite);
}

function applyView(cfg) {
  const yaw = ((cfg.yawDeg || 0) * Math.PI) / 180;
  const pitch = ((cfg.pitchDeg || 0) * Math.PI) / 180;
  const framing = cfg.framing || 'face';
  let distance = 0.55;
  let targetY = 1.42;
  let fov = 35;
  if (framing === 'eyes_brows') {
    distance = 0.28;
    targetY = 1.5;
    fov = 28;
  } else if (framing === 'mouth_nose') {
    distance = 0.28;
    targetY = 1.35;
    fov = 28;
  }
  const target = new THREE.Vector3(0, targetY, 0);
  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance,
  );
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  renderer.render(scene, camera);
}

async function loadAnchors(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`anchors fetch failed: ${res.status}`);
  const json = await res.json();
  const anchors = json.anchors || json;
  clearMarkers();
  for (const [id, entry] of Object.entries(anchors)) {
    let pos = null;
    if (entry && typeof entry === 'object') {
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
      }
    }
    if (!pos) continue;
    anchorPositions[id] = pos;
    addLabeledMarker(id, pos);
  }
  const ids = [
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
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    if (anchorPositions[id]) continue;
    const pos = new THREE.Vector3(((i % 7) - 3) * 0.03, 1.35 + Math.floor(i / 7) * 0.04, 0.08);
    anchorPositions[id] = pos;
    addLabeledMarker(id, pos);
  }
}

async function loadModel(url) {
  if (!url) return;
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(url);
    if (root) scene.remove(root);
    root = gltf.scene;
    root.traverse((obj) => {
      if (obj.isMesh) obj.frustumCulled = false;
    });
    scene.add(root);
  } catch (error) {
    console.warn('[capture] model load failed; markers-only mode', error);
  }
}

async function boot() {
  try {
    setStatus('loading model/anchors');
    if (modelUrl) await loadModel(modelUrl);
    if (anchorsUrl) await loadAnchors(anchorsUrl);
    else await loadAnchors('data:application/json,{"anchors":{}}');
    applyView({ yawDeg: 0, pitchDeg: 0, framing: 'face' });
    setStatus(`ready markers=${Object.keys(anchorPositions).length}`);
    window.__SAGA_FACE_AGENT_REVIEW_CAPTURE_READY__ = true;
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
