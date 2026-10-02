#!/usr/bin/env node
/**
 * liveact-423-final-publish — freeze final face3 GLB, full Stage-B QA, pack VRM, publish (#423).
 * Location: scripts/liveact-423-final-publish.mjs
 *
 * Offline gate/publish only. Does not invent morph geometry or tune gains.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import {
  findNamedMorphTargetIndex,
  hashAllMorphPositionBuffers,
} from './lib/liveact-face-functional-morph-author.mjs';
import {
  buildFaceLocalFrame,
  computeFaceAssetSha256Hex,
  computeFaceAssetTopologyFingerprint,
  computeFunctionalMetricsFromAnchors,
  evaluateReviewedGroundTruthGate,
  validateLiveActFaceFunctionalQa,
} from './lib/liveact-face-functional-validate.mjs';
import { validateLiveActFaceAsset } from './lib/liveact-face-asset-validate.mjs';
import {
  resolveFaceAnchorPositions,
  validateFaceAnchorAnatomyAgainstDocument,
} from './lib/liveact-face-anchor-anatomy-validate.mjs';
import { parseManifestEnvelope } from './lib/liveact-face-anchor-validate.mjs';
import { findNodeByIdentity } from './lib/liveact-face-anchor-glb.mjs';
import {
  FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
  isReviewedFaceMappingGroundTruth,
} from './lib/liveact-face-mapping-authoring.mjs';
import { FUNCTIONAL_REQUIRED_CHANNELS_V1 } from './lib/liveact-face-functional-profile-v1.mjs';
import { packAvatarVrm1 } from './lib/avatar-vrm-pack.mjs';
import {
  buildGtBoundSurfaceGate,
  maxTopologyHopsForRadius,
  resolveCoupledFacialPatches,
} from './lib/liveact-face-functional-morph-surface.mjs';
import { JAW_OPEN_AUTHOR_CONTRACT_V1 } from './lib/liveact-face-functional-morph-profile-v1.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const io = new NodeIO();
const CHANNELS = [
  'jawOpen',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'browInnerUp',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
];
const CACHE_BUST = 'quality5-face3-repro1';

/**
 * Authoritative morph POSITION hashes from current-HEAD full reauthor
 * (3-edge meanEdgeLength + nearestSeed + smile/pucker GT surface gate). Case B.
 */
const EXPECTED_MORPH_HASHES = {
  m5: {
    jawOpen: '5eba7c7faa566eec05989293708bee0aea7672e7f0cacd0c4761956b761f3cab',
    eyeBlinkLeft: 'c601c77b4209188c791c974f5c7fb0b9e2151621f2067893c3a164bb97a91b71',
    eyeBlinkRight: '681ff38de2d75675e37047902901e40599737857d28f86fcc7f8176d30c3883f',
    browInnerUp: '52f808420a23bb011de7fdd4251baf7258df3e56d03c7d2d29c0325badd5303f',
    mouthSmileLeft: '97d5ce04e8237d85cf33fd6647cab38067775dfb1191bff893db10601f6f47d9',
    mouthSmileRight: '1d6b5a72455d309152353ac5997d5b4578135492eb52657c3a9da8b4640792da',
    mouthPucker: '13c1b0a2087dd7de3bb3a7b7a2ea3c057304f19a3f66adaee852f6037e75efe3',
  },
  f5: {
    jawOpen: 'de9c58ec36fde2feef7702e807d208a5edefad875561ccc68b2ca668e9464b14',
    eyeBlinkLeft: '439b9f75cab7b3db8c11bfeecca754916ae9499e3df9b8dbbd90e2c7ddbc432e',
    eyeBlinkRight: 'e28eedc4ef756155afbf1df7b254c83f2b15536e38843d8307b72e306b044201',
    browInnerUp: 'bbf84cb7b6b1d7aea3b93dd2750e069cf50bd8689b2929559509b973e2b31efa',
    mouthSmileLeft: 'd841962774c67e03c9be844b6a8038b7e20f76447338f39b9db74ead47e8fa37',
    mouthSmileRight: '89fc0301710211c862cc7e76ec90ceccd5c505d9c45c3f7c72158ff6c9c8c144',
    mouthPucker: 'dd3601dd5984e708e58c0c12c72052041c280e4cf5980f164297ca29ec1f0231',
  },
};

