/**
 * saga-human-canonical-v1/roundtrip-page — browser side of the LiveAct tracking round trip.
 * Location: scripts/lib/saga-human-canonical-v1/roundtrip-page.mjs
 *
 * 1. Conventions: known poses rendered as unmirrored webcam frames and tracked with the app's
 *    MediaPipe Face Landmarker (first-party WASM/model) + LiveAct sample mapping — head axes,
 *    left/right and gaze sign are measured instead of assumed.
 * 2. Left/right chain: a RAW user action → MAPPED (anatomical vs. mirrored orientation) →
 *    APPLIED expressions / bones → the screen side the geometry moves to.
 * 3. Channel audit: every face channel at 1.0 → APPLIED expressions, morph displacement and what
 *    the tracker reads back from the render (proxy for "can a webcam see this morph").
 * 4. Stage transfer: the engine's smoothing step on sine / step inputs (real domain functions).
 * Node side (poses, verdicts): scripts/lib/liveact-tracking-roundtrip-eval.mjs.
 */

import * as THREE from 'three';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import {
  MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH,
  MEDIAPIPE_VISION_WASM_PATH,
} from '../../../src/infrastructure/character/liveact/mediapipe-face-source';
import {
  DEFAULT_LIVEACT_LIMITS,
  createEmptyLiveActSourceSample,
  createNeutralLiveActFrame,
  mapLiveActSourceSample,
} from '../../../src/domains/character/liveact/liveact-contract';
import { stepLiveActCalibratedFrame } from '../../../src/domains/character/liveact/liveact-calibration';
import { LIVEACT_FACE_CHANNELS } from '../../../src/domains/character/liveact/liveact-face-contract';
import { isLiveActEyeLookFaceChannel } from '../../../src/domains/character/liveact/liveact-gaze-path';
import {
  LIVEACT_MIRROR_AVATAR,
  mapMediaPipeFaceToLiveActSample,
  mirrorLiveActSourceSample,
} from '../../../src/domains/character/liveact/liveact-mediapipe-sample';
import {
  LOOK_PRESETS,
  TILE,
  activeExpressions,
  applyFrame,
  applyPose,
  camera,
  channelEffects,
  encodeSheet,
  loadAvatars,
  makeSheet,
  maxMorphDelta,
  measure,
  nextSequence,
  renderer,
  resetPose,
  scene,
  showOnly,
} from './harness-core.mjs';

/** Webcam-like capture (4:3, 40° vertical FOV, 0.5 m to the face). */
const WEBCAM = { width: 640, height: 480, fovDeg: 40, distance: 0.5 };
const ROUNDTRIP_TILE = { width: 200, height: 150 };
/** Blendshapes reported per convention pose (MediaPipe names = LiveAct channel ids). */
const REPORTED_BLENDSHAPES = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookOutLeft',
  'eyeLookInLeft',
  'eyeLookOutRight',
  'eyeLookInRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'jawOpen',
  'jawLeft',
  'jawRight',
  'mouthLeft',
  'mouthRight',
  'mouthSmileLeft',
  'mouthSmileRight',
];
/** Moved-vertex selection per bind: the same 30 % of max as the pose sheet's bind facts. */
const MOVED_VERTEX_FRACTION = 0.3;
const round3 = (v) => Number(v.toFixed(3));
const deg1 = (rad) => Number(THREE.MathUtils.radToDeg(rad).toFixed(1));

/** Same first-party assets as the app; IMAGE mode + CPU because every frame is a still render. */
async function createRoundtripLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_VISION_WASM_PATH);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH, delegate: 'CPU' },
    runningMode: 'IMAGE',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
}

function placeWebcam(av) {
  const c = av.anchors.face;
  camera.position.set(c.x, c.y, c.z + WEBCAM.distance);
  camera.lookAt(c);
  camera.updateMatrixWorld();
}

/** Unmirrored frame, like the raw webcam pixels MediaPipe receives in the app (CSS mirror is display-only). */
function renderWebcamFrame(av, target) {
  placeWebcam(av);
  showOnly(av);
  renderer.render(scene, camera);
  target.getContext('2d').drawImage(renderer.domElement, 0, 0);
  return target;
}

function detect(landmarker, frame) {
  const result = landmarker.detect(frame);
  const categories = result.faceBlendshapes?.[0]?.categories ?? [];
  if (!categories.length) return null;
  return {
    categories,
    scores: new Map(categories.map((c) => [c.categoryName, c.score])),
    matrix: result.facialTransformationMatrixes?.[0]?.data ?? null,
  };
}

