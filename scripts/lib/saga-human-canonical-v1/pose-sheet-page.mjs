/**
 * saga-human-canonical-v1/pose-sheet-page — browser entry of the LiveAct avatar harnesses.
 * Location: scripts/lib/saga-human-canonical-v1/pose-sheet-page.mjs
 *
 * Pose sheet: every avatar gets identical LiveActFrameV1 poses through the real LiveAct VRM
 * output (APPLIED stage; tracker / smoothing / calibration are camera-side) and is rendered into
 * face tiles, mouth close-ups per lip channel and sheets, returned as JPEG data URLs + measured
 * facts. The tracking round trip lives in roundtrip-page.mjs; both share harness-core.mjs.
 * Bundled for the browser by scripts/saga-human-canonical-v1-pose-sheet.mjs.
 */

import * as THREE from 'three';
import {
  FRAMINGS,
  TILE,
  applyPose,
  channelEffects,
  encodeSheet,
  loadAvatars,
  makeSheet,
  measure,
  renderTile,
  renderer,
  resetPose,
  scene,
} from './harness-core.mjs';
import { roundtrip } from './roundtrip-page.mjs';

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
    rangeMapVerticalDown: map(a?.rangeMapVerticalDown),
  };
}

/** Mouth close-ups are smaller than face tiles: 25 channels per avatar stay one readable sheet. */
const MOUTH_TILE = 192;
const MOUTH_COLS = 5;

async function run(config) {
  const avatars = await loadAvatars(config.avatars);
  const poseById = new Map(config.matrix.map((p) => [p.id, p]));
  const images = {};
  const report = { tilePx: TILE, mouthTilePx: MOUTH_TILE, framings: FRAMINGS, avatars: {} };

  const renderPose = (av, pose, framing) => {
    applyPose(av, pose);
    const facts = measure(av);
    const source = renderTile(av, framing);
    return { facts, source, missing: missingFor(av, pose) };
  };

  const sheet11 = makeSheet(config.sheet11.length, avatars.length, true);
  const closeups = makeSheet(config.closeups.length, avatars.length, true);
  const anchorSheet = makeSheet(avatars.length, 1, false);
  avatars.forEach((av, col) => {
    const markers = anchorMarkers(av.anchors.all);
    scene.add(markers);
    anchorSheet.tile(col, 0, renderTile(av, 'face'), `${av.spec.labelDe.split('\n')[0]}: face anchors`, []);
    scene.remove(markers);
  });
  images['face-anchors'] = encodeSheet(anchorSheet);
  avatars.forEach((av, row) => {
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

    const mouth = makeSheet(MOUTH_COLS, Math.ceil(config.mouthAudit.length / MOUTH_COLS), false, MOUTH_TILE, MOUTH_TILE);
    config.mouthAudit.forEach((pose, i) => {
      const r = renderPose(av, pose, 'mouth');
      mouth.tile(i % MOUTH_COLS, Math.floor(i / MOUTH_COLS), r.source, pose.label, r.missing);
      resetPose(av);
    });
    images[`mouth-channels-${av.spec.id}`] = encodeSheet(mouth);
  });
  images['pose-sheet-11'] = encodeSheet(sheet11);
  images.closeups = encodeSheet(closeups);
  report.webgl = renderer.getContext().getParameter(renderer.getContext().VERSION);
  return { images, report };
}

window.__poseSheet = { run, roundtrip };
window.__poseSheetReady = true;