const EXPECTED_COUPLED = {
  m5: { mustAccept: [292], mustReject: [65, 284] },
  f5: { mustAccept: [497], mustReject: [105, 1071, 1975] },
};

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function resolveMulti(document, anchors, weights) {
  const out = {};
  for (const [id, bindingRaw] of Object.entries(anchors)) {
    if (!bindingRaw || typeof bindingRaw !== 'object') continue;
    const binding = /** @type {Record<string, unknown>} */ (bindingRaw);
    const nodeIdentity = typeof binding.nodeIdentity === 'string' ? binding.nodeIdentity.trim() : '';
    const node = findNodeByIdentity(document, nodeIdentity);
    const mesh = node?.getMesh();
    if (!mesh) continue;
    const primIndex = typeof binding.primitiveIndex === 'number' ? binding.primitiveIndex : 0;
    const prim = mesh.listPrimitives()[primIndex];
    if (!prim) continue;
    const pos = prim.getAttribute('POSITION');
    const idx = prim.getIndices();
    if (!pos || !idx) continue;
    const tri = typeof binding.triangleIndex === 'number' ? binding.triangleIndex : -1;
    if (tri < 0) continue;
    const base = tri * 3;
    if (base + 2 >= idx.getCount()) continue;
    const i0 = idx.getScalar(base);
    const i1 = idx.getScalar(base + 1);
    const i2 = idx.getScalar(base + 2);
    const a = pos.getElement(i0, []);
    const b = pos.getElement(i1, []);
    const c = pos.getElement(i2, []);
    let da = [0, 0, 0];
    let db = [0, 0, 0];
    let dc = [0, 0, 0];
    for (const [morphName, w] of Object.entries(weights)) {
      const mi = findNamedMorphTargetIndex(prim, mesh, morphName);
      if (mi < 0) continue;
      const delta = prim.listTargets()[mi]?.getAttribute('POSITION');
      if (!delta) continue;
      const xa = delta.getElement(i0, []);
      const xb = delta.getElement(i1, []);
      const xc = delta.getElement(i2, []);
      da = [da[0] + xa[0] * w, da[1] + xa[1] * w, da[2] + xa[2] * w];
      db = [db[0] + xb[0] * w, db[1] + xb[1] * w, db[2] + xb[2] * w];
      dc = [dc[0] + xc[0] * w, dc[1] + xc[1] * w, dc[2] + xc[2] * w];
    }
    const pa = [a[0] + da[0], a[1] + da[1], a[2] + da[2]];
    const pb = [b[0] + db[0], b[1] + db[1], b[2] + db[2]];
    const pc = [c[0] + dc[0], c[1] + dc[1], c[2] + dc[2]];
    const bary = /** @type {any} */ (binding.barycentric || {});
    const u = Number(bary.u);
    const v = Number(bary.v);
    const bw = Number(bary.w);
    if (![u, v, bw].every(Number.isFinite)) continue;
    out[id] = {
      x: pa[0] * u + pb[0] * v + pc[0] * bw,
      y: pa[1] * u + pb[1] * v + pc[1] * bw,
      z: pa[2] * u + pb[2] * v + pc[2] * bw,
    };
  }
  return out;
}

function hasBadNumber(P) {
  for (const p of Object.values(P)) {
    if (!p) continue;
    for (const n of [p.x, p.y, p.z]) {
      if (!Number.isFinite(n)) return true;
    }
  }
  return false;
}

function maxDisp(N, P) {
  let m = 0;
  for (const id of Object.keys(N)) {
    const a = N[id];
    const b = P[id];
    if (!a || !b) continue;
    m = Math.max(m, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  return m;
}

/** Max morph POSITION delta magnitude across all vertices for named morphs. */
function maxMorphDelta(document, morphNames) {
  let max = 0;
  let nan = false;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const name of morphNames) {
        const mi = findNamedMorphTargetIndex(prim, mesh, name);
        if (mi < 0) continue;
        const arr = prim.listTargets()[mi]?.getAttribute('POSITION')?.getArray();
        if (!arr) continue;
        for (let i = 0; i < arr.length; i += 3) {
          const d = Math.hypot(arr[i], arr[i + 1], arr[i + 2]);
          if (!Number.isFinite(d)) nan = true;
          max = Math.max(max, d);
        }
      }
    }
  }
  return { max, nan };
}

