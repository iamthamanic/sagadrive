#!/usr/bin/env node
/**
 * liveact-face-functional-morph-author-check — behavioral checks for GT-aware morph author (#423).
 * Location: scripts/liveact-face-functional-morph-author-check.mjs
 *
 * Milestone 1: jawOpen. Milestone 2: eyeBlinkLeft / eyeBlinkRight + jawOpen hash immutability.
 * Uses synthetic fixtures (not production assets). No QA threshold mutation.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { FACE_ANCHORS_CONTRACT_VERSION } from './lib/liveact-face-anchor-ids.mjs';
import { FACE_MAPPING_AUTHORING_CONTRACT_VERSION } from './lib/liveact-face-mapping-authoring.mjs';
import {
  computeFaceAssetSha256Hex,
  computeFaceAssetTopologyFingerprint,
} from './lib/liveact-face-functional-validate.mjs';
import {
  authorLiveActFunctionalMorph,
  hashAllMorphPositionBuffers,
} from './lib/liveact-face-functional-morph-author.mjs';
import {
  FACE_FUNCTIONAL_MORPH_AUTHOR_CONTRACT_VERSION,
  FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1,
} from './lib/liveact-face-functional-morph-profile-v1.mjs';
import {
  buildGtBoundSurfaceGate,
  buildPrimitiveAdjacency,
  resolveCoupledFacialPatches,
} from './lib/liveact-face-functional-morph-surface.mjs';
import { buildFaceLocalFrame } from './lib/liveact-face-functional-validate.mjs';
import { resolveFaceAnchorPositions } from './lib/liveact-face-anchor-anatomy-validate.mjs';
import { JAW_OPEN_AUTHOR_CONTRACT_V1 } from './lib/liveact-face-functional-morph-profile-v1.mjs';

const io = new NodeIO();
let failed = 0;

function check(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`OK: ${msg}`);
  }
}

/**
 * Dense enough mouth/chin/forehead grid for neighborhood falloff.
 * Anchors bind to dedicated triangles (barycentric u=1).
 */
async function buildFixtureGlb() {
  /** @type {number[]} */
  const positions = [];
  /** @type {number[]} */
  const indices = [];
  /** @type {Record<string, number>} */
  const triByAnchor = {};

  function addTri(ax, ay, az, label) {
    const base = positions.length / 3;
    positions.push(ax, ay, az, ax + 0.03, ay, az, ax, ay + 0.03, az);
    indices.push(base, base + 1, base + 2);
    if (label) triByAnchor[label] = indices.length / 3 - 1;
    return base;
  }

  // Anchor landmarks (face-like layout, Y up, Z forward)
  addTri(0, 1.7, 0.2, 'forehead');
  addTri(-0.05, 1.62, 0.19, 'browLeftInner');
  addTri(-0.09, 1.63, 0.18, 'browLeftCenter');
  addTri(-0.13, 1.61, 0.17, 'browLeftOuter');
  addTri(0.05, 1.62, 0.19, 'browRightInner');
  addTri(0.09, 1.63, 0.18, 'browRightCenter');
  addTri(0.13, 1.61, 0.17, 'browRightOuter');
  addTri(-0.12, 1.55, 0.18, 'eyeLeftOuter');
  addTri(-0.06, 1.55, 0.2, 'eyeLeftInner');
  addTri(-0.09, 1.58, 0.19, 'eyeLeftUpper');
  addTri(-0.09, 1.52, 0.19, 'eyeLeftLower');
  addTri(0.12, 1.55, 0.18, 'eyeRightOuter');
  addTri(0.06, 1.55, 0.2, 'eyeRightInner');
  addTri(0.09, 1.58, 0.19, 'eyeRightUpper');
  addTri(0.09, 1.52, 0.19, 'eyeRightLower');
  addTri(0, 1.45, 0.22, 'noseTip');
  addTri(0, 1.32, 0.2, 'mouthUpper');
  addTri(0, 1.26, 0.2, 'mouthLower');
  addTri(-0.08, 1.29, 0.18, 'mouthCornerLeft');
  addTri(0.08, 1.29, 0.18, 'mouthCornerRight');
  addTri(0, 1.12, 0.16, 'chin');
  // Dense jaw/mouth fill for falloff (no labels)
  for (let yi = 0; yi < 8; yi += 1) {
    for (let xi = -4; xi <= 4; xi += 1) {
      const x = xi * 0.025;
      const y = 1.12 + yi * 0.025;
      const z = 0.15 + (yi < 3 ? 0.02 : 0);
      addTri(x, y, z, null);
    }
  }
  // Dense brow band filler
  for (let xi = -5; xi <= 5; xi += 1) {
    for (let yi = 0; yi < 3; yi += 1) {
      addTri(xi * 0.025, 1.6 + yi * 0.015, 0.18, null);
    }
  }
  // Dense left/right lid neighborhoods for blink falloff
  for (const side of [-1, 1]) {
    for (let yi = 0; yi < 5; yi += 1) {
      for (let xi = 0; xi < 4; xi += 1) {
        const x = side * (0.06 + xi * 0.02);
        const y = 1.5 + yi * 0.02;
        addTri(x, y, 0.19, null);
      }
    }
  }
  // Upper-face filler near nose/forehead (should stay ~0 under jawOpen)
  for (let yi = 0; yi < 4; yi += 1) {
    for (let xi = -2; xi <= 2; xi += 1) {
      addTri(xi * 0.03, 1.45 + yi * 0.04, 0.18, null);
    }
  }
  // Disconnected "chest/spine shell" inside Euclidean chin radius — MUST stay zero under jawOpen.
  // Intentionally NOT edge-connected to the face grid. Not an anchor (unknown ids fail validation).
  addTri(0, 1.1, 0.16, null);
  const disconnectedChestVertexBase = positions.length / 3 - 3;

  const doc = new Document();
  const buffer = doc.createBuffer();
  const posAcc = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(positions))
    .setBuffer(buffer);
  const idxAcc = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint32Array(indices))
    .setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', posAcc).setIndices(idxAcc);
  prim.setMaterial(doc.createMaterial('face'));

  const vertexCount = positions.length / 3;
  const morphNames = [
    'jawOpen',
    'eyeBlinkLeft',
    'eyeBlinkRight',
    'browInnerUp',
    'mouthSmileLeft',
    'mouthSmileRight',
    'mouthPucker',
    'mouthFrownLeft',
  ];
  for (const name of morphNames) {
    const deltas = new Float32Array(vertexCount * 3);
    if (name === 'jawOpen') {
      // Bad ICT-like: whole mouth block translates together (no gap) + nose leak
      for (let i = 0; i < vertexCount; i += 1) {
        const y = positions[i * 3 + 1];
        if (y > 1.2 && y < 1.5) {
          deltas[i * 3] = 0.02;
          deltas[i * 3 + 2] = 0.03;
        }
        if (y > 1.4) deltas[i * 3 + 1] = 0.01; // forehead/nose leak
      }
    } else if (name === 'eyeBlinkLeft') {
      deltas[0] = 0.001; // tiny nonzero so hash unique
    }
    const deltaAcc = doc.createAccessor().setType('VEC3').setArray(deltas).setBuffer(buffer);
    prim.addTarget(doc.createPrimitiveTarget().setAttribute('POSITION', deltaAcc));
  }
  prim.setExtras({ targetNames: morphNames });
  const mesh = doc.createMesh('FaceMesh').addPrimitive(prim);
  mesh.setExtras({ targetNames: morphNames });

  const joints = doc
    .createAccessor()
    .setType('VEC4')
    .setArray(new Uint16Array(vertexCount * 4).fill(0))
    .setBuffer(buffer);
  const weightArr = new Float32Array(vertexCount * 4);
  for (let v = 0; v < vertexCount; v += 1) weightArr[v * 4] = 1;
  const weights = doc.createAccessor().setType('VEC4').setArray(weightArr).setBuffer(buffer);
  prim.setAttribute('JOINTS_0', joints).setAttribute('WEIGHTS_0', weights);
  const joint = doc.createNode('Hips');
  const skin = doc.createSkin('skin').addJoint(joint).setSkeleton(joint);
  const faceNode = doc.createNode('FaceMesh').setMesh(mesh).setSkin(skin);
  doc.createScene().addChild(faceNode).addChild(joint);

  /** @type {Record<string, unknown>} */
  const anchors = {};
  for (const [id, tri] of Object.entries(triByAnchor)) {
    anchors[id] = {
      nodeIdentity: 'FaceMesh',
      primitiveIndex: 0,
      triangleIndex: tri,
      barycentric: { u: 1, v: 0, w: 0 },
    };
  }
  // Fill remaining ids if missing (should not be needed for core brow/eye)
  for (const id of []) {
    if (!anchors[id]) {
      anchors[id] = {
        nodeIdentity: 'FaceMesh',
        primitiveIndex: 0,
        triangleIndex: triByAnchor.forehead,
        barycentric: { u: 1, v: 0, w: 0 },
      };
    }
  }

  return {
    bytes: Buffer.from(await io.writeBinary(doc)),
    anchors: { contractVersion: FACE_ANCHORS_CONTRACT_VERSION, anchors },
    disconnectedChestVertexBase,
  };
}