function trackFrame(landmarker, frame) {
  const d = detect(landmarker, frame);
  if (!d) return { detected: false };
  // RAW (anatomical): the rendered avatar plays the user, so the sample must reproduce its own pose.
  const sample = mapMediaPipeFaceToLiveActSample({
    categories: d.categories,
    matrix: d.matrix,
    enableHeadPose: true,
    faceIndex: 0,
    faceCount: 1,
  });
  // Independent reference decomposition (three.js, scale removed) next to the app mapping.
  let matrixYXZDeg = null;
  let matrixScale = null;
  if (d.matrix) {
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    new THREE.Matrix4().fromArray(Array.from(d.matrix)).decompose(new THREE.Vector3(), q, s);
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    matrixYXZDeg = { yaw: deg1(e.y), pitch: deg1(e.x), roll: deg1(e.z) };
    matrixScale = s.toArray().map(round3);
  }
  return {
    detected: true,
    categoryCount: d.categories.length,
    hasTongueOut: d.scores.has('tongueOut'),
    blendshapes: Object.fromEntries(REPORTED_BLENDSHAPES.map((n) => [n, round3(d.scores.get(n) ?? 0)])),
    matrixYXZDeg,
    matrixScale,
    sample: {
      headDeg: { yaw: deg1(sample.headYaw), pitch: deg1(sample.headPitch), roll: deg1(sample.headRoll) },
      eyeLeft: { x: round3(sample.eyeLeftX), y: round3(sample.eyeLeftY) },
      eyeRight: { x: round3(sample.eyeRightX), y: round3(sample.eyeRightY) },
      face: Object.fromEntries(REPORTED_BLENDSHAPES.map((n) => [n, round3(sample.face[n] ?? 0)])),
    },
  };
}

/**
 * Gaze input that turns this avatar's eyes by `deg` — measured through the real output (full
 * input once; the range map is linear below its input maximum). Null without rotating eye bones.
 */
function gazeInputForDeg(av, axis, deg) {
  if (!deg) return 0;
  applyPose(av, { eyes: { x: 0, y: 0, [axis]: Math.sign(deg) } });
  const fullDeg = measure(av).leftEyeRotationDeg;
  resetPose(av);
  if (!fullDeg) return null;
  return Math.sign(deg) * Math.min(1, Math.abs(deg) / fullDeg);
}

function resolvePose(av, pose) {
  if (!pose.gazeDeg) return pose;
  const x = gazeInputForDeg(av, 'x', pose.gazeDeg.x ?? 0);
  const y = gazeInputForDeg(av, 'y', pose.gazeDeg.y ?? 0);
  if (x === null || y === null) {
    return { ...pose, eyes: { x: Math.sign(pose.gazeDeg.x ?? 0), y: Math.sign(pose.gazeDeg.y ?? 0) } };
  }
  return { ...pose, eyes: { x, y } };
}

function rawSample(fields) {
  return {
    ...createEmptyLiveActSourceSample(),
    presence: 1,
    faceIndex: 0,
    faceCount: 1,
    ...fields,
    face: { ...(fields.face ?? {}) },
  };
}

function morphNameOf(mesh, index) {
  const dict = mesh.morphTargetDictionary ?? {};
  return Object.keys(dict).find((name) => dict[name] === index) ?? `#${index}`;
}

/** Vertices the expressions move (≥ 30 % of their bind's max), weighted by expression × bind. */
function movedMorphVertices(expressions) {
  const v = new THREE.Vector3();
  const picks = [];
  for (const expr of expressions) {
    for (const bind of expr._binds ?? []) {
      for (const mesh of bind.primitives ?? []) {
        const morph = mesh.geometry.morphAttributes.position?.[bind.index];
        const max = morph ? maxMorphDelta(morph) : 0;
        if (!(max > 0)) continue;
        const indices = [];
        for (let i = 0; i < morph.count; i += 1) {
          if (v.fromBufferAttribute(morph, i).length() >= max * MOVED_VERTEX_FRACTION) indices.push(i);
        }
        picks.push({ mesh, indices, weight: expr.weight * bind.weight, label: `${mesh.name}:${morphNameOf(mesh, bind.index)}` });
      }
    }
  }
  return picks;
}

function worldVertices(picks) {
  return picks.map(({ mesh, indices }) =>
    indices.map((i) => mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3()))),
  );
}

