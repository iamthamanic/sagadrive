/**
 * liveact-face-functional-morph-author — GT-aware functional shape-key rewrite (#423).
 * Location: scripts/lib/liveact-face-functional-morph-author.mjs
 *
 * Design decision: from reviewed semantic anchors + mesh topology, deterministically
 * rewrite named SagaDrive face morph POSITION accessors. Milestone 1: jawOpen only.
 *
 * Does not import Functional QA thresholds as an optimization loop.
 * Domain/runtime code must not import this module.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { parseManifestEnvelope, validateFaceAnchorsAgainstDocument } from './liveact-face-anchor-validate.mjs';
import { resolveFaceAnchorPositions } from './liveact-face-anchor-anatomy-validate.mjs';
import { findNodeByIdentity } from './liveact-face-anchor-glb.mjs';
import {
  FACE_FUNCTIONAL_MORPH_AUTHOR_CONTRACT_VERSION,
  FACE_FUNCTIONAL_MORPH_AUTHOR_PROFILE_VERSION,
  FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1,
  JAW_OPEN_AUTHOR_CONTRACT_V1,
} from './liveact-face-functional-morph-profile-v1.mjs';
import {
  buildFaceLocalFrame,
  computeFaceAssetSha256Hex,
  computeFaceAssetTopologyFingerprint,
  evaluateReviewedGroundTruthGate,
  resolveFaceAnchorPositionsPosed,
  computeFunctionalMetricsFromAnchors,
} from './liveact-face-functional-validate.mjs';
/**
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {import('@gltf-transform/core').Mesh} mesh
 * @param {string} morphName
 */
export function findNamedMorphTargetIndex(prim, mesh, morphName) {
  const primExtras = prim.getExtras() || {};
  const meshExtras = mesh?.getExtras?.() || {};
  const names = Array.isArray(primExtras.targetNames)
    ? primExtras.targetNames.map(String)
    : Array.isArray(meshExtras.targetNames)
      ? meshExtras.targetNames.map(String)
      : [];
  const targets = prim.listTargets();
  for (let i = 0; i < targets.length; i += 1) {
    const name =
      typeof names[i] === 'string' && names[i].trim() ? String(names[i]).trim() : `target_${i}`;
    if (name === morphName) return i;
  }
  return -1;
}

/**
 * @param {Float32Array|import('@gltf-transform/core').TypedArray} arr
 */
export function hashMorphPositionArray(arr) {
  const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @returns {Map<string, string>}
 */
export function hashAllMorphPositionBuffers(document) {
  /** @type {Map<string, string>} */
  const out = new Map();
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const targets = prim.listTargets();
      const primExtras = prim.getExtras() || {};
      const meshExtras = mesh.getExtras() || {};
      const localNames = Array.isArray(primExtras.targetNames)
        ? primExtras.targetNames.map(String)
        : Array.isArray(meshExtras.targetNames)
          ? meshExtras.targetNames.map(String)
          : [];
      for (let i = 0; i < targets.length; i += 1) {
        const name =
          typeof localNames[i] === 'string' && localNames[i].trim()
            ? String(localNames[i]).trim()
            : `target_${i}`;
        const pos = targets[i].getAttribute('POSITION');
        if (!pos) continue;
        const arr = pos.getArray();
        if (!arr) continue;
        out.set(name, hashMorphPositionArray(arr));
      }
    }
  }
  return out;
}

/**
 * @param {{ x: number; y: number; z: number }} a
 * @param {{ x: number; y: number; z: number }} b
 */
function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Deterministic jawOpen falloff weight in [0,1].
 * @param {{ x: number; y: number; z: number }} p
 * @param {Record<string, { x: number; y: number; z: number }>} refs
 * @param {number} faceH
 * @param {typeof JAW_OPEN_AUTHOR_CONTRACT_V1} contract
 */