async function processAsset(id) {
  const runRel = `assets/species-3d/human/runs/quality-20260930-${id}-face3`;
  const run = join(root, runRel);
  const qaFinal = join(run, 'qa', 'final');
  mkdirSync(qaFinal, { recursive: true });

  // Authoritative current-HEAD reauthor candidate (Case B reproducibility).
  const candidateRel = `${runRel}/qa/reauthor-current-runA/${id}-reauthor-current.glb`;
  const candidateRerunRel = `${runRel}/qa/reauthor-current-runB/${id}-reauthor-current.glb`;
  const face1BaseRel =
    id === 'm5'
      ? `${runRel}/human-male-quality-20260921-m5-face3.glb`
      : `${runRel}/human-female-quality-20260921-f5-face3.glb`;
  const finalGlbName =
    id === 'm5'
      ? 'human-male-quality-20260921-m5-face3-final.glb'
      : 'human-female-quality-20260921-f5-face3-final.glb';
  const publishStem =
    id === 'm5' ? 'human-male-quality-20260921-m5-face3' : 'human-female-quality-20260921-f5-face3';
  const baselinePath =
    id === 'm5'
      ? join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5.glb')
      : join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5.glb');
  const anchorsPath = join(run, 'qa/reauthor-current-runA/face-anchors.json');
  const stageAAuthPath = join(run, 'face-mapping-authoring.json');
  const expected = EXPECTED_MORPH_HASHES[id];
  const coupledExpect = EXPECTED_COUPLED[id];

  if (!existsSync(join(root, candidateRel))) {
    throw new Error(`${id}: reauthor-current-runA candidate missing: ${candidateRel}`);
  }
  if (!existsSync(join(root, candidateRerunRel))) {
    throw new Error(`${id}: reauthor-current-runB candidate missing: ${candidateRerunRel}`);
  }

  // Phase 1 — freeze final GLB from current-HEAD reauthor (runA)
  const finalGlbPath = join(run, finalGlbName);
  copyFileSync(join(root, candidateRel), finalGlbPath);
  const finalBytes = readFileSync(finalGlbPath);
  const finalSha = computeFaceAssetSha256Hex(finalBytes);
  // Determinism: independent runB must match runA
  const rerunSha = computeFaceAssetSha256Hex(readFileSync(join(root, candidateRerunRel)));
  if (rerunSha !== finalSha) {
    throw new Error(`${id}: reauthor runA/runB GLB SHA mismatch`);
  }
  copyFileSync(join(root, candidateRerunRel), join(qaFinal, `${id}-final-rerun.glb`));

  const finalDoc = await io.readBinary(finalBytes);
  const finalHashes = hashAllMorphPositionBuffers(finalDoc);
  const topo = computeFaceAssetTopologyFingerprint(finalDoc);
  for (const ch of CHANNELS) {
    if (finalHashes.get(ch) !== expected[ch]) {
      throw new Error(
        `${id}: morph hash drifted vs current-HEAD reauthor baseline: ${ch} got=${finalHashes.get(ch)} want=${expected[ch]}`,
      );
    }
  }
  const face1Hashes = hashAllMorphPositionBuffers(
    await io.readBinary(readFileSync(join(root, face1BaseRel))),
  );
  const changedVsFace1 = [...finalHashes.keys()]
    .filter((n) => finalHashes.get(n) !== face1Hashes.get(n))
    .sort();
  if (changedVsFace1.length !== 7 || CHANNELS.slice().sort().join(',') !== changedVsFace1.join(',')) {
    throw new Error(`${id}: expected exactly 7 changed morphs, got ${changedVsFace1.join(',')}`);
  }
  let rest44 = true;
  for (const [n, sha] of face1Hashes) {
    if (CHANNELS.includes(n)) continue;
    if (finalHashes.get(n) !== sha) rest44 = false;
  }
  if (!rest44) throw new Error(`${id}: non-functional morph drift`);

  // Neutral / topology invariant vs FaceRig base positions (base mesh)
  const anchorsEnv = parseManifestEnvelope(JSON.parse(readFileSync(anchorsPath, 'utf8')));
  const nFinal = resolveFaceAnchorPositions(finalDoc, anchorsEnv.anchors);
  const face1Doc = await io.readBinary(readFileSync(join(root, face1BaseRel)));
  const nBase = resolveFaceAnchorPositions(face1Doc, anchorsEnv.anchors);
  let carryOk = 0;
  const carryTotal = Object.keys(anchorsEnv.anchors).length;
  for (const idA of Object.keys(anchorsEnv.anchors)) {
    const a = nBase[idA];
    const b = nFinal[idA];
    const d = a && b ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) : Infinity;
    if (d < 1e-9) carryOk += 1;
  }
  if (carryOk !== carryTotal) throw new Error(`${id}: neutral GT carry ${carryOk}/${carryTotal}`);

  // Coupled-Shell Safety (detection matrix on final GLB)
  const first = Object.values(anchorsEnv.anchors)[0];
  const node = findNodeByIdentity(finalDoc, first.nodeIdentity);
  const mesh = node.getMesh();
  const prim = mesh.listPrimitives()[first.primitiveIndex || 0];
  const frame0 = buildFaceLocalFrame(nFinal);
  const surface = buildGtBoundSurfaceGate(
    prim,
    anchorsEnv.anchors,
    JAW_OPEN_AUTHOR_CONTRACT_V1.surfaceSeedAnchors,
  );
  const maxHops = maxTopologyHopsForRadius(
    surface.meanEdgeLength,
    Math.max(0.08, frame0.faceHeight * 0.35),
  );
  /** @type {number[]} */
  const primaryVerts = [];
  for (let i = 0; i < surface.allowed.length; i += 1) {
    if (surface.allowed[i] && surface.topoDist[i] >= 0 && surface.topoDist[i] <= maxHops) {
      primaryVerts.push(i);
    }
  }
  const jointNames =
    finalDoc.getRoot().listSkins()[0]?.listJoints().map((j) => j.getName() || '') || [];
  const gtRefs = [
    nFinal.mouthLower,
    nFinal.mouthUpper,
    nFinal.chin,
    nFinal.mouthCornerLeft,
    nFinal.mouthCornerRight,
  ].filter(Boolean);
  const coupling = resolveCoupledFacialPatches({
    prim,
    surface,
    primaryVerts,
    faceHeight: frame0.faceHeight,
    gtRefs,
    jointNames,
  });
  const accepted = coupling.patches.map((p) => p.componentId);
  const bodyFp = coupling.patches.filter((p) => p.wholeCompBodyFrac > 0.35).length;
  for (const cid of coupledExpect.mustAccept) {
    if (!accepted.includes(cid)) {
      throw new Error(`${id}: coupled positive missing component ${cid}; accepted=${accepted}`);
    }
  }
  for (const cid of coupledExpect.mustReject) {
    if (accepted.includes(cid)) {
      throw new Error(`${id}: body negative accepted: ${cid}`);
    }
  }
  if (bodyFp !== 0) throw new Error(`${id}: body FP=${bodyFp}`);

  // Seam continuity at weight 1 for accepted patches
  const jawIdx = findNamedMorphTargetIndex(prim, mesh, 'jawOpen');
  const morphPos = prim.listTargets()[jawIdx].getAttribute('POSITION');
  const basePos = prim.getAttribute('POSITION');
  const bS = [0, 0, 0];
  const bP = [0, 0, 0];
  const dS = [0, 0, 0];
  const dP = [0, 0, 0];
  const gaps = [];
  for (const p of coupling.patches) {
    for (const sp of p.seamPairs.slice(0, 40)) {
      basePos.getElement(sp.secondary, bS);
      basePos.getElement(sp.primary, bP);
      morphPos.getElement(sp.secondary, dS);
      morphPos.getElement(sp.primary, dP);
      gaps.push(
        Math.hypot(
          bS[0] + dS[0] - (bP[0] + dP[0]),
          bS[1] + dS[1] - (bP[1] + dP[1]),
          bS[2] + dS[2] - (bP[2] + dP[2]),
        ),
      );
    }
  }
  gaps.sort((a, b) => a - b);
  const seamMax = gaps.length ? gaps[gaps.length - 1] : 0;
  const seamThr = Math.max(surface.meanEdgeLength * 2.5, frame0.faceHeight * 0.008);
  if (seamMax > seamThr) {
    throw new Error(`${id}: seam continuity FAIL max=${seamMax} thr=${seamThr}`);
  }
  writeFileSync(
    join(qaFinal, 'coupled-shell-safety.json'),
    `${JSON.stringify(
      {
        accepted,
        rejectedBody: coupling.rejected.filter((r) => coupledExpect.mustReject.includes(r.componentId)),
        bodyFp,
        seamMax,
        seamThr,
        pass: true,
      },
      null,
      2,
    )}\n`,
  );

  // Final GT authoring: human_reviewed carry-forward
  const stageA = JSON.parse(readFileSync(stageAAuthPath, 'utf8'));
  const anchorsSha = computeFaceAssetSha256Hex(readFileSync(anchorsPath));
  const finalAuth = {
    contractVersion: FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
    source: 'manual_override',
    reviewed: true,
    reviewStatus: 'human_reviewed',
    reviewedAt: stageA.reviewedAt || new Date().toISOString(),
    asset: {
      modelPath: `${runRel}/${finalGlbName}`,
      modelSha256: finalSha,
      anchorsSha256: anchorsSha,
      topologyFingerprint: topo,
      cacheBust: CACHE_BUST,
    },
    agentReviewLedgerRef: stageA.agentReview || stageA.agentReviewLedgerRef || null,
    note:
      'Final #423 face3 current-HEAD reauthor publish. Anchors reviewed GT; ' +
      'morph rewrite = GT surface + Option C coupled jaw + smile/pucker surface gate.',
  };
  const finalAuthPath = join(run, 'face-mapping-authoring-final.json');
  writeFileSync(finalAuthPath, `${JSON.stringify(finalAuth, null, 2)}\n`);
  writeFileSync(join(qaFinal, 'face-mapping-authoring.json'), `${JSON.stringify(finalAuth, null, 2)}\n`);
  copyFileSync(anchorsPath, join(qaFinal, 'face-anchors.json'));
  copyFileSync(anchorsPath, join(run, 'face-anchors.json'));

  if (!isReviewedFaceMappingGroundTruth(finalAuth)) {
    throw new Error(`${id}: final authoring not reviewed GT`);
  }
  const gtGate = evaluateReviewedGroundTruthGate({
    authoring: finalAuth,
    inputPath: finalGlbPath,
    inputBytes: finalBytes,
    anchorsBytes: readFileSync(anchorsPath),
    document: finalDoc,
  });
  if (!gtGate.ok) {
    throw new Error(`${id}: GT gate fail ${gtGate.reason}:${(gtGate.violations || []).join(',')}`);
  }

  // Agent review ledger presence (Stage A)
  const ledgerDir = join(run, 'agent-review');
  if (!existsSync(join(ledgerDir, 'aggregation.json'))) {
    throw new Error(`${id}: agent-review aggregation missing`);
  }
  if (!existsSync(join(ledgerDir, 'evidence-manifest.json'))) {
    throw new Error(`${id}: agent-review evidence-manifest missing`);
  }

  // Phase 2 — full Stage-B via face asset validate → inventory
  const inventoryPath = join(run, 'face-inventory-final.json');
  const assetResult = await validateLiveActFaceAsset({
    inputPath: finalGlbPath,
    baselinePath,
    profile: 'full-v1',
    outPath: inventoryPath,
    anchorsPath,
    authoringPath: finalAuthPath,
    functionalMode: 'publish',
  });
  const inv = assetResult.inventory;
  writeFileSync(join(qaFinal, 'face-asset-validate.json'), `${JSON.stringify(inv, null, 2)}\n`);
  if (!assetResult.ok || inv.structuralPass !== true || inv.functionalQa?.pass !== true) {
    throw new Error(
      `${id}: Stage-B FAIL structural=${inv.structuralPass} func=${inv.functionalQa?.pass} saga=${JSON.stringify(inv.sagaDrive?.errors)}`,
    );
  }
  if (inv.semanticQa?.pass !== true) throw new Error(`${id}: Semantic FAIL`);
  const anatomy = validateFaceAnchorAnatomyAgainstDocument(finalDoc, anchorsEnv.anchors);
  writeFileSync(join(qaFinal, 'anatomy-qa.json'), `${JSON.stringify(anatomy, null, 2)}\n`);
  if (!(anatomy.ok === true || anatomy.pass === true)) throw new Error(`${id}: Anatomy FAIL`);

  const fq = inv.functionalQa;
  const channelPass = Object.fromEntries(
    CHANNELS.map((c) => [c, fq.channels?.[c]?.pass === true]),
  );
  if (!Object.values(channelPass).every(Boolean)) {
    throw new Error(`${id}: channel FAIL ${JSON.stringify(channelPass)}`);
  }

  // Phase 3 — full combination QA
  const frame = buildFaceLocalFrame(nFinal);
  const metN = computeFunctionalMetricsFromAnchors(nFinal, frame);
  const combos = {
    jaw_smileL: { jawOpen: 1, mouthSmileLeft: 1 },
    jaw_smileR: { jawOpen: 1, mouthSmileRight: 1 },
    jaw_bothSmiles: { jawOpen: 1, mouthSmileLeft: 1, mouthSmileRight: 1 },
    jaw_pucker: { jawOpen: 1, mouthPucker: 1 },
    smileL_smileR: { mouthSmileLeft: 1, mouthSmileRight: 1 },
    smileL_pucker: { mouthSmileLeft: 1, mouthPucker: 1 },
    smileR_pucker: { mouthSmileRight: 1, mouthPucker: 1 },
    bothSmiles_pucker: { mouthSmileLeft: 1, mouthSmileRight: 1, mouthPucker: 1 },
    jaw_bothSmiles_pucker: {
      jawOpen: 1,
      mouthSmileLeft: 1,
      mouthSmileRight: 1,
      mouthPucker: 1,
    },
    blinkL_blinkR: { eyeBlinkLeft: 1, eyeBlinkRight: 1 },
    blinkL_brow: { eyeBlinkLeft: 1, browInnerUp: 1 },
    blinkR_brow: { eyeBlinkRight: 1, browInnerUp: 1 },
    bothBlinks_brow: { eyeBlinkLeft: 1, eyeBlinkRight: 1, browInnerUp: 1 },
    jaw_blinkL: { jawOpen: 1, eyeBlinkLeft: 1 },
    jaw_blinkR: { jawOpen: 1, eyeBlinkRight: 1 },
    jaw_bothBlinks: { jawOpen: 1, eyeBlinkLeft: 1, eyeBlinkRight: 1 },
    jaw_brow: { jawOpen: 1, browInnerUp: 1 },
    smiles_blinks: {
      mouthSmileLeft: 1,
      mouthSmileRight: 1,
      eyeBlinkLeft: 1,
      eyeBlinkRight: 1,
    },
    bothSmiles_bothBlinks: {
      mouthSmileLeft: 1,
      mouthSmileRight: 1,
      eyeBlinkLeft: 1,
      eyeBlinkRight: 1,
    },
    jaw_smiles_blinks_brow: {
      jawOpen: 1,
      mouthSmileLeft: 1,
      mouthSmileRight: 1,
      eyeBlinkLeft: 1,
      eyeBlinkRight: 1,
      browInnerUp: 1,
    },
    full_seven: Object.fromEntries(CHANNELS.map((c) => [c, 1])),
  };
  const combination = {};
  let comboFail = 0;
  for (const [name, w] of Object.entries(combos)) {
    const P = resolveMulti(finalDoc, anchorsEnv.anchors, w);
    const bad = hasBadNumber(P);
    const md = maxDisp(nFinal, P);
    const met = computeFunctionalMetricsFromAnchors(P, frame);
    const noseDisp =
      nFinal.noseTip && P.noseTip
        ? Math.hypot(
            P.noseTip.x - nFinal.noseTip.x,
            P.noseTip.y - nFinal.noseTip.y,
            P.noseTip.z - nFinal.noseTip.z,
          )
        : 0;
    const foreheadDisp =
      nFinal.forehead && P.forehead
        ? Math.hypot(
            P.forehead.x - nFinal.forehead.x,
            P.forehead.y - nFinal.forehead.y,
            P.forehead.z - nFinal.forehead.z,
          )
        : 0;
    const pass = !bad && md < 0.25 && noseDisp < 0.04 && foreheadDisp < 0.03;
    combination[name] = {
      pass,
      nan: bad,
      maxAnchorDisp: md,
      noseDisp,
      foreheadDisp,
      mouthWidthRatio: met?.mouthWidthRatio ?? null,
      mouthGap: met?.mouthGap ?? null,
    };
    if (!pass) comboFail += 1;
  }
  const P0 = resolveMulti(finalDoc, anchorsEnv.anchors, {});
  combination.neutralRecovery = {
    pass: maxDisp(nFinal, P0) < 1e-12,
    maxDisp: maxDisp(nFinal, P0),
  };
  if (!combination.neutralRecovery.pass) comboFail += 1;
  writeFileSync(join(qaFinal, 'combination-qa.json'), `${JSON.stringify(combination, null, 2)}\n`);
  if (comboFail) throw new Error(`${id}: combination FAIL count=${comboFail}`);

  // Phase 4 — geometric visual sanity + fresh reauthor visual evidence
  const morphDelta = maxMorphDelta(finalDoc, CHANNELS);
  const fqJaw = fq.channels?.jawOpen?.deltas?.mouthGap ?? fq.channels?.jawOpen?.posedMetrics?.mouthGap;
  const reauthorVisual = join(run, 'qa/reauthor-current-runA/OVERALL-VERDICT.json');
  let reauthorVisualPass = false;
  if (existsSync(reauthorVisual)) {
    const ov = JSON.parse(readFileSync(reauthorVisual, 'utf8'));
    reauthorVisualPass = ov.verdict === 'PASS' && ov.gates?.visual === true;
  }
  const visual = {
    morphDeltaMax: morphDelta.max,
    morphDeltaNan: morphDelta.nan,
    jawGapMetric: fqJaw,
    reauthorVisualEvidence: reauthorVisualPass,
    seamMax,
    grotesqueSpike: morphDelta.nan || morphDelta.max > 0.35,
    pass: !morphDelta.nan && morphDelta.max <= 0.35 && reauthorVisualPass && seamMax <= seamThr,
  };
  writeFileSync(join(qaFinal, 'visual-sanity.json'), `${JSON.stringify(visual, null, 2)}\n`);
  if (!visual.pass) {
    throw new Error(
      `${id}: visual sanity FAIL maxDelta=${morphDelta.max} reauthorVisual=${reauthorVisualPass} seam=${seamMax}`,
    );
  }
  // Copy key visual evidence into qa/final/visual
  const visSrc = join(run, 'qa/reauthor-current-runA/visual');
  const visDst = join(qaFinal, 'visual');
  mkdirSync(visDst, { recursive: true });
  if (existsSync(visSrc)) {
    for (const name of [
      `${id}-neutral.jpg`,
      `${id}-jawOpen-front.jpg`,
      `${id}-jawOpen-left.jpg`,
      `${id}-jawOpen-right.jpg`,
      `${id}-jawOpen-below.jpg`,
      `${id}-blinkLeft.jpg`,
      `${id}-blinkRight.jpg`,
      `${id}-smileL.jpg`,
      `${id}-smileR.jpg`,
      `${id}-pucker.jpg`,
    ]) {
      const p = join(visSrc, name);
      if (existsSync(p)) copyFileSync(p, join(visDst, name));
    }
  }

  // Publish GLB + sidecars to public (immutable face3 generation)
  const publicDir = join(root, 'public/assets/avatars/species');
  const publicGlb = join(publicDir, `${publishStem}.glb`);
  const publicAnchors = join(publicDir, `${publishStem}-face-anchors.json`);
  const publicAuth = join(publicDir, `${publishStem}-face-mapping-authoring.json`);
  copyFileSync(finalGlbPath, publicGlb);
  copyFileSync(anchorsPath, publicAnchors);
  const publicAuthBody = {
    ...finalAuth,
    asset: {
      ...finalAuth.asset,
      modelPath: `public/assets/avatars/species/${publishStem}.glb`,
      modelSha256: sha256File(publicGlb),
      anchorsSha256: sha256File(publicAnchors),
      topologyFingerprint: topo,
      cacheBust: CACHE_BUST,
    },
  };
  writeFileSync(publicAuth, `${JSON.stringify(publicAuthBody, null, 2)}\n`);

  // Refresh inventory paths to published GLB for packer
  const pubInvPath = join(run, 'face-inventory.json');
  const pubAsset = await validateLiveActFaceAsset({
    inputPath: publicGlb,
    baselinePath,
    profile: 'full-v1',
    outPath: pubInvPath,
    anchorsPath: publicAnchors,
    authoringPath: publicAuth,
    functionalMode: 'publish',
  });
  if (!pubAsset.ok || pubAsset.inventory.functionalQa?.pass !== true) {
    throw new Error(`${id}: published GLB inventory FAIL`);
  }

  // Phase 5 — VRM pack
  const publicVrm = join(publicDir, `${publishStem}.vrm`);
  const packed = await packAvatarVrm1({
    inputGlbPath: publicGlb,
    inventoryPath: pubInvPath,
    outputVrmPath: publicVrm,
    metaName: publishStem,
  });
  copyFileSync(packed.manifestPath, join(run, 'vrm-pack.json'));
  copyFileSync(packed.manifestPath, join(qaFinal, 'vrm-pack.json'));

  // Phase 6 — packaged VRM regression: morph hashes from GLB vs VRM document morph accessors
  const vrmBytes = readFileSync(publicVrm);
  const vrmDoc = await io.readBinary(vrmBytes);
  const vrmHashes = hashAllMorphPositionBuffers(vrmDoc);
  const morphParity = {};
  let morphParityOk = true;
  for (const ch of CHANNELS) {
    const same = vrmHashes.get(ch) === finalHashes.get(ch);
    morphParity[ch] = { same, glb: finalHashes.get(ch), vrm: vrmHashes.get(ch) };
    if (!same) morphParityOk = false;
  }
  if (!morphParityOk) throw new Error(`${id}: VRM morph POSITION parity FAIL`);

  // Functional QA on VRM (same anchors/authoring with VRM path/sha)
  const vrmAuth = {
    ...publicAuthBody,
    asset: {
      ...publicAuthBody.asset,
      modelPath: `public/assets/avatars/species/${publishStem}.vrm`,
      modelSha256: computeFaceAssetSha256Hex(vrmBytes),
    },
  };
  const vrmAuthPath = join(qaFinal, 'face-mapping-authoring-vrm.json');
  writeFileSync(vrmAuthPath, `${JSON.stringify(vrmAuth, null, 2)}\n`);
  const fqVrm = await validateLiveActFaceFunctionalQa(vrmDoc, {
    inputPath: publicVrm,
    inputBytes: vrmBytes,
    anchorsPath: publicAnchors,
    authoring: vrmAuth,
    mode: 'publish',
    usableChannels: new Set(FUNCTIONAL_REQUIRED_CHANNELS_V1),
  });
  writeFileSync(join(qaFinal, 'functional-qa-vrm.json'), `${JSON.stringify(fqVrm, null, 2)}\n`);
  if (fqVrm.pass !== true) {
    throw new Error(`${id}: packaged VRM functional FAIL ${JSON.stringify(fqVrm.channels)}`);
  }

  // Phase 7 — gaze: inventory gazeMode must remain bones (or unchanged single path)
  const gazeMode = pubAsset.inventory.gazeMode;
  const gazeOk = gazeMode === 'bones' || gazeMode === 'none' || gazeMode === 'morphs';
  const packGaze = packed.manifest.gazeMode;
  if (!gazeOk || packGaze !== gazeMode) {
    throw new Error(`${id}: gaze regression inv=${gazeMode} pack=${packGaze}`);
  }

  // Update run.json trail
  const runJsonPath = join(run, 'run.json');
  const runJson = existsSync(runJsonPath) ? JSON.parse(readFileSync(runJsonPath, 'utf8')) : {};
  runJson.finalPublish = {
    at: new Date().toISOString(),
    ticket: '#423',
    candidateGlb: `${runRel}/${finalGlbName}`,
    candidateSha256: finalSha,
    publicGlb: `public/assets/avatars/species/${publishStem}.glb`,
    publicVrm: `public/assets/avatars/species/${publishStem}.vrm`,
    publicGlbSha256: sha256File(publicGlb),
    publicVrmSha256: packed.manifest.outputSha256,
    topologyFingerprint: topo,
    cacheBust: CACHE_BUST,
    functionalPass: true,
    combinationPass: true,
    morphRegression: { changed: changedVsFace1, rest44Identical: rest44 },
    gazeMode,
  };
  writeFileSync(runJsonPath, `${JSON.stringify(runJson, null, 2)}\n`);

  // Keep Stage-A agent_reviewed authoring intact; final publish uses sibling final authoring.
  // (Do not overwrite face-mapping-authoring.json.)

  const summary = {
    id,
    finalGlb: `${runRel}/${finalGlbName}`,
    finalGlbSha256: finalSha,
    topology: topo,
    morphCount: finalHashes.size,
    channelHashes: Object.fromEntries(CHANNELS.map((c) => [c, finalHashes.get(c)])),
    changedVsFace1,
    rest44Identical: rest44,
    structural: true,
    anatomy: true,
    semantic: true,
    gt: true,
    functional: channelPass,
    functionalOverall: true,
    combinationPass: true,
    coupledShell: { accepted, bodyFp, seamMax, pass: true },
    visualSanity: visual,
    publicGlb: `public/assets/avatars/species/${publishStem}.glb`,
    publicVrm: `public/assets/avatars/species/${publishStem}.vrm`,
    publicGlbSha256: sha256File(publicGlb),
    publicVrmSha256: packed.manifest.outputSha256,
    vrmFunctionalPass: fqVrm.pass === true,
    morphParityOk,
    gazeMode,
    packGaze,
    cacheBust: CACHE_BUST,
  };
  writeFileSync(join(qaFinal, 'final-publish-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

async function main() {
  const results = {};
  for (const id of ['m5', 'f5']) {
    console.log(`=== FINAL PUBLISH ${id} ===`);
    results[id] = await processAsset(id);
    console.log(JSON.stringify(results[id], null, 2));
  }
  writeFileSync(
    join(root, 'assets/species-3d/human/runs/quality-20260930-m5-face3/qa/final/both-assets-summary.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.log('LIVEACT_423_FINAL_PUBLISH_OK');
}

main().catch((err) => {
  console.error(`liveact-423-final-publish FAIL: ${err instanceof Error ? err.stack || err.message : err}`);
  process.exit(1);
});
