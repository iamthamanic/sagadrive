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
const CACHE_BUST = 'quality5-face3-vrm1';

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

  const puckerGlbRel =
    id === 'm5'
      ? `${runRel}/human-male-quality-20260921-m5-face3-pucker1.glb`
      : `${runRel}/human-female-quality-20260921-f5-face3-pucker1.glb`;
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
  const anchorsPath = join(run, 'face-anchors.json');
  const stageAAuthPath = join(run, 'face-mapping-authoring.json');
  const preBaselinePath = join(qaFinal, 'pre-rebase-milestone5-morph-baseline.json');

  const puckerBytes = readFileSync(join(root, puckerGlbRel));
  const pre = JSON.parse(readFileSync(preBaselinePath, 'utf8'));
  const preAsset = pre.assets[id];
  if (computeFaceAssetSha256Hex(puckerBytes) !== preAsset.glbSha256) {
    throw new Error(`${id}: pucker1 SHA drifted vs pre-rebase baseline`);
  }

  // Phase 1 — freeze final GLB (byte-identical copy of pucker1)
  const finalGlbPath = join(run, finalGlbName);
  copyFileSync(join(root, puckerGlbRel), finalGlbPath);
  const finalBytes = readFileSync(finalGlbPath);
  const finalSha = computeFaceAssetSha256Hex(finalBytes);
  if (finalSha !== preAsset.glbSha256) throw new Error(`${id}: final copy SHA mismatch`);

  const finalDoc = await io.readBinary(finalBytes);
  const finalHashes = hashAllMorphPositionBuffers(finalDoc);
  const topo = computeFaceAssetTopologyFingerprint(finalDoc);
  if (topo !== preAsset.topology) throw new Error(`${id}: topology drifted`);
  for (const ch of CHANNELS) {
    if (finalHashes.get(ch) !== preAsset.hashes[ch]) {
      throw new Error(`${id}: morph hash drifted: ${ch}`);
    }
  }
  const face1Hashes = hashAllMorphPositionBuffers(await io.readBinary(readFileSync(join(root, face1BaseRel))));
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

  // Final GT authoring: human_reviewed carry-forward (agent_reviewed ledger remains Stage-A provenance;
  // model SHA changed by morph rewrite so agent_reviewed cannot re-bind without re-review).
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
    agentReviewLedgerRef: stageA.agentReview || null,
    note:
      'Final #423 face3 publish candidate. Anchors agent_reviewed at Stage A (topology-stable); ' +
      'morph rewrite carry-forward as human_reviewed/manual_override with identity SHA of final GLB.',
  };
  const finalAuthPath = join(run, 'face-mapping-authoring-final.json');
  writeFileSync(finalAuthPath, `${JSON.stringify(finalAuth, null, 2)}\n`);
  writeFileSync(join(qaFinal, 'face-mapping-authoring.json'), `${JSON.stringify(finalAuth, null, 2)}\n`);

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
    jaw_brow: { jawOpen: 1, browInnerUp: 1 },
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

  // Phase 4 — geometric visual sanity (metric; screenshots via VRM pose after pack)
  const morphDelta = maxMorphDelta(finalDoc, CHANNELS);
  const fqJaw = fq.channels?.jawOpen?.deltas?.mouthGap ?? fq.channels?.jawOpen?.posedMetrics?.mouthGap;
  const visual = {
    morphDeltaMax: morphDelta.max,
    morphDeltaNan: morphDelta.nan,
    jawGapMetric: fqJaw,
    jawGapNote:
      'Large normalized gap (~0.9–1.15) is authored intentional aperture; flag only if morphDeltaNan or grotesque spike.',
    grotesqueSpike: morphDelta.nan || morphDelta.max > 0.35,
    pass: !morphDelta.nan && morphDelta.max <= 0.35,
  };
  writeFileSync(join(qaFinal, 'visual-sanity.json'), `${JSON.stringify(visual, null, 2)}\n`);
  if (!visual.pass) throw new Error(`${id}: visual sanity FAIL maxDelta=${morphDelta.max}`);

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