/** Unit-axis change below which a head / eye bone counts as not rotated. */
const ROTATION_FLOOR = 1e-3;

/** Weighted moved-vertex centroid relative to the face, or mean displacement; leaves the avatar reset. */
function morphEffect(av, expressions, relativeToFace) {
  const picks = movedMorphVertices(expressions);
  const on = worldVertices(picks);
  resetPose(av);
  const off = worldVertices(picks);
  const sum = new THREE.Vector3();
  let total = 0;
  picks.forEach((pick, k) => {
    on[k].forEach((pos, j) => {
      sum.addScaledVector(pos.clone().sub(relativeToFace ? av.anchors.face : off[k][j]), pick.weight);
      total += pick.weight;
    });
  });
  return {
    kind: 'morph',
    vector: total > 0 ? sum.divideScalar(total) : null,
    morphs: picks.map((p) => p.label).slice(0, 4),
  };
}

/**
 * World-space effect of the applied frame that decides the screen side: moved-vertex centroid
 * (which eye / mouth corner), mean vertex displacement (jaw / lips moving sideways) or the
 * rotated head / eye axis — expression-type LookAt moves the eyes through the look presets'
 * morphs instead of bones. Leaves the avatar reset.
 */
function effectVector(av, probe) {
  if (probe === 'morphPosition' || probe === 'morphDirection') {
    return morphEffect(av, activeExpressions(av), probe === 'morphPosition');
  }
  const eye = probe === 'eyeForward';
  const node = eye ? av.leftEye : av.rawHead;
  const rest = eye ? av.eyeRestWorld : av.headRestWorld;
  let vector = null;
  if (node && rest) {
    const delta = node.getWorldQuaternion(new THREE.Quaternion()).multiply(rest.clone().invert());
    const axis = probe === 'headUp' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    vector = axis.clone().applyQuaternion(delta).sub(axis);
  }
  if (eye && !(vector && vector.length() > ROTATION_FLOOR)) {
    const looks = (av.vrm.expressionManager?.expressions ?? []).filter(
      (expr) => expr.weight > 0 && LOOK_PRESETS.has(expr.expressionName),
    );
    if (looks.length) return morphEffect(av, looks, false);
  }
  resetPose(av);
  return { kind: 'rotation', vector, morphs: [] };
}

/** One RAW user action through orientation → mapping → the real output; where it shows on screen. */
function probeAction(av, action, orientation) {
  const raw = rawSample(action.raw);
  const oriented = orientation === 'mirrored' ? mirrorLiveActSourceSample(raw) : raw;
  const seq = nextSequence();
  const frame = mapLiveActSourceSample(oriented, { timestampMs: seq * 16, sequence: seq });
  placeWebcam(av);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  applyFrame(av, frame);
  const mapped = Object.entries(frame.face)
    .filter(([id, value]) => id !== '_neutral' && value > 0)
    .map(([id]) => id);
  const applied = [
    ...activeExpressions(av),
    ...(av.vrm.expressionManager?.expressions ?? []).filter((e) => e.weight > 0 && LOOK_PRESETS.has(e.expressionName)),
  ].map((e) => e.expressionName);
  const { kind, vector, morphs } = effectVector(av, action.probe);
  const vertical = action.pip === 'up' || action.pip === 'down';
  const value = vector ? vector.dot(vertical ? up : right) : 0;
  // Morph effects in metres (0.1 mm floor), rotations as unit-axis deltas.
  const floor = kind === 'morph' ? 1e-4 : ROTATION_FLOOR;
  const screen =
    Math.abs(value) < floor ? null : vertical ? (value > 0 ? 'up' : 'down') : value > 0 ? 'right' : 'left';
  return {
    mapped,
    mappedGaze: { x: round3(frame.eyeLeft.x), y: round3(frame.eyeLeft.y) },
    mappedHead: { yaw: round3(frame.head.yaw), pitch: round3(frame.head.pitch), roll: round3(frame.head.roll) },
    applied,
    morphs,
    // The avatar faces the camera (+Z): its own left (+X) is screen right.
    avatarSide: vector && !vertical && screen ? (vector.x > 0 ? 'avatar-left' : 'avatar-right') : null,
    screen,
    value: round3(kind === 'morph' ? value * 1000 : value),
  };
}

function lrChain(av, actions) {
  return Object.fromEntries(
    actions.map((action) => [
      action.id,
      { anatomical: probeAction(av, action, 'anatomical'), mirrored: probeAction(av, action, 'mirrored') },
    ]),
  );
}

