/**
 * saga-human-canonical-v1/harness-core — shared browser scene of the LiveAct avatar harnesses.
 * Location: scripts/lib/saga-human-canonical-v1/harness-core.mjs
 *
 * Loads each avatar like CharacterStudioRuntime (VRMLoaderPlugin, VRMUtils steps, centerModel,
 * normalized head bone) and drives it through the real LiveAct VRM output (APPLIED stage).
 * Used by the pose sheet (pose-sheet-page.mjs) and the tracking round trip (roundtrip-page.mjs);
 * bundled for the browser by scripts/saga-human-canonical-v1-pose-sheet.mjs.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { evaluateFaceAnchorsManifest } from '../../../src/infrastructure/character/avatar/face-anchor-runtime';
import { createLiveActAvatarOutput } from '../../../src/infrastructure/character/liveact/liveact-avatar-output';
import { createNeutralLiveActFrame } from '../../../src/domains/character/liveact/liveact-contract';
import { LIVEACT_FACE_CHANNELS } from '../../../src/domains/character/liveact/liveact-face-contract';

export const TILE = 256;
const LABEL_H = 20;
const ROW_LABEL_W = 170;
const SETTLE_UPDATES = 3;
/** JPEG keeps committed evidence sheets in the repo's few-hundred-KB range (PNG: 1–2 MB each). */
const SHEET_TYPE = 'image/jpeg';
const SHEET_QUALITY = 0.85;
export const encodeSheet = (sheet) => sheet.canvas.toDataURL(SHEET_TYPE, SHEET_QUALITY);
/** Camera distance per framing (m, FOV 20°); targets come from the avatar's face anchors. */
export const FRAMINGS = { face: 0.62, eyes: 0.26, mouth: 0.24 };
const EYE_ANCHORS = ['Inner', 'Outer', 'Upper', 'Lower'].flatMap((p) => [`eyeLeft${p}`, `eyeRight${p}`]);
/** Midline lips only: mouth-corner anchors are the least reliable on arbitrary meshes. */
const MOUTH_ANCHORS = ['mouthUpper', 'mouthLower'];

// Same light rig as scripts/species-authoring-diag-render.mjs.
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(TILE, TILE, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2e);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xf0f4ff, 0x222228, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.35);
key.position.set(2.2, 3.5, 2.8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xdde4f0, 0.45);
fill.position.set(-2.0, 1.5, 1.5);
scene.add(fill);
export const camera = new THREE.PerspectiveCamera(20, 1, 0.01, 20);

/** Avatars of the current run; only the one being rendered is visible. */
export const loadedAvatars = [];

export async function loadAvatars(specs) {
  loadedAvatars.length = 0;
  for (const spec of specs) loadedAvatars.push(await prepareAvatar(spec));
  return loadedAvatars;
}

export function showOnly(av) {
  for (const other of loadedAvatars) other.container.visible = other === av;
}

/** Copy of CharacterStudioRuntime.centerModel: feet on y = 0, centered on x / z. */
function centerModel(root) {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= bounds.min.y;
  root.updateWorldMatrix(true, true);
}

async function prepareAvatar(spec) {
  const t0 = performance.now();
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(spec.url);
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error(`${spec.url}: not a VRM`);
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.combineMorphs(vrm);
  VRMUtils.rotateVRM0(vrm);
  const container = new THREE.Group();
  container.add(gltf.scene);
  scene.add(container);
  centerModel(gltf.scene);
  vrm.update(0);

  const humanoid = vrm.humanoid;
  const headBone = humanoid.getNormalizedBoneNode('head') ?? humanoid.getRawBoneNode('head') ?? null;
  const headRestQuaternion = new THREE.Quaternion();
  if (headBone) headRestQuaternion.copy(headBone.quaternion);
  const output = createLiveActAvatarOutput({
    root: gltf.scene,
    vrm,
    headBone,
    headRestQuaternion,
    headScratchEuler: new THREE.Euler(),
    headScratchQuaternion: new THREE.Quaternion(),
  });
  if (!output) throw new Error(`${spec.url}: no LiveAct output`);
  output.resetLiveActPose();
  settle(vrm);

  let triangles = 0;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  const expressionNames = new Set((vrm.expressionManager?.expressions ?? []).map((e) => e.expressionName));
  const leftEye = humanoid.getRawBoneNode('leftEye');
  const rawHead = humanoid.getRawBoneNode('head');
  gltf.scene.updateMatrixWorld(true);
  const anchors = await restAnchors(gltf.scene, spec.url);
  return {
    spec,
    vrm,
    container,
    output,
    expressionNames,
    leftEye,
    rawHead,
    eyeRestWorld: leftEye ? leftEye.getWorldQuaternion(new THREE.Quaternion()) : null,
    headRestWorld: rawHead ? rawHead.getWorldQuaternion(new THREE.Quaternion()) : null,
    anchors,
    loadMs: Math.round(performance.now() - t0),
    triangles: Math.round(triangles),
  };
}