/**
 * Fixture for Coupled Facial Shell Contract: connected primary mouth surface +
 * coincident facial secondary (neck), body-majority shell (spine), single-coincide,
 * GT-far shell, and a tertiary shell near secondary (must not receive recursive coupling).
 */
async function buildCoupledShellFixtureGlb() {
  /** @type {number[]} */
  const positions = [];
  /** @type {number[]} */
  const indices = [];
  /** @type {number[]} */
  const jointIdx = [];
  /** @type {Record<string, number>} */
  const triByAnchor = {};

  const JOINT_NECK = 1;
  const JOINT_SPINE = 2;

  function pushVert(x, y, z, joint = 0) {
    const i = positions.length / 3;
    positions.push(x, y, z);
    jointIdx.push(joint);
    return i;
  }

  /** Shared-vertex grid → one connected primary component. */
  const cols = 12;
  const rows = 8;
  /** @type {number[][]} */
  const grid = [];
  for (let r = 0; r < rows; r += 1) {
    /** @type {number[]} */
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      const x = (c - (cols - 1) / 2) * 0.018;
      const y = 1.2 + r * 0.018;
      const z = 0.2;
      row.push(pushVert(x, y, z, 0));
    }
    grid.push(row);
  }
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = grid[r][c];
      const b = grid[r][c + 1];
      const cc = grid[r + 1][c];
      const d = grid[r + 1][c + 1];
      indices.push(a, b, cc, b, d, cc);
    }
  }

  function nearestGridTri(tx, ty) {
    let best = Infinity;
    let bi = 0;
    let bj = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const i = grid[r][c];
        const dx = positions[i * 3] - tx;
        const dy = positions[i * 3 + 1] - ty;
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          bi = r;
          bj = c;
        }
      }
    }
    const r0 = Math.min(bi, rows - 2);
    const c0 = Math.min(bj, cols - 2);
    // triangle index among primary quads (2 tris per cell, row-major)
    return (r0 * (cols - 1) + c0) * 2;
  }

  triByAnchor.mouthUpper = nearestGridTri(0, 1.32);
  triByAnchor.mouthLower = nearestGridTri(0, 1.26);
  triByAnchor.mouthCornerLeft = nearestGridTri(-0.08, 1.29);
  triByAnchor.mouthCornerRight = nearestGridTri(0.08, 1.29);
  triByAnchor.chin = nearestGridTri(0, 1.2);
  triByAnchor.noseTip = nearestGridTri(0, 1.34);
  // Raised forehead landmark (extra verts) so faceH matches production-scale thresholds.
  const foreheadV = pushVert(0, 1.55, 0.18, 0);
  const foreheadV1 = pushVert(0.03, 1.55, 0.18, 0);
  const foreheadV2 = pushVert(0, 1.58, 0.18, 0);
  indices.push(foreheadV, foreheadV1, foreheadV2);
  // Bridge forehead into primary via a connecting strip so surface gate can include it if seeded —
  // keep disconnected for faceH only (anchors bind this tri).
  triByAnchor.forehead = Math.floor(indices.length / 3) - 1;
  for (const id of [
    'browLeftInner',
    'browLeftCenter',
    'browLeftOuter',
    'browRightInner',
    'browRightCenter',
    'browRightOuter',
    'eyeLeftOuter',
    'eyeLeftInner',
    'eyeLeftUpper',
    'eyeLeftLower',
    'eyeRightOuter',
    'eyeRightInner',
    'eyeRightUpper',
    'eyeRightLower',
  ]) {
    triByAnchor[id] = nearestGridTri(id.includes('Left') ? -0.06 : 0.06, 1.33);
  }

  // Secondary facial shell: coincident with primary bottom edge, extends down (neck-skinned)
  /** @type {number[]} */
  const secondarySeamVerts = [];
  /** @type {number[][]} */
  const secGrid = [];
  const secRows = 5;
  for (let r = 0; r < secRows; r += 1) {
    /** @type {number[]} */
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      const x = (c - (cols - 1) / 2) * 0.018;
      const y = 1.2 - r * 0.018;
      const z = 0.2;
      const i = pushVert(x, y, z, JOINT_NECK);
      row.push(i);
      if (r === 0) secondarySeamVerts.push(i);
    }
    secGrid.push(row);
  }
  for (let r = 0; r < secRows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = secGrid[r][c];
      const b = secGrid[r][c + 1];
      const cc = secGrid[r + 1][c];
      const d = secGrid[r + 1][c + 1];
      // Match primary winding so interface normals stay compatible (+Z).
      indices.push(a, cc, b, b, cc, d);
    }
  }
  const secondaryDistalVerts = [...secGrid[secRows - 1]];

  // Body-majority shell: coincident with mouth band but spine-skinned
  /** @type {number[]} */
  const bodyVerts = [];
  /** @type {number[][]} */
  const bodyGrid = [];
  for (let r = 0; r < 4; r += 1) {
    /** @type {number[]} */
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      const x = (c - (cols - 1) / 2) * 0.018;
      const y = 1.26 - r * 0.01;
      const z = 0.2;
      const i = pushVert(x, y, z, JOINT_SPINE);
      row.push(i);
      bodyVerts.push(i);
    }
    bodyGrid.push(row);
  }
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      indices.push(
        bodyGrid[r][c],
        bodyGrid[r + 1][c],
        bodyGrid[r][c + 1],
        bodyGrid[r][c + 1],
        bodyGrid[r + 1][c],
        bodyGrid[r + 1][c + 1],
      );
    }
  }

  // Single coincident vertex shell (one tri overlapping one primary point) — too few coincide pairs
  const sx = positions[grid[0][5] * 3];
  const sy = positions[grid[0][5] * 3 + 1];
  const sz = positions[grid[0][5] * 3 + 2];
  const s0 = pushVert(sx, sy, sz, JOINT_NECK);
  const s1 = pushVert(sx + 0.01, sy, sz, JOINT_NECK);
  const s2 = pushVert(sx, sy + 0.01, sz, JOINT_NECK);
  indices.push(s0, s1, s2);
  const singleVerts = [s0, s1, s2];

  // GT-far shell (chest height, normal-ish but far from mouth GT anchors)
  /** @type {number[]} */
  const farVerts = [];
  for (let c = 0; c < 6; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      farVerts.push(pushVert((c - 2.5) * 0.02, 0.7 + r * 0.02, 0.15, JOINT_NECK));
    }
  }
  for (let i = 0; i + 2 < farVerts.length; i += 3) {
    indices.push(farVerts[i], farVerts[i + 1], farVerts[i + 2]);
  }
  // Connect far into one component via strip
  for (let i = 0; i < farVerts.length - 1; i += 1) {
    if (i % 6 === 5) continue;
    // already have tris; ensure connectivity by shared verts in row loops — rebuild as grid
  }
  // Rebuild far as proper connected grid (replace sparse tris)
  // (farVerts already sequential row-major 6x4 — add quad topology)
  indices.length = indices.length; // no-op keep existing; add quads:
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      const a = farVerts[r * 6 + c];
      const b = farVerts[r * 6 + c + 1];
      const cc = farVerts[(r + 1) * 6 + c];
      const d = farVerts[(r + 1) * 6 + c + 1];
      indices.push(a, b, cc, b, d, cc);
    }
  }

  // Tertiary shell near secondary distal (coincident with secondary, NOT with primary) — recursion must not activate
  /** @type {number[]} */
  const thirdVerts = [];
  /** @type {number[][]} */
  const thirdGrid = [];
  for (let r = 0; r < 3; r += 1) {
    /** @type {number[]} */
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      const x = (c - (cols - 1) / 2) * 0.018;
      const y = 1.2 - (secRows - 1) * 0.018 - r * 0.018;
      const z = 0.2;
      const i = pushVert(x, y, z, JOINT_NECK);
      row.push(i);
      thirdVerts.push(i);
    }
    thirdGrid.push(row);
  }
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      indices.push(
        thirdGrid[r][c],
        thirdGrid[r + 1][c],
        thirdGrid[r][c + 1],
        thirdGrid[r][c + 1],
        thirdGrid[r + 1][c],
        thirdGrid[r + 1][c + 1],
      );
    }
  }

  const vertexCount = positions.length / 3;
  const doc = new Document();
  const buffer = doc.createBuffer();
  const posAcc = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(positions))
    .setBuffer(buffer);
  const idxAcc = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint32Array(indices))
    .setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', posAcc).setIndices(idxAcc);
  prim.setMaterial(doc.createMaterial('face'));

  const morphNames = [
    'jawOpen',
    'eyeBlinkLeft',
    'eyeBlinkRight',
    'browInnerUp',
    'mouthSmileLeft',
    'mouthSmileRight',
    'mouthPucker',
  ];
  for (const name of morphNames) {
    const deltas = new Float32Array(vertexCount * 3);
    if (name === 'jawOpen') deltas[0] = 0.001;
    const deltaAcc = doc.createAccessor().setType('VEC3').setArray(deltas).setBuffer(buffer);
    prim.addTarget(doc.createPrimitiveTarget().setAttribute('POSITION', deltaAcc));
  }
  prim.setExtras({ targetNames: morphNames });
  const mesh = doc.createMesh('FaceMesh').addPrimitive(prim);
  mesh.setExtras({ targetNames: morphNames });

  const jointsArr = new Uint16Array(vertexCount * 4);
  const weightArr = new Float32Array(vertexCount * 4);
  for (let v = 0; v < vertexCount; v += 1) {
    jointsArr[v * 4] = jointIdx[v];
    weightArr[v * 4] = 1;
  }
  prim
    .setAttribute(
      'JOINTS_0',
      doc.createAccessor().setType('VEC4').setArray(jointsArr).setBuffer(buffer),
    )
    .setAttribute(
      'WEIGHTS_0',
      doc.createAccessor().setType('VEC4').setArray(weightArr).setBuffer(buffer),
    );

  const hips = doc.createNode('Hips');
  const neck = doc.createNode('Neck');
  const spine = doc.createNode('Spine');
  const skin = doc.createSkin('skin').addJoint(hips).addJoint(neck).addJoint(spine).setSkeleton(hips);
  const faceNode = doc.createNode('FaceMesh').setMesh(mesh).setSkin(skin);
  doc.createScene().addChild(faceNode).addChild(hips).addChild(neck).addChild(spine);

  /** @type {Record<string, unknown>} */
  const anchors = {};
  for (const [id, tri] of Object.entries(triByAnchor)) {
    anchors[id] = {
      nodeIdentity: 'FaceMesh',
      primitiveIndex: 0,
      triangleIndex: tri,
      barycentric: { u: 1, v: 0, w: 0 },
    };
  }

  // Component ids via same adjacency labeling as production
  const { adj } = buildPrimitiveAdjacency(prim);
  const compOf = new Int32Array(vertexCount).fill(-1);
  let next = 0;
  for (let s = 0; s < vertexCount; s += 1) {
    if (compOf[s] >= 0) continue;
    const cid = next;
    next += 1;
    const q = [s];
    compOf[s] = cid;
    for (let qi = 0; qi < q.length; qi += 1) {
      for (const nb of adj[q[qi]]) {
        if (compOf[nb] < 0) {
          compOf[nb] = cid;
          q.push(nb);
        }
      }
    }
  }

  return {
    bytes: Buffer.from(await io.writeBinary(doc)),
    anchors: { contractVersion: FACE_ANCHORS_CONTRACT_VERSION, anchors },
    secondarySeamVerts,
    secondaryDistalVerts,
    bodyVerts,
    singleVerts,
    farVerts,
    thirdVerts,
    secondaryComponentId: compOf[secondarySeamVerts[0]],
    bodyComponentId: compOf[bodyVerts[0]],
    singleComponentId: compOf[singleVerts[0]],
    farComponentId: compOf[farVerts[0]],
    thirdComponentId: compOf[thirdVerts[0]],
  };
}