export function computeJawOpenVertexWeight(p, refs, faceH, contract = JAW_OPEN_AUTHOR_CONTRACT_V1) {
  const rMove = faceH * contract.moveRadiusFaceH;
  const wLower = Math.max(0, 1 - dist3(p, refs.mouthLower) / rMove) ** 1.15;
  const wChin = Math.max(0, 1 - dist3(p, refs.chin) / (rMove * 1.2)) ** 1.05;
  let w = Math.max(wLower, wChin);
  const midY = (refs.mouthUpper.y + refs.mouthLower.y) / 2;
  if (p.y < midY && Math.abs(p.x - refs.chin.x) < faceH * 0.38) {
    const band = Math.max(0, 1 - Math.abs(p.y - refs.mouthLower.y) / (faceH * 0.35));
    w = Math.max(w, 0.45 * band);
  }
  if (p.y > refs.mouthUpper.y + faceH * 0.02) w *= 0.05;
  if (dist3(p, refs.noseTip) < faceH * 0.12) w = 0;
  if (dist3(p, refs.forehead) < faceH * 0.25) w = 0;
  return Math.max(0, Math.min(1, w));
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 * @param {typeof JAW_OPEN_AUTHOR_CONTRACT_V1} contract
 */
function rewriteJawOpenMorph(document, anchors, contract) {
  const sampleBinding = /** @type {Record<string, unknown>} */ (anchors.mouthUpper);
  const nodeIdentity = String(sampleBinding.nodeIdentity || '').trim();
  const node = findNodeByIdentity(document, nodeIdentity);
  const mesh = node?.getMesh();
  if (!mesh) {
    throw new Error(`jawOpen author: meshed node missing for ${nodeIdentity || '(empty)'}`);
  }
  const primIndex = typeof sampleBinding.primitiveIndex === 'number' ? sampleBinding.primitiveIndex : 0;
  const prim = mesh.listPrimitives()[primIndex];
  if (!prim) throw new Error(`jawOpen author: primitive ${primIndex} missing`);

  const morphIndex = findNamedMorphTargetIndex(prim, mesh, 'jawOpen');
  if (morphIndex < 0) throw new Error('jawOpen author: morph target jawOpen missing');
  const target = prim.listTargets()[morphIndex];
  const morphPos = target.getAttribute('POSITION');
  const basePos = prim.getAttribute('POSITION');
  if (!morphPos || !basePos) throw new Error('jawOpen author: POSITION accessors missing');

  const neutral = resolveFaceAnchorPositions(document, anchors);
  for (const id of contract.requiredAnchors) {
    if (!neutral[id]) throw new Error(`jawOpen author: required anchor unresolved: ${id}`);
  }
  const frame = buildFaceLocalFrame(neutral);
  if (!frame) throw new Error('jawOpen author: face local frame incomplete');

  const refs = {
    mouthUpper: neutral.mouthUpper,
    mouthLower: neutral.mouthLower,
    chin: neutral.chin,
    noseTip: neutral.noseTip,
    forehead: neutral.forehead,
  };

  const n = basePos.getCount();
  const arr = new Float32Array(n * 3); // full rewrite — discard ICT deltas
  const amp = frame.faceHeight * contract.ampFaceH;
  const down = { x: -frame.up.x, y: -frame.up.y, z: -frame.up.z };
  const back = {
    x: -frame.forward.x * contract.backBias,
    y: -frame.forward.y * contract.backBias,
    z: -frame.forward.z * contract.backBias,
  };

  let affected = 0;
  let maxW = 0;
  let sumW = 0;
  let maxDisp = 0;
  let sumDisp = 0;
  const el = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    basePos.getElement(i, el);
    const p = { x: el[0], y: el[1], z: el[2] };
    const w = computeJawOpenVertexWeight(p, refs, frame.faceHeight, contract);
    if (w <= 1e-8) continue;
    affected += 1;
    maxW = Math.max(maxW, w);
    sumW += w;
    const dx = (down.x + back.x) * amp * w;
    const dy = (down.y + back.y) * amp * w;
    const dz = (down.z + back.z) * amp * w;
    arr[i * 3] = dx;
    arr[i * 3 + 1] = dy;
    arr[i * 3 + 2] = dz;
    const d = Math.hypot(dx, dy, dz);
    maxDisp = Math.max(maxDisp, d);
    sumDisp += d;
  }
  morphPos.setArray(arr);

  const posed = resolveFaceAnchorPositionsPosed(document, anchors, 'jawOpen', 1);
  const metricsN = computeFunctionalMetricsFromAnchors(neutral, frame);
  const metricsP = computeFunctionalMetricsFromAnchors(posed, frame);
  const gapDelta = (metricsP?.mouthGap ?? 0) - (metricsN?.mouthGap ?? 0);

  const disp = (id) => {
    const a = neutral[id];
    const b = posed[id];
    if (!a || !b) return null;
    return dist3(a, b);
  };

  return {
    morphIndex,
    nodeIdentity,
    primitiveIndex: primIndex,
    vertexCount: n,
    affectedVertices: affected,
    maxWeight: maxW,
    meanWeightAffected: affected ? sumW / affected : 0,
    maxDisplacement: maxDisp,
    meanDisplacementAffected: affected ? sumDisp / affected : 0,
    amp,
    faceHeight: frame.faceHeight,
    morphPositionSha256: hashMorphPositionArray(arr),
    mouthGapNeutral: metricsN?.mouthGap ?? null,
    mouthGapJawOpen1: metricsP?.mouthGap ?? null,
    mouthGapDelta: gapDelta,
    displacements: {
      mouthUpper: disp('mouthUpper'),
      mouthLower: disp('mouthLower'),
      chin: disp('chin'),
      noseTip: disp('noseTip'),
      forehead: disp('forehead'),
      mouthCornerLeft: disp('mouthCornerLeft'),
      mouthCornerRight: disp('mouthCornerRight'),
    },
  };
}

