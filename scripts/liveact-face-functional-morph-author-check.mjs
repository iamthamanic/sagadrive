#!/usr/bin/env node
/**
 * liveact-face-functional-morph-author-check — behavioral checks for GT-aware jawOpen author (#423).
 * Location: scripts/liveact-face-functional-morph-author-check.mjs
 *
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
  addTri(-0.12, 1.55, 0.18, 'eyeLeftOuter');
  addTri(0.12, 1.55, 0.18, 'eyeRightOuter');
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
  // Upper-face filler near nose/forehead (should stay ~0 under jawOpen)
  for (let yi = 0; yi < 4; yi += 1) {
    for (let xi = -2; xi <= 2; xi += 1) {
      addTri(xi * 0.03, 1.45 + yi * 0.04, 0.18, null);
    }
  }

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
  // Fill remaining required-ish ids if missing (map extras to nearest)
  for (const id of [
    'eyeLeftInner',
    'eyeLeftUpper',
    'eyeLeftLower',
    'eyeRightInner',
    'eyeRightUpper',
    'eyeRightLower',
    'browLeftInner',
    'browLeftOuter',
    'browLeftCenter',
    'browRightInner',
    'browRightOuter',
    'browRightCenter',
  ]) {
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
    FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.length === 1 &&
      FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1[0] === 'jawOpen',
    'Milestone 1 supports only jawOpen',
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
    check((r1.channelStats.displacements.chin || 0) > 0.01, 'chin moves');
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
        channel: 'eyeBlinkLeft',
      });
    } catch (err) {
      rejected = String(err.message || err).includes('unsupported_channel');
    }
    check(rejected, 'unsupported channel rejected');

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