/**
 * @param {string} dir
 * @param {Buffer} glbBytes
 * @param {unknown} anchors
 * @param {{ modelSha256?: string; topologyFingerprint?: string }} [assetOverride]
 */
async function writeBundle(dir, glbBytes, anchors, assetOverride = {}) {
  mkdirSync(dir, { recursive: true });
  const glbPath = join(dir, 'candidate.glb');
  const anchorsPath = join(dir, 'face-anchors.json');
  const authoringPath = join(dir, 'face-mapping-authoring.json');
  writeFileSync(glbPath, glbBytes);
  writeFileSync(anchorsPath, `${JSON.stringify(anchors, null, 2)}\n`);
  const doc = await io.readBinary(glbBytes);
  const topo = computeFaceAssetTopologyFingerprint(doc);
  const modelSha256 = computeFaceAssetSha256Hex(glbBytes);
  const anchorsSha256 = computeFaceAssetSha256Hex(readFileSync(anchorsPath));
  const authoring = {
    contractVersion: FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
    source: 'manual',
    reviewed: true,
    reviewStatus: 'human_reviewed',
    reviewedAt: '2026-10-01T12:00:00.000Z',
    asset: {
      modelPath: glbPath,
      modelSha256: assetOverride.modelSha256 || modelSha256,
      anchorsSha256,
      topologyFingerprint: assetOverride.topologyFingerprint || topo,
    },
  };
  writeFileSync(authoringPath, `${JSON.stringify(authoring, null, 2)}\n`);
  return { glbPath, anchorsPath, authoringPath, modelSha256, topo, anchorsSha256 };
}