/**
 * @param {{
 *   inputPath: string;
 *   outputPath: string;
 *   anchorsPath: string;
 *   authoringPath: string;
 *   channel: string;
 *   root?: string;
 *   reportPath?: string;
 * }} opts
 */
export async function authorLiveActFunctionalMorph(opts) {
  const root = opts.root || process.cwd();
  const inputPath = resolve(root, opts.inputPath);
  const outputPath = resolve(root, opts.outputPath);
  const anchorsPath = resolve(root, opts.anchorsPath);
  const authoringPath = resolve(root, opts.authoringPath);
  const channel = String(opts.channel || '').trim();

  if (!FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes(channel)) {
    throw new Error(`unsupported_channel:${channel || '(empty)'}`);
  }
  if (!existsSync(inputPath)) throw new Error(`input missing: ${inputPath}`);
  if (!existsSync(anchorsPath)) throw new Error(`anchors missing: ${anchorsPath}`);
  if (!existsSync(authoringPath)) throw new Error(`authoring missing: ${authoringPath}`);

  const inputBytes = readFileSync(inputPath);
  const anchorsBytes = readFileSync(anchorsPath);
  const authoring = JSON.parse(readFileSync(authoringPath, 'utf8'));
  const anchorsEnvelope = parseManifestEnvelope(JSON.parse(anchorsBytes.toString('utf8')));
  if (!anchorsEnvelope.ok) {
    throw new Error(`anchors_manifest_invalid:${anchorsEnvelope.errors.join(',')}`);
  }

  const io = new NodeIO();
  const document = await io.readBinary(inputBytes);
  const topologyFingerprint = computeFaceAssetTopologyFingerprint(document);
  const inputSha256 = computeFaceAssetSha256Hex(inputBytes);

  // isReviewedFaceMappingGroundTruth (via gate) already verifies agent_reviewed ledgers.
  const gt = evaluateReviewedGroundTruthGate({
    authoring,
    inputPath: opts.inputPath,
    inputBytes,
    anchorsBytes,
    document,
  });
  if (!gt.ok) {
    throw new Error(`ground_truth_rejected:${gt.reason}:${(gt.violations || []).join(',')}`);
  }

  const anchorValidate = validateFaceAnchorsAgainstDocument(document, anchorsEnvelope.anchors);
  if (!anchorValidate.ok) {
    throw new Error(`anchors_binding_invalid:${anchorValidate.errors.join(',')}`);
  }

  const beforeHashes = hashAllMorphPositionBuffers(document);
  const beforeJaw = beforeHashes.get('jawOpen') || null;

  let channelStats;
  if (channel === 'jawOpen') {
    channelStats = rewriteJawOpenMorph(
      document,
      /** @type {Record<string, unknown>} */ (anchorsEnvelope.anchors),
      JAW_OPEN_AUTHOR_CONTRACT_V1,
    );
  } else {
    throw new Error(`unsupported_channel:${channel}`);
  }

  const afterHashes = hashAllMorphPositionBuffers(document);
  /** @type {string[]} */
  const changedMorphs = [];
  for (const [name, sha] of afterHashes) {
    if (beforeHashes.get(name) !== sha) changedMorphs.push(name);
  }
  for (const name of beforeHashes.keys()) {
    if (!afterHashes.has(name)) changedMorphs.push(name);
  }
  const uniqueChanged = [...new Set(changedMorphs)].sort();
  if (uniqueChanged.length !== 1 || uniqueChanged[0] !== channel) {
    throw new Error(`morph_regression_unexpected_changes:${uniqueChanged.join(',')}`);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  const outBytes = Buffer.from(await io.writeBinary(document));
  writeFileSync(outputPath, outBytes);
  const outputSha256 = computeFaceAssetSha256Hex(outBytes);

  // Determinism: re-author from the same input in-memory once more and compare morph hash.
  const doc2 = await io.readBinary(inputBytes);
  const stats2 = rewriteJawOpenMorph(
    doc2,
    /** @type {Record<string, unknown>} */ (anchorsEnvelope.anchors),
    JAW_OPEN_AUTHOR_CONTRACT_V1,
  );
  if (stats2.morphPositionSha256 !== channelStats.morphPositionSha256) {
    throw new Error('jawOpen_author_nondeterministic_morph_hash');
  }

  const report = {
    contractVersion: FACE_FUNCTIONAL_MORPH_AUTHOR_CONTRACT_VERSION,
    profileVersion: FACE_FUNCTIONAL_MORPH_AUTHOR_PROFILE_VERSION,
    channel,
    inputPath: opts.inputPath,
    outputPath: opts.outputPath,
    anchorsPath: opts.anchorsPath,
    authoringPath: opts.authoringPath,
    inputSha256,
    outputSha256,
    topologyFingerprint,
    anchorsSha256: computeFaceAssetSha256Hex(anchorsBytes),
    groundTruth: {
      ok: true,
      reason: gt.reason || null,
      reviewStatus: authoring.reviewStatus || null,
    },
    beforeJawOpenMorphSha256: beforeJaw,
    afterJawOpenMorphSha256: channelStats.morphPositionSha256,
    deterministicRerunMorphSha256: stats2.morphPositionSha256,
    morphsUnchangedExceptChannel: true,
    morphCount: afterHashes.size,
    changedMorphs: uniqueChanged,
    channelStats,
    authoredAt: new Date().toISOString(),
  };

  if (opts.reportPath) {
    const reportAbs = resolve(root, opts.reportPath);
    mkdirSync(dirname(reportAbs), { recursive: true });
    writeFileSync(reportAbs, `${JSON.stringify(report, null, 2)}\n`);
  }

  return report;
}

/**
 * @param {string[]} argv
 */
export function parseFunctionalMorphAuthorArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (
      a === '--input' ||
      a === '--output' ||
      a === '--anchors' ||
      a === '--authoring' ||
      a === '--channel' ||
      a === '--report'
    ) {
      const v = argv[++i];
      if (!v || v.startsWith('--')) throw new Error(`missing value for ${a}`);
      out[a.slice(2)] = v;
      continue;
    }
    if (a === '--help' || a === '-h') {
      out.help = '1';
      continue;
    }
    throw new Error(`unknown arg: ${a}`);
  }
  if (out.help) return /** @type {any} */ (out);
  if (!out.input || !out.output || !out.anchors || !out.authoring || !out.channel) {
    throw new Error('required: --input --output --anchors --authoring --channel');
  }
  return /** @type {any} */ (out);
}
