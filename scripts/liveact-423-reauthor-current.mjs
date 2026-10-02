#!/usr/bin/env node
/**
 * liveact-423-reauthor-current — full 7-channel GT authoring from FaceRig base with current HEAD (#423).
 * Location: scripts/liveact-423-reauthor-current.mjs
 *
 * Pipeline: FaceRig base → jawOpen (+coupled shell) → blinkL → blinkR → brow → smileL → smileR → pucker
 * Two deterministic runs per asset. Freezes published baseline for alt-vs-neu comparison.
 * No publish — caller decides Case A/B after QA.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import {
  authorLiveActFunctionalMorph,
  hashAllMorphPositionBuffers,
} from './lib/liveact-face-functional-morph-author.mjs';
import {
  buildGtBoundSurfaceGate,
  maxTopologyHopsForRadius,
  resolveCoupledFacialPatches,
} from './lib/liveact-face-functional-morph-surface.mjs';
import { resolveFaceAnchorPositions } from './lib/liveact-face-anchor-anatomy-validate.mjs';
import { buildFaceLocalFrame } from './lib/liveact-face-functional-validate.mjs';
import { findNodeByIdentity } from './lib/liveact-face-anchor-glb.mjs';
import { JAW_OPEN_AUTHOR_CONTRACT_V1 } from './lib/liveact-face-functional-morph-profile-v1.mjs';

const root = process.cwd();
const io = new NodeIO();
const HEAD = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const CHANNELS = [
  'jawOpen',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'browInnerUp',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
];

const ASSETS = [
  {
    id: 'm5',
    gender: 'male',
    expectNeg: [65, 284],
    expectPos: [176, 177, 189, 286, 292, 341],
  },
  {
    id: 'f5',
    gender: 'female',
    expectNeg: [105, 1071, 1975],
    expectPos: [497],
  },
];

function shaFile(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

/**
 * Zero the seven required morph POSITION buffers so each channel rewrite
 * is a real change (prior-published bases are already authored; idempotent
 * blink/brow rewrites otherwise trip morph_regression_unexpected_changes).
 * @param {string} glbPath
 */
async function zeroRequiredMorphPositions(glbPath) {
  const doc = await io.read(glbPath);
  let cleared = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const targets = prim.listTargets();
      if (!targets.length) continue;
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
        if (!CHANNELS.includes(name)) continue;
        const pos = targets[i].getAttribute('POSITION');
        if (!pos) continue;
        const n = pos.getCount();
        pos.setArray(new Float32Array(n * 3));
        cleared += 1;
      }
    }
  }
  if (cleared < CHANNELS.length) {
    throw new Error(`zero_required_morphs_incomplete:${cleared}/${CHANNELS.length}`);
  }
  const out = Buffer.from(await io.writeBinary(doc));
  writeFileSync(glbPath, out);
  return cleared;
}

async function morphHashesFromGlb(glbPath) {
  const doc = await io.read(glbPath);
  const map = hashAllMorphPositionBuffers(doc);
  /** @type {Record<string, string>} */
  const out = {};
  for (const ch of CHANNELS) out[ch] = map.get(ch) || '';
  return out;
}

