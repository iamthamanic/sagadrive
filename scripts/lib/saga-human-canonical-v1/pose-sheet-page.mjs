/**
 * saga-human-canonical-v1/pose-sheet-page — browser side of the LiveAct pose-sheet harness.
 * Location: scripts/lib/saga-human-canonical-v1/pose-sheet-page.mjs
 *
 * Loads each avatar like CharacterStudioRuntime (VRMLoaderPlugin, VRMUtils steps, centerModel,
 * normalized head bone) and drives it through the real LiveAct VRM output with identical
 * LiveActFrameV1 poses (APPLIED stage; tracker / smoothing / calibration are camera-side).
 * Renders face tiles into sheets and returns PNG data URLs + measured facts.
 * Bundled for the browser by scripts/saga-human-canonical-v1-pose-sheet.mjs.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { evaluateFaceAnchorsManifest } from '../../../src/infrastructure/character/avatar/face-anchor-runtime';
import { createLiveActAvatarOutput } from '../../../src/infrastructure/character/liveact/liveact-avatar-output';
import { createNeutralLiveActFrame } from '../../../src/domains/character/liveact/liveact-contract';
import { LIVEACT_FACE_CHANNELS } from '../../../src/domains/character/liveact/liveact-face-contract';

const TILE = 256;
const LABEL_H = 20;
const ROW_LABEL_W = 170;
const SETTLE_UPDATES = 3;
/** JPEG keeps committed evidence sheets in the repo's few-hundred-KB range (PNG: 1–2 MB each). */
const SHEET_TYPE = 'image/jpeg';
const SHEET_QUALITY = 0.85;
const encodeSheet = (sheet) => sheet.canvas.toDataURL(SHEET_TYPE, SHEET_QUALITY);
/** Camera distance per framing (m, FOV 20°); targets come from the avatar's face anchors. */
const FRAMINGS = { face: 0.62, eyes: 0.26, mouth: 0.24 };
const EYE_ANCHORS = ['Inner', 'Outer', 'Upper', 'Lower'].flatMap((p) => [`eyeLeft${p}`, `eyeRight${p}`]);
/** Midline lips only: mouth-corner anchors are the least reliable on arbitrary meshes. */
const MOUTH_ANCHORS = ['mouthUpper', 'mouthLower'];

// Same light rig as scripts/species-authoring-diag-render.mjs.
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(TILE, TILE, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2e);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xf0f4ff, 0x222228, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.35);
key.position.set(2.2, 3.5, 2.8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xdde4f0, 0.45);
fill.position.set(-2.0, 1.5, 1.5);
scene.add(fill);
const camera = new THREE.PerspectiveCamera(20, 1, 0.01, 20);

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
    eyeLookTarget: new THREE.Vector3(),
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
function tick(vrm) {
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

/** Anchor dots drawn on top (no depth test) for the anchor-overlay QA tile. */
function anchorMarkers(points) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.0022, 8, 6);
  const material = new THREE.MeshBasicMaterial({ color: 0x22d3ee, depthTest: false });
  for (const p of points) {
    const dot = new THREE.Mesh(geometry, material);
    dot.position.copy(p);
    dot.renderOrder = 10;
    group.add(dot);
  }
  return group;
}