/** VRM expression settings that quantize or suppress a channel (binary weight, overrides). */
function expressionFlags(av, names) {
  const flags = [];
  for (const name of names) {
    const expr = av.vrm.expressionManager?.getExpression(name);
    if (!expr) continue;
    if (expr.isBinary) flags.push(`${name}: binary`);
    for (const key of ['overrideBlink', 'overrideLookAt', 'overrideMouth']) {
      if (expr[key] && expr[key] !== 'none') flags.push(`${name}: ${key}=${expr[key]}`);
    }
  }
  return flags.length ? { flags } : {};
}

/** ARKit mouthClose only means something with an open jaw: measured on top of jawOpen .5. */
const CHANNEL_AUDIT_BASE = { mouthClose: { jawOpen: 0.5 } };

/** Every face channel at 1.0: APPLIED expressions + morph size, and the tracker's reading of it. */
function channelAudit(landmarker, av, frame) {
  const effects = channelEffects(av);
  const gazeViaPose = av.output.getAvatarCapabilities().gazeDrivePath !== 'morphs';
  const detectFace = (face) => {
    applyPose(av, { face });
    const result = detect(landmarker, renderWebcamFrame(av, frame));
    resetPose(av);
    return result;
  };
  const neutral = detectFace({});
  const baseDetections = new Map();
  const neutralFor = (channel) => {
    const base = CHANNEL_AUDIT_BASE[channel];
    if (!base) return neutral;
    const key = JSON.stringify(base);
    if (!baseDetections.has(key)) baseDetections.set(key, detectFace(base));
    return baseDetections.get(key);
  };
  const channels = {};
  for (const channel of LIVEACT_FACE_CHANNELS) {
    if (channel === '_neutral') continue;
    const entry = {
      expressions: effects[channel].expressions,
      maxDeltaMm: effects[channel].maxDeltaMm,
      ...expressionFlags(av, effects[channel].expressions),
    };
    if (isLiveActEyeLookFaceChannel(channel) && gazeViaPose) {
      channels[channel] = { ...entry, viaLookAt: true };
      continue;
    }
    const base = CHANNEL_AUDIT_BASE[channel];
    if (base) entry.base = base;
    const reference = neutralFor(channel);
    if (!entry.expressions.length || !reference) {
      channels[channel] = entry;
      continue;
    }
    const driven = detectFace({ ...(base ?? {}), [channel]: 1 });
    if (!driven) {
      channels[channel] = { ...entry, tracked: { detected: false } };
      continue;
    }
    const delta = (id) => round3((driven.scores.get(id) ?? 0) - (reference.scores.get(id) ?? 0));
    const crosstalk = [...driven.scores.keys()]
      .filter((id) => id !== channel && id !== '_neutral')
      .map((id) => [id, delta(id)])
      .filter(([, d]) => d >= 0.1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    channels[channel] = {
      ...entry,
      tracked: {
        detected: true,
        value: round3(driven.scores.get(channel) ?? 0),
        delta: delta(channel),
        crosstalk: Object.fromEntries(crosstalk),
      },
    };
  }
  return {
    neutralScores: neutral ? Object.fromEntries([...neutral.scores].map(([k, v]) => [k, round3(v)])) : null,
    channels,
  };
}

/** The engine's smoothing step (no calibration) on sine / step inputs at the desktop frame rate. */
function stageTransfer() {
  const fps = DEFAULT_LIVEACT_LIMITS.desktopFps;
  const empty = { neutral: null, range: null };
  const simulate = (valueAt, frames) => {
    let step = null;
    const input = [];
    const output = [];
    for (let i = 0; i < frames; i += 1) {
      const base = createNeutralLiveActFrame({ timestampMs: (i * 1000) / fps, sequence: i + 1, trackingLost: false });
      const value = valueAt(i);
      step = stepLiveActCalibratedFrame(step, { ...base, confidence: 1, face: { ...base.face, jawOpen: value } }, empty);
      input.push(value);
      output.push(step.calibrated.face.jawOpen);
    }
    return { input, output };
  };
  const span = (values) => Math.max(...values) - Math.min(...values);
  const sineAmplitudeRatio = {};
  for (const hz of [1, 2, 3, 5, 8]) {
    const { input, output } = simulate((i) => 0.5 + 0.5 * Math.sin((2 * Math.PI * hz * i) / fps), 4 * fps);
    sineAmplitudeRatio[`${hz}Hz`] = round3(span(output.slice(-2 * fps)) / span(input.slice(-2 * fps)));
  }
  const { output } = simulate((i) => (i === 0 ? 0 : 1), fps);
  const frames90 = output.findIndex((v) => v >= 0.9);
  return {
    smoothAlpha: DEFAULT_LIVEACT_LIMITS.smooth,
    fps,
    sineAmplitudeRatio,
    step90Ms: frames90 > 0 ? Math.round(((frames90 - 1) * 1000) / fps) : null,
  };
}

/** CharacterStudioRuntime camera framings (fitCamera / fitRegionCamera constants, FOV 30°). */
const APP_CAMERA_FOV_DEG = 30;
const APP_REGION_FRAMINGS = {
  face: { bandMin: 0.78, bandMax: 1, heightScale: 0.55, boneYBias: -0.04, minDistance: 0.45 },
  portrait: { bandMin: 0.45, bandMax: 1, heightScale: 0.72, boneYBias: -0.18, minDistance: 0.85 },
};

/**
 * Elevation of the app camera seen from the rest eye line (deg; negative = camera below the
 * eyes, so a straight-ahead gaze passes above the viewer). Neutral gaze is head-forward by design.
 */
function appFramingEyeElevationDeg(av) {
  const bounds = new THREE.Box3().setFromObject(av.container);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(APP_CAMERA_FOV_DEG) / 2);
  const eyes = av.anchors.eyes;
  const elevation = (cameraY, distance) => deg1(Math.atan2(cameraY - eyes.y, distance));
  const fullDistance = Math.max(1.6, (size.y * 0.58) / tanHalf);
  const out = { full: elevation(center.y * 0.98, fullDistance * 1.08) };
  const head = av.rawHead?.getWorldPosition(new THREE.Vector3());
  for (const [id, f] of Object.entries(APP_REGION_FRAMINGS)) {
    const regionHeight = Math.max(0.2, size.y * (f.bandMax - f.bandMin));
    const targetY = head ? head.y + regionHeight * f.boneYBias : bounds.min.y + size.y * ((f.bandMin + f.bandMax) / 2);
    const distance = Math.max(f.minDistance, (regionHeight * f.heightScale) / tanHalf);
    out[id] = elevation(targetY + regionHeight * 0.02, distance);
  }
  return out;
}