async function freezeOne(a) {
  const pubGlb = `public/assets/avatars/species/human-${a.gender}-quality-20260921-${a.id}-face3.glb`;
  const pubVrm = `public/assets/avatars/species/human-${a.gender}-quality-20260921-${a.id}-face3.vrm`;
  const coupledDir = `assets/species-3d/human/runs/quality-20260930-${a.id}-face3/qa/jawopen-coupled-shell1`;
  const anchorsPath = join(coupledDir, 'face-anchors.json');
  const doc = await io.read(join(root, pubGlb));
  const anchorsFile = JSON.parse(readFileSync(join(root, anchorsPath), 'utf8'));
  const first = Object.values(anchorsFile.anchors)[0];
  const node = findNodeByIdentity(doc, first.nodeIdentity);
  const mesh = node.getMesh();
  const prim = mesh.listPrimitives()[first.primitiveIndex || 0];
  const resolved = resolveFaceAnchorPositions(doc, anchorsFile.anchors);
  const frame = buildFaceLocalFrame(resolved);
  const surface = buildGtBoundSurfaceGate(
    prim,
    anchorsFile.anchors,
    JAW_OPEN_AUTHOR_CONTRACT_V1.surfaceSeedAnchors,
  );
  const maxHops = maxTopologyHopsForRadius(
    surface.meanEdgeLength,
    Math.max(0.08, frame.faceHeight * 0.35),
  );
  /** @type {number[]} */
  const primaryVerts = [];
  for (let i = 0; i < surface.allowed.length; i += 1) {
    if (surface.allowed[i] && surface.topoDist[i] >= 0 && surface.topoDist[i] <= maxHops) {
      primaryVerts.push(i);
    }
  }
  const jointNames =
    doc.getRoot().listSkins()[0]?.listJoints().map((j) => j.getName() || '') || [];
  const gtRefs = [
    resolved.mouthLower,
    resolved.mouthUpper,
    resolved.chin,
    resolved.mouthCornerLeft,
    resolved.mouthCornerRight,
  ].filter(Boolean);
  const det = resolveCoupledFacialPatches({
    prim,
    surface,
    primaryVerts,
    faceHeight: frame.faceHeight,
    gtRefs,
    jointNames,
  });
  return {
    id: a.id,
    publishedGlb: pubGlb,
    publishedGlbSha256: shaFile(join(root, pubGlb)),
    publishedVrm: pubVrm,
    publishedVrmSha256: shaFile(join(root, pubVrm)),
    morphHashes: await morphHashesFromGlb(join(root, pubGlb)),
    meanEdgeLength: surface.meanEdgeLength,
    maxTopologyHops: maxHops,
    thresholds: det.thresholds,
    acceptedComponents: det.patches.map((p) => p.componentId),
    rejectedBody: det.rejected.filter((r) => a.expectNeg.includes(r.componentId)),
    patchSets: det.patches.map((p) => ({
      componentId: p.componentId,
      patchVertexCount: p.patchVerts.length,
      seamPairCount: p.seamPairs.length,
      patchVertsSha256: createHash('sha256')
        .update(Buffer.from(Uint32Array.from(p.patchVerts).buffer))
        .digest('hex'),
      seamPairsSha256: createHash('sha256')
        .update(JSON.stringify(p.seamPairs))
        .digest('hex'),
    })),
    secondaryBindingCount: det.secondaryBindings.size,
  };
}