/**
 * One app frame = vrm.update + the renderer's scene.updateMatrixWorld (three-vrm LookAt reads
 * the head matrixWorld without refreshing it, so the app sees last frame's head).
 */
export function tick(vrm) {
  vrm.update(1 / 60);
  scene.updateMatrixWorld();
}

function settle(vrm) {
  for (let k = 0; k < SETTLE_UPDATES; k += 1) tick(vrm);
}

/**
 * Rest-pose world positions of the avatar's committed face-anchor sidecar, evaluated with the
 * app's face-anchor runtime (same sidecar naming as face-anchors-manifest-url.ts).
 */
async function restAnchors(root, modelUrl) {
  const url = modelUrl.replace(/\.vrm$/, '-face-anchors.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} (face anchors required for framing)`);
  const { evaluations } = evaluateFaceAnchorsManifest(root, await res.json());
  const mean = (ids) => {
    const pts = ids.map((id) => evaluations[id]).filter((e) => e?.status === 'available');
    if (pts.length !== ids.length) throw new Error(`${url}: anchors unavailable among ${ids.join(', ')}`);
    return pts.reduce((acc, p) => acc.add(new THREE.Vector3(p.x, p.y, p.z)), new THREE.Vector3()).divideScalar(pts.length);
  };
  const eyes = mean(EYE_ANCHORS);
  const mouth = mean(MOUTH_ANCHORS);
  const all = Object.values(evaluations)
    .filter((e) => e?.status === 'available')
    .map((e) => new THREE.Vector3(e.x, e.y, e.z));
  return {
    eyes,
    mouth,
    face: eyes.clone().lerp(mouth, 0.5),
    eyeLeft: mean(EYE_ANCHORS.filter((id) => id.startsWith('eyeLeft'))),
    mouthCornerLeft: mean(['mouthCornerLeft']),
    all,
  };
}

let sequence = 0;
export function nextSequence() {
  sequence += 1;
  return sequence;
}

function frameFor(pose, seq) {
  const neutral = createNeutralLiveActFrame({ timestampMs: seq * 16, sequence: seq, trackingLost: false });
  const eyes = pose.eyes ?? { x: 0, y: 0 };
  return {
    ...neutral,
    confidence: 1,
    head: { yaw: 0, pitch: 0, roll: 0, ...(pose.head ?? {}) },
    eyeLeft: { ...eyes },
    eyeRight: { ...eyes },
    face: { ...neutral.face, ...(pose.face ?? {}) },
  };
}

/** A LiveActFrameV1 through the real VRM output, settled like consecutive app frames. */
export function applyFrame(av, frame, manual = {}) {
  for (let k = 0; k < SETTLE_UPDATES; k += 1) {
    av.output.applyLiveActFrame(frame);
    for (const [name, weight] of Object.entries(manual)) {
      if (av.expressionNames.has(name)) av.vrm.expressionManager.setValue(name, weight);
    }
    tick(av.vrm);
  }
}

export function applyPose(av, pose) {
  applyFrame(av, frameFor(pose, nextSequence()), pose.manual);
}

export function resetPose(av) {
  av.output.resetLiveActPose();
  settle(av.vrm);
}

export function renderTile(av, framingId) {
  const c = av.anchors[framingId];
  camera.position.set(c.x, c.y, c.z + FRAMINGS[framingId]);
  camera.lookAt(c);
  showOnly(av);
  renderer.render(scene, camera);
  return renderer.domElement;
}

export function measure(av) {
  const deg = THREE.MathUtils.radToDeg;
  const eyeDeg =
    av.leftEye && av.eyeRestWorld
      ? Number(deg(av.leftEye.getWorldQuaternion(new THREE.Quaternion()).angleTo(av.eyeRestWorld)).toFixed(2))
      : null;
  const headDeg =
    av.rawHead && av.headRestWorld
      ? Number(deg(av.rawHead.getWorldQuaternion(new THREE.Quaternion()).angleTo(av.headRestWorld)).toFixed(2))
      : null;
  const manager = av.vrm.expressionManager;
  const lookWeights = Object.fromEntries(
    ['lookLeft', 'lookRight', 'lookUp', 'lookDown']
      .filter((n) => av.expressionNames.has(n))
      .map((n) => [n, Number((manager.getValue(n) ?? 0).toFixed(3))]),
  );
  return {
    lookAtYawDeg: av.vrm.lookAt ? Number(av.vrm.lookAt.yaw.toFixed(2)) : null,
    lookAtPitchDeg: av.vrm.lookAt ? Number(av.vrm.lookAt.pitch.toFixed(2)) : null,
    leftEyeRotationDeg: eyeDeg,
    headRotationDeg: headDeg,
    ...(Object.keys(lookWeights).length ? { lookExpressionWeights: lookWeights } : {}),
  };
}

/** Driven by the LookAt gaze path (reported per gaze pose), not by face channels. */
export const LOOK_PRESETS = new Set(['lookLeft', 'lookRight', 'lookUp', 'lookDown']);
const bindMaxDelta = new WeakMap();
export function maxMorphDelta(morph) {
  if (!bindMaxDelta.has(morph)) {
    const v = new THREE.Vector3();
    let max = 0;
    for (let i = 0; i < morph.count; i += 1) max = Math.max(max, v.fromBufferAttribute(morph, i).length());
    bindMaxDelta.set(morph, max);
  }
  return bindMaxDelta.get(morph);
}

/** Expressions the output currently drives (neutral / look presets excluded). */
export function activeExpressions(av) {
  return (av.vrm.expressionManager?.expressions ?? []).filter(
    (expr) => expr.weight > 0 && expr.expressionName !== 'neutral' && !LOOK_PRESETS.has(expr.expressionName),
  );
}

/**
 * Black-box per-channel effect through the real runtime: drive one channel at 1.0, read which
 * expressions the output activated and the largest vertex displacement their morph binds cause.
 */
export function channelEffects(av) {
  const out = {};
  for (const channel of LIVEACT_FACE_CHANNELS) {
    if (channel === '_neutral') continue;
    applyPose(av, { face: { [channel]: 1 } });
    const expressions = [];
    let max = 0;
    for (const expr of activeExpressions(av)) {
      expressions.push(expr.expressionName);
      for (const bind of expr._binds ?? []) {
        for (const mesh of bind.primitives ?? []) {
          const morph = mesh.geometry.morphAttributes.position?.[bind.index];
          if (morph) max = Math.max(max, maxMorphDelta(morph) * bind.weight * expr.weight);
        }
      }
    }
    out[channel] = { expressions, maxDeltaMm: Number((max * 1000).toFixed(2)) };
    resetPose(av);
  }
  return out;
}

export function makeSheet(cols, rows, withRowLabels, tileW = TILE, tileH = TILE) {
  const canvas = document.createElement('canvas');
  const x0 = withRowLabels ? ROW_LABEL_W : 0;
  canvas.width = x0 + cols * tileW;
  canvas.height = rows * (tileH + LABEL_H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '13px sans-serif';
  ctx.textBaseline = 'middle';
  return {
    canvas,
    rowLabel(row, text) {
      ctx.fillStyle = '#e4e4e7';
      const y = row * (tileH + LABEL_H) + LABEL_H + tileH / 2;
      text.split('\n').forEach((line, i) => ctx.fillText(line, 8, y + i * 16 - 8));
    },
    tile(col, row, source, label, missing) {
      const x = x0 + col * tileW;
      const y = row * (tileH + LABEL_H);
      ctx.drawImage(source, x, y + LABEL_H, tileW, tileH);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText(label, x + 6, y + LABEL_H / 2);
      if (missing.length) {
        ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
        ctx.fillRect(x, y + LABEL_H + tileH - 22, tileW, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(`n/a: ${missing.join(', ')}`.slice(0, 40), x + 6, y + LABEL_H + tileH - 11);
      }
    },
  };
}