export async function roundtrip(config) {
  const avatars = await loadAvatars(config.avatars);
  const landmarker = await createRoundtripLandmarker();
  const frame = document.createElement('canvas');
  frame.width = WEBCAM.width;
  frame.height = WEBCAM.height;
  const sheet = makeSheet(config.roundtrip.length, avatars.length, true, ROUNDTRIP_TILE.width, ROUNDTRIP_TILE.height);
  const report = {
    webcam: WEBCAM,
    appMirrorsAvatar: LIVEACT_MIRROR_AVATAR,
    stageTransfer: stageTransfer(),
    avatars: {},
  };
  renderer.setSize(WEBCAM.width, WEBCAM.height, false);
  camera.fov = WEBCAM.fovDeg;
  camera.aspect = WEBCAM.width / WEBCAM.height;
  camera.updateProjectionMatrix();
  try {
    avatars.forEach((av, row) => {
      sheet.rowLabel(row, av.spec.labelDe);
      const poses = {};
      config.roundtrip.forEach((spec, col) => {
        const pose = resolvePose(av, spec);
        applyPose(av, pose);
        const { leftEyeRotationDeg, lookAtYawDeg, lookAtPitchDeg } = measure(av);
        renderWebcamFrame(av, frame);
        const tracked = trackFrame(landmarker, frame);
        sheet.tile(col, row, frame, spec.label, tracked.detected ? [] : ['kein Gesicht erkannt']);
        poses[spec.id] = {
          applied: { eyes: pose.eyes ?? null, leftEyeRotationDeg, lookAtYawDeg, lookAtPitchDeg },
          ...tracked,
        };
        resetPose(av);
      });
      report.avatars[av.spec.id] = {
        url: av.spec.url,
        gazeDrivePath: av.output.getAvatarCapabilities().gazeDrivePath,
        appFramingEyeElevationDeg: appFramingEyeElevationDeg(av),
        poses,
        lrChain: lrChain(av, config.lrActions),
        channelAudit: channelAudit(landmarker, av, frame),
      };
    });
  } finally {
    landmarker.close();
    renderer.setSize(TILE, TILE, false);
    camera.fov = 20;
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  return { images: { 'roundtrip-frames': encodeSheet(sheet) }, report };
}