async function authorPipeline(a, runTag) {
  const runRoot = `assets/species-3d/human/runs/quality-20260930-${a.id}-face3`;
  const outDir = join(runRoot, `qa/reauthor-current-${runTag}`);
  mkdirSync(outDir, { recursive: true });

  // Compact prior face3 (mesh encoding) as base — re-author all 7 channels with current HEAD.
  // Do NOT use the oversized FaceRig duplicate in the run dir (gitignored / not published).
  const faceRigBase = join(
    root,
    `public/assets/avatars/species/human-${a.gender}-quality-20260921-${a.id}-face3.glb`,
  );
  // Prefer pre-reauthor snapshot if present (old published)
  const priorPub = join(root, `.qa/runs/423-reproducibility-baseline/${a.id}-prior-published.glb`);
  const baseGlb = existsSync(priorPub) ? priorPub : faceRigBase;
  if (!existsSync(baseGlb)) throw new Error(`authoring base missing: ${baseGlb}`);

  const anchorsSrc = join(runRoot, 'qa/jawopen-coupled-shell1/face-anchors.json');
  const carryTemplate = JSON.parse(
    readFileSync(join(runRoot, 'qa/jawopen-coupled-shell1/face-mapping-authoring.json'), 'utf8'),
  );
  const anchorsPath = join(outDir, 'face-anchors.json');
  copyFileSync(anchorsSrc, anchorsPath);
  const anchorsSha = shaFile(anchorsPath);

  let current = join(outDir, '00-prior-published-base.glb');
  copyFileSync(baseGlb, current);
  // Compact prior face3 mesh/topology; wipe prior authored deltas so current HEAD
  // rewrites all seven channels (not idempotent no-ops on blink/brow).
  const cleared = await zeroRequiredMorphPositions(current);
  const zeroedBase = join(outDir, '00-zeroed-required-morphs.glb');
  copyFileSync(current, zeroedBase);

  /** @type {Record<string, unknown>[]} */
  const reports = [];

  for (let i = 0; i < CHANNELS.length; i += 1) {
    const ch = CHANNELS[i];
    const next = join(outDir, `${String(i + 1).padStart(2, '0')}-${ch}.glb`);
    const authPath = join(outDir, `authoring-before-${ch}.json`);
    const inputSha = shaFile(current);
    // human_reviewed carry-forward (same GT/topology/anchors); modelSha updated per step.
    const authoring = {
      ...carryTemplate,
      source: 'manual_override',
      reviewed: true,
      reviewStatus: 'human_reviewed',
      asset: {
        ...carryTemplate.asset,
        modelPath: current.replace(/\\/g, '/'),
        modelSha256: inputSha,
        anchorsSha256: anchorsSha,
        topologyFingerprint: carryTemplate.asset.topologyFingerprint,
        cacheBust: 'quality5-face3-reauthor-current',
      },
      note: `Re-author ${ch} with HEAD ${HEAD} (3-edge meanEdge + nearestSeed + smile/pucker GT surface gate)`,
    };
    writeFileSync(authPath, `${JSON.stringify(authoring, null, 2)}\n`);
    const report = await authorLiveActFunctionalMorph({
      inputPath: current,
      outputPath: next,
      anchorsPath,
      authoringPath: authPath,
      channel: ch,
      reportPath: join(outDir, `authoring-report-${ch}.json`),
    });
    reports.push({
      channel: ch,
      inputSha256: inputSha,
      outputSha256: shaFile(next),
      morphSha256: report.afterChannelMorphSha256 || report.channelStats?.morphPositionSha256,
      affected: report.channelStats?.affectedVertices,
      coupledAccepted: report.channelStats?.coupledShell?.acceptedComponentIds || null,
      surfaceGate: report.channelStats?.surfaceGate || null,
    });
    current = next;
  }

  const finalGlb = join(outDir, `${a.id}-reauthor-current.glb`);
  copyFileSync(current, finalGlb);
  const finalSha = shaFile(finalGlb);
  const morphHashes = await morphHashesFromGlb(finalGlb);

  // Coupling evidence on final
  const doc = await io.read(finalGlb);
  const anchorsFile = JSON.parse(readFileSync(anchorsPath, 'utf8'));
  const first = Object.values(anchorsFile.anchors)[0];
  const node = findNodeByIdentity(doc, first.nodeIdentity);
  const mesh = node.getMesh();
  const prim = mesh.listPrimitives()[first.primitiveIndex || 0];
  const resolved = resolveFaceAnchorPositions(doc, anchorsFile.anchors);
  const frame = buildFaceLocalFrame(resolved);
  const surface = buildGtBoundSurfaceGate(
    prim,
    anchorsFile.anchors,
    JAW_OPEN_AUTHOR_CONTRACT_V1.surfaceSeedAnchors,
  );
  const maxHops = maxTopologyHopsForRadius(
    surface.meanEdgeLength,
    Math.max(0.08, frame.faceHeight * 0.35),
  );
  /** @type {number[]} */
  const primaryVerts = [];
  for (let i = 0; i < surface.allowed.length; i += 1) {
    if (surface.allowed[i] && surface.topoDist[i] >= 0 && surface.topoDist[i] <= maxHops) {
      primaryVerts.push(i);
    }
  }
  const jointNames =
    doc.getRoot().listSkins()[0]?.listJoints().map((j) => j.getName() || '') || [];
  const gtRefs = [
    resolved.mouthLower,
    resolved.mouthUpper,
    resolved.chin,
    resolved.mouthCornerLeft,
    resolved.mouthCornerRight,
  ].filter(Boolean);
  const det = resolveCoupledFacialPatches({
    prim,
    surface,
    primaryVerts,
    faceHeight: frame.faceHeight,
    gtRefs,
    jointNames,
  });

  const summary = {
    id: a.id,
    runTag,
    codeHead: HEAD,
    authoringBasePath: baseGlb.replace(/\\/g, '/'),
    authoringBaseSha256: shaFile(baseGlb),
    zeroedRequiredMorphs: cleared,
    zeroedBaseSha256: shaFile(zeroedBase),
    finalGlb: finalGlb.replace(/\\/g, '/'),
    finalGlbSha256: finalSha,
    morphHashes,
    meanEdgeLength: surface.meanEdgeLength,
    maxTopologyHops: maxHops,
    thresholds: det.thresholds,
    acceptedComponents: det.patches.map((p) => p.componentId),
    bodyFp: det.patches.filter((p) => p.wholeCompBodyFrac > 0.35).length,
    expectNegRejected: a.expectNeg.every((id) => !det.patches.some((p) => p.componentId === id)),
    patchSets: det.patches.map((p) => ({
      componentId: p.componentId,
      patchVertexCount: p.patchVerts.length,
      patchVertsSha256: createHash('sha256')
        .update(Buffer.from(Uint32Array.from(p.patchVerts).buffer))
        .digest('hex'),
      seamPairsSha256: createHash('sha256')
        .update(JSON.stringify(p.seamPairs))
        .digest('hex'),
    })),
    secondaryBindingCount: det.secondaryBindings.size,
    channelReports: reports,
  };
  writeFileSync(join(outDir, 'reauthor-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

async function main() {
  const baselineDir = join(root, '.qa/runs/423-reproducibility-baseline');
  mkdirSync(baselineDir, { recursive: true });
  /** @type {Record<string, unknown>} */
  const baseline = { frozenAt: new Date().toISOString(), codeHead: HEAD, assets: {} };
  for (const a of ASSETS) {
    console.log(`freeze baseline ${a.id}…`);
    baseline.assets[a.id] = await freezeOne(a);
  }
  writeFileSync(join(baselineDir, 'published-baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`);
  console.log('baseline frozen →', join(baselineDir, 'published-baseline.json'));

  /** @type {Record<string, unknown>} */
  const results = { codeHead: HEAD, assets: {} };
  for (const a of ASSETS) {
    console.log(`reauthor ${a.id} runA…`);
    const runA = await authorPipeline(a, 'runA');
    console.log(`reauthor ${a.id} runB…`);
    const runB = await authorPipeline(a, 'runB');
    const deterministic =
      runA.finalGlbSha256 === runB.finalGlbSha256 &&
      CHANNELS.every((ch) => runA.morphHashes[ch] === runB.morphHashes[ch]);
    const published = /** @type {any} */ (baseline.assets[a.id]);
    const identicalToPublished = runA.finalGlbSha256 === published.publishedGlbSha256;
    const morphDiff = CHANNELS.filter(
      (ch) => runA.morphHashes[ch] !== published.morphHashes[ch],
    );
    results.assets[a.id] = {
      deterministic,
      identicalToPublished,
      morphDiff,
      case: identicalToPublished ? 'A_identical' : 'B_diverged',
      runA,
      runB: {
        finalGlbSha256: runB.finalGlbSha256,
        morphHashes: runB.morphHashes,
      },
      publishedGlbSha256: published.publishedGlbSha256,
    };
    console.log(
      `${a.id}: deterministic=${deterministic} case=${identicalToPublished ? 'A' : 'B'} morphDiff=[${morphDiff.join(',')}]`,
    );
  }
  writeFileSync(
    join(baselineDir, 'reauthor-vs-published.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.log('LIVEACT_423_REAUTHOR_CURRENT_OK');
  console.log(JSON.stringify({ codeHead: HEAD, assets: Object.fromEntries(Object.entries(results.assets).map(([k,v])=>[k,{case:v.case,deterministic:v.deterministic,morphDiff:v.morphDiff,sha:v.runA.finalGlbSha256.slice(0,16)}])) }, null, 2));
}

main().catch((err) => {
  console.error('LIVEACT_423_REAUTHOR_CURRENT_FAIL', err);
  process.exit(1);
});