async function main() {
  check(
    FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes('jawOpen') &&
      FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes('eyeBlinkLeft') &&
      FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes('eyeBlinkRight') &&
      FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes('browInnerUp') &&
      FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes('mouthSmileLeft') &&
      FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes('mouthSmileRight') &&
      FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes('mouthPucker') &&
      FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.length === 7,
    'Milestone 5 supports jaw/blink/brow/smile L+R/pucker',
  );
  check(
    FACE_FUNCTIONAL_MORPH_AUTHOR_CONTRACT_VERSION.startsWith('SagaDrive'),
    'author contract version present',
  );

  const work = mkdtempSync(join(process.cwd(), '.qa', 'runs', 'face-morph-author-'));
  try {
    const fixture = await buildFixtureGlb();
    const goodDir = join(work, 'good');
    const good = await writeBundle(goodDir, fixture.bytes, fixture.anchors);
    const out1 = join(goodDir, 'out1.glb');
    const out2 = join(goodDir, 'out2.glb');
    const report1 = join(goodDir, 'report1.json');

    const r1 = await authorLiveActFunctionalMorph({
      inputPath: good.glbPath,
      outputPath: out1,
      anchorsPath: good.anchorsPath,
      authoringPath: good.authoringPath,
      channel: 'jawOpen',
      reportPath: report1,
    });
    check(r1.channel === 'jawOpen', 'authors jawOpen');
    check(r1.channelStats.affectedVertices > 0, 'affects vertices');
    check(r1.channelStats.mouthGapDelta > 0.02, 'mouth gap increases');
    check(
      (r1.channelStats.displacements.mouthLower || 0) >
        (r1.channelStats.displacements.mouthUpper || 0),
      'lower moves more than upper',
    );
    check((r1.channelStats.displacements.mouthLower || 0) > 0.01, 'mouthLower moves');
    // Chin may be a separate connected component from mouth GT seeds (production body shell).
    // Surface gate must NOT pull disconnected chin/chest shells; chin displacement may be ~0.
    check(
      (r1.channelStats.displacements.chin || 0) < 0.2,
      'chin displacement bounded (disconnected chin shell not Euclidean-pulled)',
    );
    check((r1.channelStats.displacements.noseTip || 0) < 1e-6, 'nose ≈ 0');
    check((r1.channelStats.displacements.forehead || 0) < 1e-6, 'forehead = 0');
    check(r1.afterJawOpenMorphSha256 !== r1.beforeJawOpenMorphSha256, 'jawOpen deltas changed');
    check(r1.morphsUnchangedExceptChannel === true, 'only jawOpen changed flag');
    check(r1.changedMorphs.length === 1 && r1.changedMorphs[0] === 'jawOpen', 'changedMorphs=[jawOpen]');

    const r2 = await authorLiveActFunctionalMorph({
      inputPath: good.glbPath,
      outputPath: out2,
      anchorsPath: good.anchorsPath,
      authoringPath: good.authoringPath,
      channel: 'jawOpen',
    });
    check(
      r1.afterJawOpenMorphSha256 === r2.afterJawOpenMorphSha256,
      'deterministic morph hash across runs',
    );
    check(
      r1.deterministicRerunMorphSha256 === r1.afterJawOpenMorphSha256,
      'internal rerun hash matches',
    );

    const inDoc = await io.readBinary(readFileSync(good.glbPath));
    const outDoc = await io.readBinary(readFileSync(out1));
    const inHashes = hashAllMorphPositionBuffers(inDoc);
    const outHashes = hashAllMorphPositionBuffers(outDoc);
    let otherOk = true;
    for (const [name, sha] of inHashes) {
      if (name === 'jawOpen') continue;
      if (outHashes.get(name) !== sha) otherOk = false;
    }
    check(otherOk, 'all non-jawOpen morph hashes identical');

    check(
      r1.channelStats.mouthGapDelta >= 0.06,
      'mouthGapDelta clears Functional jawOpen floor (0.06)',
    );
    check(
      (r1.channelStats.displacements.noseTip || 0) / r1.channelStats.faceHeight <= 0.04,
      'nose displacement within Functional jawOpen leakage bound',
    );
    check(
      (r1.channelStats.displacements.forehead || 0) / r1.channelStats.faceHeight <= 0.025,
      'forehead displacement within Functional jawOpen leakage bound',
    );

    // --- Milestone 2: blink on top of jawOpen output; jawOpen hash immutable ---
    const jawAuth = await writeBundle(join(work, 'jaw-out'), readFileSync(out1), fixture.anchors);
    const blinkLOut = join(work, 'blinkL.glb');
    const blinkL = await authorLiveActFunctionalMorph({
      inputPath: jawAuth.glbPath,
      outputPath: blinkLOut,
      anchorsPath: jawAuth.anchorsPath,
      authoringPath: jawAuth.authoringPath,
      channel: 'eyeBlinkLeft',
    });
    check(blinkL.channel === 'eyeBlinkLeft', 'authors eyeBlinkLeft');
    check(blinkL.channelStats.affectedVertices > 0, 'blinkL affects vertices');
    check((blinkL.channelStats.openDrop || 0) >= 0.05, 'blinkL openDrop >= 0.05');
    check((blinkL.channelStats.openRatio ?? 1) <= 0.65, 'blinkL openRatio <= 0.65');
    check((blinkL.channelStats.oppositeRelChange ?? 1) <= 0.2, 'blinkL opposite crosstalk <= 0.2');
    check(blinkL.jawOpenMorphUnchanged === true, 'blinkL leaves jawOpen morph unchanged');
    check(
      blinkL.afterJawOpenMorphSha256 === r1.afterJawOpenMorphSha256,
      'blinkL preserves Milestone-1 jawOpen morph hash',
    );
    check(
      blinkL.changedMorphs.length === 1 && blinkL.changedMorphs[0] === 'eyeBlinkLeft',
      'blinkL only changes eyeBlinkLeft',
    );

    const blinkLAuth = await writeBundle(join(work, 'blinkL-auth'), readFileSync(blinkLOut), fixture.anchors);
    const blinkROut = join(work, 'blinkR.glb');
    const blinkR = await authorLiveActFunctionalMorph({
      inputPath: blinkLAuth.glbPath,
      outputPath: blinkROut,
      anchorsPath: blinkLAuth.anchorsPath,
      authoringPath: blinkLAuth.authoringPath,
      channel: 'eyeBlinkRight',
    });
    check(blinkR.channel === 'eyeBlinkRight', 'authors eyeBlinkRight');
    check((blinkR.channelStats.openDrop || 0) >= 0.05, 'blinkR openDrop >= 0.05');
    check((blinkR.channelStats.openRatio ?? 1) <= 0.65, 'blinkR openRatio <= 0.65');
    check((blinkR.channelStats.oppositeRelChange ?? 1) <= 0.2, 'blinkR opposite crosstalk <= 0.2');
    check(
      blinkR.afterJawOpenMorphSha256 === r1.afterJawOpenMorphSha256,
      'blinkR preserves Milestone-1 jawOpen morph hash',
    );
    const blinkR2 = await authorLiveActFunctionalMorph({
      inputPath: blinkLAuth.glbPath,
      outputPath: join(work, 'blinkR2.glb'),
      anchorsPath: blinkLAuth.anchorsPath,
      authoringPath: blinkLAuth.authoringPath,
      channel: 'eyeBlinkRight',
    });
    check(
      blinkR.afterChannelMorphSha256 === blinkR2.afterChannelMorphSha256,
      'blinkR deterministic morph hash',
    );

    // --- Milestone 3: browInnerUp on blink stack; prior morph hashes immutable ---
    const blinkRAuth = await writeBundle(join(work, 'blinkR-auth'), readFileSync(blinkROut), fixture.anchors);
    const browOut = join(work, 'brow.glb');
    const brow = await authorLiveActFunctionalMorph({
      inputPath: blinkRAuth.glbPath,
      outputPath: browOut,
      anchorsPath: blinkRAuth.anchorsPath,
      authoringPath: blinkRAuth.authoringPath,
      channel: 'browInnerUp',
    });
    check(brow.channel === 'browInnerUp', 'authors browInnerUp');
    check(brow.channelStats.affectedVertices > 0, 'brow affects vertices');
    check((brow.channelStats.meanLiftDelta || 0) >= 0.03, 'brow meanLiftDelta >= 0.03');
    check((brow.channelStats.browInnerLiftLDelta || 0) > 0, 'left inner brow lifts');
    check((brow.channelStats.browInnerLiftRDelta || 0) > 0, 'right inner brow lifts');
    check((brow.channelStats.displacements.mouthUpper || 0) < 1e-5, 'brow mouth protected');
    check((brow.channelStats.displacements.chin || 0) < 1e-5, 'brow chin protected');
    check((brow.channelStats.displacements.noseTip || 0) < 1e-5, 'brow nose protected');
    check(
      brow.afterJawOpenMorphSha256 === r1.afterJawOpenMorphSha256,
      'brow preserves jawOpen morph hash',
    );
    const browDoc = await io.readBinary(readFileSync(browOut));
    const browHashes = hashAllMorphPositionBuffers(browDoc);
    const blinkRDoc = await io.readBinary(readFileSync(blinkROut));
    const blinkRHashes = hashAllMorphPositionBuffers(blinkRDoc);
    check(
      browHashes.get('eyeBlinkLeft') === blinkRHashes.get('eyeBlinkLeft'),
      'brow preserves eyeBlinkLeft hash',
    );
    check(
      browHashes.get('eyeBlinkRight') === blinkRHashes.get('eyeBlinkRight'),
      'brow preserves eyeBlinkRight hash',
    );
    check(
      brow.changedMorphs.length === 1 && brow.changedMorphs[0] === 'browInnerUp',
      'brow only changes browInnerUp',
    );
    const brow2 = await authorLiveActFunctionalMorph({
      inputPath: blinkRAuth.glbPath,
      outputPath: join(work, 'brow2.glb'),
      anchorsPath: blinkRAuth.anchorsPath,
      authoringPath: blinkRAuth.authoringPath,
      channel: 'browInnerUp',
    });
    check(
      brow.afterChannelMorphSha256 === brow2.afterChannelMorphSha256,
      'brow deterministic morph hash',
    );

    // --- Milestone 4: smiles on brow stack; prior morph hashes immutable ---
    const browAuth = await writeBundle(join(work, 'brow-auth'), readFileSync(browOut), fixture.anchors);
    const smileLOut = join(work, 'smileL.glb');
    const smileL = await authorLiveActFunctionalMorph({
      inputPath: browAuth.glbPath,
      outputPath: smileLOut,
      anchorsPath: browAuth.anchorsPath,
      authoringPath: browAuth.authoringPath,
      channel: 'mouthSmileLeft',
    });
    check(smileL.channel === 'mouthSmileLeft', 'authors mouthSmileLeft');
    check((smileL.channelStats.cornerUp || 0) >= 0.025, 'smileL cornerUp >= 0.025');
    check((smileL.channelStats.cornerMotion || 0) >= 0.03, 'smileL cornerMotion >= 0.03');
    check((smileL.channelStats.upAdvantage || 0) >= 0.015, 'smileL upAdvantage >= 0.015');
    check(
      smileL.afterJawOpenMorphSha256 === r1.afterJawOpenMorphSha256,
      'smileL preserves jawOpen morph hash',
    );
    const smileLDoc = await io.readBinary(readFileSync(smileLOut));
    const smileLHashes = hashAllMorphPositionBuffers(smileLDoc);
    const browHashesAfter = hashAllMorphPositionBuffers(await io.readBinary(readFileSync(browOut)));
    check(
      smileLHashes.get('browInnerUp') === browHashesAfter.get('browInnerUp'),
      'smileL preserves browInnerUp hash',
    );
    check(
      smileLHashes.get('eyeBlinkLeft') === browHashesAfter.get('eyeBlinkLeft'),
      'smileL preserves eyeBlinkLeft hash',
    );

    const smileLAuth = await writeBundle(join(work, 'smileL-auth'), readFileSync(smileLOut), fixture.anchors);
    const smileR = await authorLiveActFunctionalMorph({
      inputPath: smileLAuth.glbPath,
      outputPath: join(work, 'smileR.glb'),
      anchorsPath: smileLAuth.anchorsPath,
      authoringPath: smileLAuth.authoringPath,
      channel: 'mouthSmileRight',
    });
    check(smileR.channel === 'mouthSmileRight', 'authors mouthSmileRight');
    check((smileR.channelStats.cornerUp || 0) >= 0.025, 'smileR cornerUp >= 0.025');
    check((smileR.channelStats.cornerMotion || 0) >= 0.03, 'smileR cornerMotion >= 0.03');
    check((smileR.channelStats.upAdvantage || 0) >= 0.015, 'smileR upAdvantage >= 0.015');
    const smileR2 = await authorLiveActFunctionalMorph({
      inputPath: smileLAuth.glbPath,
      outputPath: join(work, 'smileR2.glb'),
      anchorsPath: smileLAuth.anchorsPath,
      authoringPath: smileLAuth.authoringPath,
      channel: 'mouthSmileRight',
    });
    check(
      smileR.afterChannelMorphSha256 === smileR2.afterChannelMorphSha256,
      'smileR deterministic morph hash',
    );

    // --- Milestone 5: pucker on smile stack; prior six morph hashes immutable ---
    const smileROut = join(work, 'smileR.glb');
    const smileRAuth = await writeBundle(join(work, 'smileR-auth'), readFileSync(smileROut), fixture.anchors);
    const smileStackHashes = hashAllMorphPositionBuffers(await io.readBinary(readFileSync(smileROut)));
    const puckerOut = join(work, 'pucker.glb');
    const pucker = await authorLiveActFunctionalMorph({
      inputPath: smileRAuth.glbPath,
      outputPath: puckerOut,
      anchorsPath: smileRAuth.anchorsPath,
      authoringPath: smileRAuth.authoringPath,
      channel: 'mouthPucker',
    });
    check(pucker.channel === 'mouthPucker', 'authors mouthPucker');
    check(pucker.channelStats.affectedVertices > 0, 'pucker affects vertices');
    check(
      (pucker.channelStats.widthRatio || 1) < 0.96,
      'pucker reduces mouth width (widthRatio < 0.96)',
    );
    check((pucker.channelStats.leftCornerInward || 0) > 0.02, 'left corner moves inward');
    check((pucker.channelStats.rightCornerInward || 0) > 0.02, 'right corner moves inward');
    check(
      (pucker.channelStats.leftCornerInward || 0) > 0 &&
        (pucker.channelStats.rightCornerInward || 0) > 0,
      'bilateral inward effect',
    );
    check((pucker.channelStats.asymmetry ?? 1) < 0.12, 'pucker asymmetry plausible');
    check(
      Math.abs(pucker.channelStats.leftCornerVertical || 0) < 0.04 &&
        Math.abs(pucker.channelStats.rightCornerVertical || 0) < 0.04,
      'corners avoid excessive vertical drift',
    );
    check((pucker.channelStats.displacements.noseTip || 0) < 1e-5, 'pucker nose ≈ 0');
    check((pucker.channelStats.displacements.forehead || 0) < 1e-5, 'pucker forehead ≈ 0');
    check((pucker.channelStats.displacements.browLeftInner || 0) < 1e-4, 'pucker browL protected');
    check((pucker.channelStats.displacements.eyeLeftOuter || 0) < 1e-4, 'pucker eye protected');
    check(
      pucker.afterJawOpenMorphSha256 === r1.afterJawOpenMorphSha256,
      'pucker preserves jawOpen morph hash',
    );
    const puckerDoc = await io.readBinary(readFileSync(puckerOut));
    const puckerHashes = hashAllMorphPositionBuffers(puckerDoc);
    for (const ch of [
      'jawOpen',
      'eyeBlinkLeft',
      'eyeBlinkRight',
      'browInnerUp',
      'mouthSmileLeft',
      'mouthSmileRight',
    ]) {
      check(
        puckerHashes.get(ch) === smileStackHashes.get(ch),
        `pucker preserves prior morph hash: ${ch}`,
      );
    }
    check(
      pucker.changedMorphs.length === 1 && pucker.changedMorphs[0] === 'mouthPucker',
      'pucker only changes mouthPucker',
    );
    let other44 = true;
    for (const [name, sha] of smileStackHashes) {
      if (name === 'mouthPucker') continue;
      if (puckerHashes.get(name) !== sha) other44 = false;
    }
    check(other44, 'all non-pucker morph hashes identical vs smile stack');
    const pucker2 = await authorLiveActFunctionalMorph({
      inputPath: smileRAuth.glbPath,
      outputPath: join(work, 'pucker2.glb'),
      anchorsPath: smileRAuth.anchorsPath,
      authoringPath: smileRAuth.authoringPath,
      channel: 'mouthPucker',
    });
    check(
      pucker.afterChannelMorphSha256 === pucker2.afterChannelMorphSha256,
      'pucker deterministic morph hash',
    );

    let rejected = false;
    try {
      const unrevDir = join(work, 'unreviewed');
      mkdirSync(unrevDir, { recursive: true });
      const glbPath = join(unrevDir, 'candidate.glb');
      const anchorsPath = join(unrevDir, 'face-anchors.json');
      const authoringPath = join(unrevDir, 'face-mapping-authoring.json');
      writeFileSync(glbPath, fixture.bytes);
      writeFileSync(anchorsPath, `${JSON.stringify(fixture.anchors, null, 2)}\n`);
      const doc = await io.readBinary(fixture.bytes);
      writeFileSync(
        authoringPath,
        `${JSON.stringify(
          {
            contractVersion: FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
            source: 'auto',
            reviewed: false,
            reviewStatus: 'unreviewed',
            asset: {
              modelPath: glbPath,
              modelSha256: computeFaceAssetSha256Hex(fixture.bytes),
              anchorsSha256: computeFaceAssetSha256Hex(readFileSync(anchorsPath)),
              topologyFingerprint: computeFaceAssetTopologyFingerprint(doc),
            },
          },
          null,
          2,
        )}\n`,
      );
      await authorLiveActFunctionalMorph({
        inputPath: glbPath,
        outputPath: join(unrevDir, 'out.glb'),
        anchorsPath,
        authoringPath,
        channel: 'jawOpen',
      });
    } catch (err) {
      rejected = String(err.message || err).includes('ground_truth_rejected');
    }
    check(rejected, 'unreviewed GT rejected');

    rejected = false;
    try {
      const stale = await writeBundle(join(work, 'stale-topo'), fixture.bytes, fixture.anchors, {
        topologyFingerprint: 'v1:t1:m1',
      });
      await authorLiveActFunctionalMorph({
        inputPath: stale.glbPath,
        outputPath: join(work, 'stale-topo', 'out.glb'),
        anchorsPath: stale.anchorsPath,
        authoringPath: stale.authoringPath,
        channel: 'jawOpen',
      });
    } catch (err) {
      rejected = String(err.message || err).includes('ground_truth_rejected');
    }
    check(rejected, 'stale topology rejected');

    rejected = false;
    try {
      const stale = await writeBundle(join(work, 'stale-sha'), fixture.bytes, fixture.anchors, {
        modelSha256: '0'.repeat(64),
      });
      await authorLiveActFunctionalMorph({
        inputPath: stale.glbPath,
        outputPath: join(work, 'stale-sha', 'out.glb'),
        anchorsPath: stale.anchorsPath,
        authoringPath: stale.authoringPath,
        channel: 'jawOpen',
      });
    } catch (err) {
      rejected = String(err.message || err).includes('ground_truth_rejected');
    }
    check(rejected, 'stale candidate SHA rejected');

    rejected = false;
    try {
      const badAnchors = structuredClone(fixture.anchors);
      delete badAnchors.anchors.chin;
      const miss = await writeBundle(join(work, 'missing-anchor'), fixture.bytes, badAnchors);
      await authorLiveActFunctionalMorph({
        inputPath: miss.glbPath,
        outputPath: join(work, 'missing-anchor', 'out.glb'),
        anchorsPath: miss.anchorsPath,
        authoringPath: miss.authoringPath,
        channel: 'jawOpen',
      });
    } catch (err) {
      rejected =
        String(err.message || err).includes('required anchor') ||
        String(err.message || err).includes('anchors_binding') ||
        String(err.message || err).includes('face local frame') ||
        String(err.message || err).includes('ground_truth');
    }
    check(rejected, 'missing required anchor rejected');

    rejected = false;
    try {
      await authorLiveActFunctionalMorph({
        inputPath: good.glbPath,
        outputPath: join(goodDir, 'bad-channel.glb'),
        anchorsPath: good.anchorsPath,
        authoringPath: good.authoringPath,
        channel: 'mouthFrownLeft',
      });
    } catch (err) {
      rejected = String(err.message || err).includes('unsupported_channel');
    }
    check(rejected, 'unsupported channel rejected');

    rejected = false;
    try {
      const badAnchors = structuredClone(fixture.anchors);
      delete badAnchors.anchors.mouthCornerLeft;
      const miss = await writeBundle(join(work, 'missing-corner'), fixture.bytes, badAnchors);
      await authorLiveActFunctionalMorph({
        inputPath: miss.glbPath,
        outputPath: join(work, 'missing-corner', 'out.glb'),
        anchorsPath: miss.anchorsPath,
        authoringPath: miss.authoringPath,
        channel: 'mouthPucker',
      });
    } catch (err) {
      rejected =
        String(err.message || err).includes('required anchor') ||
        String(err.message || err).includes('anchors_binding') ||
        String(err.message || err).includes('ground_truth') ||
        String(err.message || err).includes('face local frame');
    }
    check(rejected, 'missing mouth-corner anchor rejected');

    rejected = false;
    try {
      const badAnchors = structuredClone(fixture.anchors);
      delete badAnchors.anchors.mouthUpper;
      const miss = await writeBundle(join(work, 'missing-lip'), fixture.bytes, badAnchors);
      await authorLiveActFunctionalMorph({
        inputPath: miss.glbPath,
        outputPath: join(work, 'missing-lip', 'out.glb'),
        anchorsPath: miss.anchorsPath,
        authoringPath: miss.authoringPath,
        channel: 'mouthPucker',
      });
    } catch (err) {
      rejected =
        String(err.message || err).includes('required anchor') ||
        String(err.message || err).includes('anchors_binding') ||
        String(err.message || err).includes('ground_truth') ||
        String(err.message || err).includes('face local frame');
    }
    check(rejected, 'missing lip semantic anchor rejected');

    rejected = false;
    try {
      const badAnchors = structuredClone(fixture.anchors);
      delete badAnchors.anchors.browLeftInner;
      const miss = await writeBundle(join(work, 'missing-brow'), fixture.bytes, badAnchors);
      await authorLiveActFunctionalMorph({
        inputPath: miss.glbPath,
        outputPath: join(work, 'missing-brow', 'out.glb'),
        anchorsPath: miss.anchorsPath,
        authoringPath: miss.authoringPath,
        channel: 'browInnerUp',
      });
    } catch (err) {
      rejected =
        String(err.message || err).includes('required anchor') ||
        String(err.message || err).includes('anchors_binding') ||
        String(err.message || err).includes('ground_truth');
    }
    check(rejected, 'missing brow semantic anchor rejected');

    rejected = false;
    try {
      await authorLiveActFunctionalMorph({
        inputPath: join(work, 'nope.glb'),
        outputPath: join(work, 'x.glb'),
        anchorsPath: good.anchorsPath,
        authoringPath: good.authoringPath,
        channel: 'jawOpen',
      });
    } catch (err) {
      rejected = String(err.message || err).includes('input missing');
    }
    check(rejected, 'missing input GLB rejected');

    rejected = false;
    try {
      const badAnchors = structuredClone(fixture.anchors);
      badAnchors.anchors.mouthLower.triangleIndex = 999999;
      const bad = await writeBundle(join(work, 'bad-bind'), fixture.bytes, badAnchors);
      await authorLiveActFunctionalMorph({
        inputPath: bad.glbPath,
        outputPath: join(work, 'bad-bind', 'out.glb'),
        anchorsPath: bad.anchorsPath,
        authoringPath: bad.authoringPath,
        channel: 'jawOpen',
      });
    } catch (err) {
      rejected =
        String(err.message || err).includes('anchors_binding_invalid') ||
        String(err.message || err).includes('stale_triangle');
    }
    check(rejected, 'wrong/stale triangle binding rejected');

    // --- Surface safety: disconnected Euclidean-near shell must not receive jawOpen deltas ---
    {
      const surfDir = join(work, 'surface-safety');
      const surf = await writeBundle(surfDir, fixture.bytes, fixture.anchors);
      const surfOut = join(surfDir, 'jaw.glb');
      const surfReport = join(surfDir, 'jaw-report.json');
      const rj = await authorLiveActFunctionalMorph({
        inputPath: surf.glbPath,
        outputPath: surfOut,
        anchorsPath: surf.anchorsPath,
        authoringPath: surf.authoringPath,
        channel: 'jawOpen',
        reportPath: surfReport,
      });
      check(
        rj.channelStats?.surfaceSafety?.offSurfaceRejected > 0 ||
          rj.channelStats?.surfaceSafety?.allowedSurfaceVertexCount < rj.channelStats?.vertexCount,
        'jawOpen surface gate reports restricted allowed surface',
      );
      const docJ = await io.read(surfOut);
      const meshJ = docJ.getRoot().listMeshes()[0];
      const primJ = meshJ.listPrimitives()[0];
      const mi = (() => {
        const extras = primJ.getExtras() || {};
        const names = Array.isArray(extras.targetNames) ? extras.targetNames.map(String) : [];
        return names.indexOf('jawOpen');
      })();
      const mp = primJ.listTargets()[mi].getAttribute('POSITION');
      const d = [0, 0, 0];
      let chestMag = 0;
      for (let k = 0; k < 3; k += 1) {
        const vi = fixture.disconnectedChestVertexBase + k;
        mp.getElement(vi, d);
        chestMag = Math.max(chestMag, Math.hypot(d[0], d[1], d[2]));
      }
      check(chestMag <= 1e-8, 'disconnected chest shell inside Euclidean radius gets zero jawOpen delta');

      // Same-component lip/mouthLower seed must deform
      const mouthBinding = fixture.anchors.anchors.mouthLower;
      const tri = mouthBinding.triangleIndex;
      const idx = primJ.getIndices();
      const i0 = idx.getScalar(tri * 3);
      mp.getElement(i0, d);
      const lipMag = Math.hypot(d[0], d[1], d[2]);
      check(lipMag > 1e-5, 'GT-bound mouthLower triangle vertex receives jawOpen delta');
    }

    // --- Coupled Facial Shell Contract (Option C) geometry behavior ---
    {
      const coupled = await buildCoupledShellFixtureGlb();
      const cDir = join(work, 'coupled-shell');
      const bundle = await writeBundle(cDir, coupled.bytes, coupled.anchors);
      const docC = await io.read(bundle.glbPath);
      const primC = docC.getRoot().listMeshes()[0].listPrimitives()[0];
      const anchorsObj = coupled.anchors.anchors;
      const resolved = resolveFaceAnchorPositions(docC, anchorsObj);
      const frame = buildFaceLocalFrame(resolved);
      const surface = buildGtBoundSurfaceGate(
        primC,
        anchorsObj,
        JAW_OPEN_AUTHOR_CONTRACT_V1.surfaceSeedAnchors,
      );
      /** @type {number[]} */
      const primaryVerts = [];
      for (let i = 0; i < surface.allowed.length; i += 1) {
        if (surface.allowed[i]) primaryVerts.push(i);
      }
      const jointNames = docC
        .getRoot()
        .listSkins()[0]
        .listJoints()
        .map((j) => j.getName() || '');
      const gtRefs = [
        resolved.mouthLower,
        resolved.mouthUpper,
        resolved.chin,
        resolved.mouthCornerLeft,
        resolved.mouthCornerRight,
      ].filter(Boolean);
      const det1 = resolveCoupledFacialPatches({
        prim: primC,
        surface,
        primaryVerts,
        faceHeight: frame.faceHeight,
        gtRefs,
        jointNames,
      });
      const det2 = resolveCoupledFacialPatches({
        prim: primC,
        surface,
        primaryVerts,
        faceHeight: frame.faceHeight,
        gtRefs,
        jointNames,
      });
      const accepted = det1.patches.map((p) => p.componentId).sort((a, b) => a - b);
      check(accepted.includes(coupled.secondaryComponentId), 'disconnected coherent facial seam accepted');
      check(!accepted.includes(coupled.bodyComponentId), 'body-majority shell rejected');
      check(!accepted.includes(coupled.singleComponentId), 'single coincident vertex shell rejected');
      check(!accepted.includes(coupled.farComponentId), 'GT-far shell rejected');
      check(!accepted.includes(coupled.thirdComponentId), 'near tertiary without primary seam rejected / not accepted');
      check(
        JSON.stringify(det1.patches.map((p) => p.componentId)) ===
          JSON.stringify(det2.patches.map((p) => p.componentId)) &&
          det1.secondaryBindings.size === det2.secondaryBindings.size,
        'coupling detection deterministic',
      );

      // Author transfer: secondary seam moves; body/far/single stay 0; no third propagation
      const outPath = join(cDir, 'jaw.glb');
      const report = await authorLiveActFunctionalMorph({
        inputPath: bundle.glbPath,
        outputPath: outPath,
        anchorsPath: bundle.anchorsPath,
        authoringPath: bundle.authoringPath,
        channel: 'jawOpen',
        reportPath: join(cDir, 'jaw-report.json'),
      });
      const shell = report.channelStats?.coupledShell;
      check(!!shell && shell.acceptedComponentIds?.includes(coupled.secondaryComponentId), 'author accepts facial secondary');
      check(shell?.noRecursivePropagation === true, 'author asserts no recursive propagation');
      check(shell?.seamContinuity?.pass !== false, 'seam continuity metric present/pass');

      const docOut = await io.read(outPath);
      const primOut = docOut.getRoot().listMeshes()[0].listPrimitives()[0];
      const names = (primOut.getExtras()?.targetNames || []).map(String);
      const mi = names.indexOf('jawOpen');
      const mp = primOut.listTargets()[mi].getAttribute('POSITION');
      const d = [0, 0, 0];
      let secMag = 0;
      for (const v of coupled.secondarySeamVerts) {
        mp.getElement(v, d);
        secMag = Math.max(secMag, Math.hypot(d[0], d[1], d[2]));
      }
      check(secMag > 1e-6, 'secondary interface moves with primary');
      let distalMag = 0;
      for (const v of coupled.secondaryDistalVerts) {
        mp.getElement(v, d);
        distalMag = Math.max(distalMag, Math.hypot(d[0], d[1], d[2]));
      }
      check(distalMag < secMag * 0.55, 'patch falloff reduces distal secondary motion');
      let bodyMag = 0;
      for (const v of coupled.bodyVerts) {
        mp.getElement(v, d);
        bodyMag = Math.max(bodyMag, Math.hypot(d[0], d[1], d[2]));
      }
      check(bodyMag <= 1e-8, 'body-majority shell stays zero after author');
      let thirdMag = 0;
      for (const v of coupled.thirdVerts) {
        mp.getElement(v, d);
        thirdMag = Math.max(thirdMag, Math.hypot(d[0], d[1], d[2]));
      }
      check(thirdMag <= 1e-8, 'secondary does not propagate to third component');

      // Stale GT / malformed topology fail closed (already covered above for jawOpen;
      // coupled utility also throws on missing POSITION/indices — covered via author path).
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  if (failed > 0) {
    console.error(`liveact-face-functional-morph-author-check FAIL (${failed})`);
    process.exit(1);
  }
  console.log('liveact-face-functional-morph-author-check OK');
}

main().catch((err) => {
  console.error(`liveact-face-functional-morph-author-check FAIL: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