function frameFor(pose, sequence) {
  const neutral = createNeutralLiveActFrame({ timestampMs: sequence * 16, sequence, trackingLost: false });
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

let sequence = 0;
function applyPose(av, pose) {
  const frame = frameFor(pose, (sequence += 1));
  for (let k = 0; k < SETTLE_UPDATES; k += 1) {
    av.output.applyLiveActFrame(frame);
    for (const [name, weight] of Object.entries(pose.manual ?? {})) {
      if (av.expressionNames.has(name)) av.vrm.expressionManager.setValue(name, weight);
    }
    tick(av.vrm);
  }
}

function resetPose(av) {
  av.output.resetLiveActPose();
  settle(av.vrm);
}

function renderTile(av, framingId) {
  const c = av.anchors[framingId];
  camera.position.set(c.x, c.y, c.z + FRAMINGS[framingId]);
  camera.lookAt(c);
  for (const other of loadedAvatars) other.container.visible = other === av;
  renderer.render(scene, camera);
  return renderer.domElement;
}

/** Channels of a pose the avatar cannot show (LiveAct capability matrix / missing expression). */
function missingFor(av, pose) {
  const caps = av.output.getAvatarCapabilities();
  const missing = Object.keys(pose.face ?? {}).filter((id) => caps.avatarFace?.[id] !== true);
  for (const name of Object.keys(pose.manual ?? {})) {
    if (!av.expressionNames.has(name)) missing.push(`${name} (no expression)`);
  }
  if (pose.eyes && caps.gazeDrivePath === 'none') missing.push('gaze');
  return missing;
}

function measure(av) {
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

/** Where each expression's morph binds actually move vertices (mesh, count, max, centroid in mm). */
function expressionBindFacts(vrm, name) {
  const out = [];
  const v = new THREE.Vector3();
  for (const bind of vrm.expressionManager?.getExpression(name)?._binds ?? []) {
    for (const mesh of bind.primitives ?? []) {
      const morph = mesh.geometry.morphAttributes.position?.[bind.index];
      if (!morph) continue;
      let max = 0;
      for (let i = 0; i < morph.count; i += 1) max = Math.max(max, v.fromBufferAttribute(morph, i).length());
      const c = new THREE.Vector3();
      let moved = 0;
      for (let i = 0; i < morph.count; i += 1) {
        if (v.fromBufferAttribute(morph, i).length() < max * 0.3) continue;
        mesh.getVertexPosition(i, v);
        c.add(mesh.localToWorld(v));
        moved += 1;
      }
      if (moved) c.divideScalar(moved);
      out.push({
        mesh: mesh.name,
        weight: bind.weight,
        movedVertices: moved,
        maxDeltaMm: Number((max * 1000).toFixed(2)),
        centroidMm: c.toArray().map((x) => Math.round(x * 1000)),
      });
    }
  }
  return out;
}

const toMm = (v) => v.toArray().map((x) => Math.round(x * 1000));

/** Driven by the LookAt gaze path (reported per gaze pose), not by face channels. */
const LOOK_PRESETS = new Set(['lookLeft', 'lookRight', 'lookUp', 'lookDown']);
const bindMaxDelta = new WeakMap();
function maxMorphDelta(morph) {
  if (!bindMaxDelta.has(morph)) {
    const v = new THREE.Vector3();
    let max = 0;
    for (let i = 0; i < morph.count; i += 1) max = Math.max(max, v.fromBufferAttribute(morph, i).length());
    bindMaxDelta.set(morph, max);
  }
  return bindMaxDelta.get(morph);
}

/**
 * Black-box per-channel effect through the real runtime: drive one channel at 1.0, read which
 * expressions the output activated and the largest vertex displacement their morph binds cause.
 */
function channelEffects(av) {
  const out = {};
  for (const channel of LIVEACT_FACE_CHANNELS) {
    if (channel === '_neutral') continue;
    applyPose(av, { face: { [channel]: 1 } });
    const expressions = [];
    let max = 0;
    for (const expr of av.vrm.expressionManager?.expressions ?? []) {
      if (!expr.weight || expr.expressionName === 'neutral' || LOOK_PRESETS.has(expr.expressionName)) continue;
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

/** Distance from the dominant bind's moved-vertex centroid to the anchor it should move (mm). */
function regionOffsetMm(bindFacts, anchor) {
  const main = [...bindFacts].sort((a, b) => b.movedVertices - a.movedVertices)[0];
  if (!main?.movedVertices) return null;
  const [x, y, z] = main.centroidMm;
  const [ax, ay, az] = toMm(anchor);
  return { mesh: main.mesh, distance: Math.round(Math.hypot(x - ax, y - ay, z - az)), dy: y - ay };
}

function lookAtFacts(vrm) {
  const la = vrm.lookAt;
  if (!la) return null;
  const a = la.applier;
  const map = (m) => (m ? { inputMaxValue: m.inputMaxValue, outputScale: m.outputScale } : null);
  return {
    type: a?.constructor?.type ?? 'unknown',
    offsetFromHeadBone: la.offsetFromHeadBone.toArray().map((v) => Number(v.toFixed(4))),
    rangeMapHorizontalOuter: map(a?.rangeMapHorizontalOuter),
    rangeMapVerticalUp: map(a?.rangeMapVerticalUp),
  };
}

function makeSheet(cols, rows, withRowLabels) {
  const canvas = document.createElement('canvas');
  const x0 = withRowLabels ? ROW_LABEL_W : 0;
  canvas.width = x0 + cols * TILE;
  canvas.height = rows * (TILE + LABEL_H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '13px sans-serif';
  ctx.textBaseline = 'middle';
  return {
    canvas,
    rowLabel(row, text) {
      ctx.fillStyle = '#e4e4e7';
      const y = row * (TILE + LABEL_H) + LABEL_H + TILE / 2;
      text.split('\n').forEach((line, i) => ctx.fillText(line, 8, y + i * 16 - 8));
    },
    tile(col, row, source, label, missing) {
      const x = x0 + col * TILE;
      const y = row * (TILE + LABEL_H);
      ctx.drawImage(source, x, y + LABEL_H, TILE, TILE);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText(label, x + 6, y + LABEL_H / 2);
      if (missing.length) {
        ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
        ctx.fillRect(x, y + LABEL_H + TILE - 22, TILE, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(`n/a: ${missing.join(', ')}`.slice(0, 40), x + 6, y + LABEL_H + TILE - 11);
      }
    },
  };
}

let loadedAvatars = [];

async function run(config) {
  loadedAvatars = [];
  for (const spec of config.avatars) loadedAvatars.push(await prepareAvatar(spec));
  const poseById = new Map(config.matrix.map((p) => [p.id, p]));
  const images = {};
  const report = { tilePx: TILE, framings: FRAMINGS, avatars: {} };

  const renderPose = (av, pose, framing) => {
    applyPose(av, pose);
    const facts = measure(av);
    const source = renderTile(av, framing);
    return { facts, source, missing: missingFor(av, pose) };
  };

  const sheet11 = makeSheet(config.sheet11.length, loadedAvatars.length, true);
  const closeups = makeSheet(config.closeups.length, loadedAvatars.length, true);
  const anchorSheet = makeSheet(loadedAvatars.length, 1, false);
  loadedAvatars.forEach((av, col) => {
    const markers = anchorMarkers(av.anchors.all);
    scene.add(markers);
    anchorSheet.tile(col, 0, renderTile(av, 'face'), `${av.spec.labelDe.split('\n')[0]}: face anchors`, []);
    scene.remove(markers);
  });
  images['face-anchors'] = encodeSheet(anchorSheet);
  loadedAvatars.forEach((av, row) => {
    const caps = av.output.getAvatarCapabilities();
    const supported = Object.entries(caps.avatarFace ?? {}).filter(([, ok]) => ok === true).map(([id]) => id);
    const binds = Object.fromEntries(
      ['blinkLeft', 'lookLeft', 'jawOpen', 'mouthSmileLeft'].map((n) => [n, expressionBindFacts(av.vrm, n)]),
    );
    const entry = {
      url: av.spec.url,
      loadMs: av.loadMs,
      triangles: av.triangles,
      expressionCount: av.expressionNames.size,
      hasTongueOutExpression: av.expressionNames.has('tongueOut'),
      gazeDrivePath: caps.gazeDrivePath,
      supportedFaceChannels: supported.length,
      lookAt: lookAtFacts(av.vrm),
      anchorsMm: { eyes: toMm(av.anchors.eyes), mouth: toMm(av.anchors.mouth) },
      binds,
      morphRegionToAnchorMm: {
        blinkLeft: regionOffsetMm(binds.blinkLeft, av.anchors.eyeLeft),
        lookLeft: regionOffsetMm(binds.lookLeft, av.anchors.eyeLeft),
        mouthSmileLeft: regionOffsetMm(binds.mouthSmileLeft, av.anchors.mouthCornerLeft),
      },
      channelEffects: channelEffects(av),
      poses: {},
    };
    report.avatars[av.spec.id] = entry;

    const label = `${av.spec.labelDe}\n${supported.length} Kanäle · Gaze: ${caps.gazeDrivePath}`;
    sheet11.rowLabel(row, label);
    closeups.rowLabel(row, label);
    const matrix = makeSheet(8, Math.ceil(config.matrix.length / 8), false);
    config.matrix.forEach((pose, i) => {
      const r = renderPose(av, pose, 'face');
      matrix.tile(i % 8, Math.floor(i / 8), r.source, pose.label, r.missing);
      entry.poses[pose.id] = { missing: r.missing, ...r.facts };
      resetPose(av);
    });
    images[`matrix-${av.spec.id}`] = encodeSheet(matrix);

    config.sheet11.forEach((id, col) => {
      const pose = poseById.get(id);
      const r = renderPose(av, pose, 'face');
      sheet11.tile(col, row, r.source, pose.label, r.missing);
      resetPose(av);
    });
    config.closeups.forEach((c, col) => {
      const pose = poseById.get(c.pose);
      const r = renderPose(av, pose, c.framing);
      closeups.tile(col, row, r.source, c.label, r.missing);
      resetPose(av);
    });
  });
  images['pose-sheet-11'] = encodeSheet(sheet11);
  images.closeups = encodeSheet(closeups);
  report.webgl = renderer.getContext().getParameter(renderer.getContext().VERSION);
  return { images, report };
}

window.__poseSheet = { run };
window.__poseSheetReady = true;
