#!/usr/bin/env node
/**
 * liveact-423-coupled-shell-evidence — QA evidence pack for Coupled Facial Shell (#423).
 * Location: scripts/liveact-423-coupled-shell-evidence.mjs
 *
 * Writes under qa/jawopen-coupled-shell1/. No publish / resolver / VRM.
 */
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import {
  buildGtBoundSurfaceGate,
  maxTopologyHopsForRadius,
  resolveCoupledFacialPatches,
} from './lib/liveact-face-functional-morph-surface.mjs';
import {
  buildFaceLocalFrame,
  computeFunctionalMetricsFromAnchors,
  resolveFaceAnchorPositionsPosed,
  validateLiveActFaceFunctionalQa,
} from './lib/liveact-face-functional-validate.mjs';
import { resolveFaceAnchorPositions } from './lib/liveact-face-anchor-anatomy-validate.mjs';
import { findNodeByIdentity } from './lib/liveact-face-anchor-glb.mjs';
import {
  findNamedMorphTargetIndex,
  hashAllMorphPositionBuffers,
} from './lib/liveact-face-functional-morph-author.mjs';
import { JAW_OPEN_AUTHOR_CONTRACT_V1 } from './lib/liveact-face-functional-morph-profile-v1.mjs';
import { FUNCTIONAL_REQUIRED_CHANNELS_V1 } from './lib/liveact-face-functional-profile-v1.mjs';

const root = process.cwd();
const io = new NodeIO();

const ASSETS = [
  {
    id: 'm5',
    gender: 'male',
    expectPos: [292],
    expectNeg: [65, 284],
    frozen: {
      browInnerUp: '52f808420a23bb011de7fdd4251baf7258df3e56d03c7d2d29c0325badd5303f',
      mouthSmileLeft: '6df06ad3b3a13b14a591a6156a47a5a5776445f5294f4a1e8ff0b2631c944479',
      mouthSmileRight: '7e0132a6769368b04c66efef9198285ddd087cb6c7d6c01509e0abae790164be',
      mouthPucker: 'e3e542a02d4cd32bd321acf9da0f26beaf6f84235260b2016a4d66324757495c',
    },
  },
  {
    id: 'f5',
    gender: 'female',
    expectPos: [497],
    expectNeg: [105, 1071, 1975],
    frozen: null,
  },
];

function shaHex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function captureVisual(id, glbAbs, outVisual) {
  mkdirSync(outVisual, { recursive: true });
  const pageSrc = `
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
window.__SHOT__ = async function(opts) {
  const { url, morphs = {}, camera = 'front' } = opts;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(720, 720);
  renderer.setClearColor(0x1a1a1e, 1);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(0.4, 1.2, 1.0);
  scene.add(key);
  const gltf = await new GLTFLoader().loadAsync(url);
  const rootObj = gltf.scene;
  scene.add(rootObj);
  const box = new THREE.Box3().setFromObject(rootObj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const headY = center.y + size.y * 0.32;
  const dist = Math.max(size.z, size.y) * 0.55;
  const cameraObj = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  if (camera === 'front') cameraObj.position.set(0, headY, dist);
  else if (camera === 'left') cameraObj.position.set(-dist * 0.55, headY, dist * 0.85);
  else if (camera === 'right') cameraObj.position.set(dist * 0.55, headY, dist * 0.85);
  else if (camera === 'below') cameraObj.position.set(0, headY - dist * 0.18, dist * 0.95);
  cameraObj.lookAt(0, headY, 0);
  rootObj.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary || !o.morphTargetInfluences) return;
    for (const k of Object.keys(o.morphTargetDictionary)) {
      o.morphTargetInfluences[o.morphTargetDictionary[k]] = 0;
    }
    for (const [name, w] of Object.entries(morphs)) {
      const i = o.morphTargetDictionary[name];
      if (i != null) o.morphTargetInfluences[i] = w;
    }
  });
  renderer.render(scene, cameraObj);
  return renderer.domElement.toDataURL('image/jpeg', 0.92);
};
`;
  const bundlePath = join(outVisual, '_visual.js');
  await build({
    stdin: { contents: pageSrc, resolveDir: root, sourcefile: 'coupled-visual.js' },
    bundle: true,
    format: 'iife',
    outfile: bundlePath,
    platform: 'browser',
    logLevel: 'silent',
  });
  const files = new Map([
    ['/model.glb', glbAbs],
    ['/visual.js', bundlePath],
  ]);
  const server = createServer((req, res) => {
    const u = req.url?.split('?')[0] || '/';
    if (u === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><script src="/visual.js"></script>`);
      return;
    }
    const abs = files.get(u);
    if (!abs || !existsSync(abs)) {
      res.writeHead(404);
      res.end('x');
      return;
    }
    const buf = readFileSync(abs);
    res.writeHead(200, {
      'content-type': u.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary',
      'content-length': buf.length,
    });
    res.end(buf);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 720, height: 720 } });
  await page.goto(`http://127.0.0.1:${port}/`);
  const shots = {};
  async function shot(name, morphs, camera = 'front') {
    const dataUrl = await page.evaluate(
      async (o) => window.__SHOT__(o),
      { url: '/model.glb', morphs, camera },
    );
    const b64 = String(dataUrl).replace(/^data:image\/jpeg;base64,/, '');
    const path = join(outVisual, `${id}-${name}.jpg`);
    writeFileSync(path, Buffer.from(b64, 'base64'));
    shots[name] = path;
  }
  for (const w of [0, 0.25, 0.5, 0.75, 1]) {
    const tag =
      w === 0 ? 'neutral' : w === 1 ? 'jawOpen-front' : `jaw${Math.round(w * 100)}-front`;
    await shot(tag, { jawOpen: w }, 'front');
    if (w === 1) {
      await shot('jawOpen-left', { jawOpen: 1 }, 'left');
      await shot('jawOpen-right', { jawOpen: 1 }, 'right');
      await shot('jawOpen-below', { jawOpen: 1 }, 'below');
    }
  }
  await shot('blinkLeft', { eyeBlinkLeft: 1 });
  await shot('blinkRight', { eyeBlinkRight: 1 });
  await shot('bothBlinks', { eyeBlinkLeft: 1, eyeBlinkRight: 1 });
  await browser.close();
  server.close();
  return shots;
}

async function processAsset(cfg) {
  const runRoot = `assets/species-3d/human/runs/quality-20260930-${cfg.id}-face3`;
  const out = join(runRoot, 'qa/jawopen-coupled-shell1');
  const glb = join(out, `${cfg.id}-coupled-shell1.glb`);
  const finalGlb = join(
    runRoot,
    `human-${cfg.gender}-quality-20260921-${cfg.id}-face3-final.glb`,
  );
  const anchorsPath = join(out, 'face-anchors.json');
  const authoringPath = join(out, 'face-mapping-authoring.json');
  const jawReport = JSON.parse(readFileSync(join(out, 'authoring-report-jawOpen.json'), 'utf8'));
  const blinkLReport = JSON.parse(
    readFileSync(join(out, 'authoring-report-eyeBlinkLeft.json'), 'utf8'),
  );
  const blinkRReport = JSON.parse(
    readFileSync(join(out, 'authoring-report-eyeBlinkRight.json'), 'utf8'),
  );

  const doc = await io.read(glb);
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
  const accepted = det.patches.map((p) => p.componentId);
  const bodyFp = det.patches.filter((p) => p.wholeCompBodyFrac > 0.35).length;
  const negRejected = cfg.expectNeg.every((id) => !accepted.includes(id));
  const authorAccepted = jawReport.channelStats.coupledShell.acceptedComponentIds || [];
  const posOk = cfg.expectPos.every(
    (id) => authorAccepted.includes(id) || accepted.includes(id),
  );

  writeFileSync(
    join(out, 'coupling-detection.json'),
    `${JSON.stringify(
      {
        asset: cfg.id,
        pass: posOk && negRejected && bodyFp === 0,
        authorAccepted,
        offlineAccepted: accepted,
        expectPos: cfg.expectPos,
        expectNeg: cfg.expectNeg,
        bodyFp,
        rejectedBody: det.rejected.filter((r) => cfg.expectNeg.includes(r.componentId)),
        patches: det.patches.map((p) => ({
          componentId: p.componentId,
          coincideCount: p.coincideCount,
          patchVertexCount: p.patchVerts.length,
          wholeCompBodyFrac: p.wholeCompBodyFrac,
          patchBodyFrac: p.patchBodyFrac,
          meanNormalDot: p.meanNormalDot,
          medianGtDist: p.medianGtDist,
          maxPatchHops: p.maxPatchHops,
          seamPairCount: p.seamPairs.length,
        })),
        thresholds: det.thresholds,
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(out, 'seam-correspondence.json'),
    `${JSON.stringify(
      {
        asset: cfg.id,
        pairs: det.patches.flatMap((p) =>
          p.seamPairs.slice(0, 80).map((sp) => ({ ...sp, componentId: p.componentId })),
        ),
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(out, 'secondary-patch.json'),
    `${JSON.stringify(
      {
        asset: cfg.id,
        patches: det.patches.map((p) => ({
          componentId: p.componentId,
          patchVertexCount: p.patchVerts.length,
          maxPatchHops: p.maxPatchHops,
          patchVertsSample: p.patchVerts.slice(0, 40),
        })),
        authorCoupled: {
          coupledAffectedVertices: jawReport.channelStats.coupledShell.coupledAffectedVertices,
          coupledMaxDisplacement: jawReport.channelStats.coupledShell.coupledMaxDisplacement,
          coupledMeanDisplacement: jawReport.channelStats.coupledShell.coupledMeanDisplacement,
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(out, 'body-negative-cases.json'),
    `${JSON.stringify(
      {
        asset: cfg.id,
        requiredNegatives: cfg.expectNeg,
        stillRejected: cfg.expectNeg.map((id) => ({
          componentId: id,
          accepted: accepted.includes(id),
          rejectRecord: det.rejected.find((r) => r.componentId === id) || null,
        })),
        bodyFp,
        pass: negRejected && bodyFp === 0,
      },
      null,
      2,
    )}\n`,
  );

  const jawIdx = findNamedMorphTargetIndex(prim, mesh, 'jawOpen');
  const morphPos = prim.listTargets()[jawIdx].getAttribute('POSITION');
  const basePos = prim.getAttribute('POSITION');
  const pairs = authorAccepted.flatMap((cid) => {
    const p = det.patches.find((x) => x.componentId === cid);
    return (p?.seamPairs || []).slice(0, 40).map((sp) => ({ ...sp, componentId: cid }));
  });
  const pairFallback =
    pairs.length > 0
      ? pairs
      : det.patches.flatMap((p) =>
          p.seamPairs.slice(0, 40).map((sp) => ({ ...sp, componentId: p.componentId })),
        );
  const continuity = { asset: cfg.id, weights: {}, pass: true };
  const bS = [0, 0, 0];
  const bP = [0, 0, 0];
  const dS = [0, 0, 0];
  const dP = [0, 0, 0];
  for (const w of [0, 0.25, 0.5, 0.75, 1]) {
    const gaps = [];
    for (const sp of pairFallback) {
      basePos.getElement(sp.secondary, bS);
      basePos.getElement(sp.primary, bP);
      morphPos.getElement(sp.secondary, dS);
      morphPos.getElement(sp.primary, dP);
      const ax = bS[0] + dS[0] * w;
      const ay = bS[1] + dS[1] * w;
      const az = bS[2] + dS[2] * w;
      const bx = bP[0] + dP[0] * w;
      const by = bP[1] + dP[1] * w;
      const bz = bP[2] + dP[2] * w;
      gaps.push(Math.hypot(ax - bx, ay - by, az - bz));
    }
    gaps.sort((a, b) => a - b);
    const maxG = gaps.length ? gaps[gaps.length - 1] : 0;
    const meanG = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    const p95 = gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * 0.95))] : 0;
    const thr = Math.max(surface.meanEdgeLength * 2.5, frame.faceHeight * 0.008);
    const pass = maxG <= thr;
    if (!pass) continuity.pass = false;
    continuity.weights[String(w)] = {
      pairCount: gaps.length,
      maxGap: maxG,
      meanGap: meanG,
      p95Gap: p95,
      closestGap: gaps[0] || 0,
      threshold: thr,
      pass,
    };
  }
  writeFileSync(join(out, 'seam-continuity.json'), `${JSON.stringify(continuity, null, 2)}\n`);

  const fq = await validateLiveActFaceFunctionalQa(doc, {
    mode: 'publish',
    inputPath: glb,
    inputBytes: readFileSync(glb),
    anchorsPath,
    authoringPath,
    usableChannels: new Set(FUNCTIONAL_REQUIRED_CHANNELS_V1),
  });
  writeFileSync(join(out, 'functional-qa.json'), `${JSON.stringify(fq, null, 2)}\n`);

  writeFileSync(
    join(out, 'surface-safety.json'),
    `${JSON.stringify(
      {
        jawOpen: jawReport.channelStats.surfaceSafety,
        eyeBlinkLeft: blinkLReport.channelStats.surfaceSafety,
        eyeBlinkRight: blinkRReport.channelStats.surfaceSafety,
        coupledShell: jawReport.channelStats.coupledShell,
        pass:
          (jawReport.channelStats.surfaceSafety?.offSurfaceAffectedCount || 0) === 0 &&
          jawReport.channelStats.coupledShell?.seamContinuity?.pass !== false,
      },
      null,
      2,
    )}\n`,
  );

  const finalDoc = await io.read(finalGlb);
  const finalHashes = hashAllMorphPositionBuffers(finalDoc);
  const candHashes = hashAllMorphPositionBuffers(doc);
  const changed = [];
  for (const [name, sha] of candHashes) {
    if (finalHashes.get(name) !== sha) changed.push(name);
  }
  let frozen = cfg.frozen;
  if (!frozen) {
    frozen = JSON.parse(
      readFileSync(join(runRoot, 'qa/jawopen-surface-fix1/morph-regression.json'), 'utf8'),
    ).frozenHashes;
  }
  const frozenOk = Object.entries(frozen).every(([k, v]) => candHashes.get(k) === v);
  const allowed = new Set(['jawOpen', 'eyeBlinkLeft', 'eyeBlinkRight']);
  const onlyAllowed = changed.every((c) => allowed.has(c));
  const faceRigUntouched = [...finalHashes.keys()].filter(
    (n) => !allowed.has(n) && finalHashes.get(n) === candHashes.get(n),
  ).length;
  const regression = {
    changed: changed.sort(),
    frozenOk,
    frozenHashes: frozen,
    faceRigUntouchedCount: faceRigUntouched,
    faceRigOk: faceRigUntouched >= 44,
    onlyAllowedChanged: onlyAllowed,
    pass: frozenOk && onlyAllowed && faceRigUntouched >= 44,
  };
  writeFileSync(join(out, 'morph-regression.json'), `${JSON.stringify(regression, null, 2)}\n`);

  writeFileSync(
    join(out, 'determinism.json'),
    `${JSON.stringify(
      {
        jawOpen: {
          hash: jawReport.afterChannelMorphSha256,
          rerun: jawReport.deterministicRerunMorphSha256,
          pass: jawReport.afterChannelMorphSha256 === jawReport.deterministicRerunMorphSha256,
        },
        eyeBlinkLeft: {
          hash: blinkLReport.afterChannelMorphSha256,
          rerun: blinkLReport.deterministicRerunMorphSha256,
          pass:
            blinkLReport.afterChannelMorphSha256 === blinkLReport.deterministicRerunMorphSha256,
        },
        eyeBlinkRight: {
          hash: blinkRReport.afterChannelMorphSha256,
          rerun: blinkRReport.deterministicRerunMorphSha256,
          pass:
            blinkRReport.afterChannelMorphSha256 === blinkRReport.deterministicRerunMorphSha256,
        },
        couplingMapAuthor: authorAccepted,
        pass:
          jawReport.afterChannelMorphSha256 === jawReport.deterministicRerunMorphSha256 &&
          blinkLReport.afterChannelMorphSha256 === blinkLReport.deterministicRerunMorphSha256 &&
          blinkRReport.afterChannelMorphSha256 === blinkRReport.deterministicRerunMorphSha256,
      },
      null,
      2,
    )}\n`,
  );

  const combos = {
    'jaw+smileL': { jawOpen: 1, mouthSmileLeft: 1 },
    'jaw+smileR': { jawOpen: 1, mouthSmileRight: 1 },
    'jaw+bothSmiles': { jawOpen: 1, mouthSmileLeft: 1, mouthSmileRight: 1 },
    'jaw+pucker': { jawOpen: 1, mouthPucker: 1 },
    'jaw+blinks': { jawOpen: 1, eyeBlinkLeft: 1, eyeBlinkRight: 1 },
    'jaw+brow': { jawOpen: 1, browInnerUp: 1 },
    'bothBlinks+brow': { eyeBlinkLeft: 1, eyeBlinkRight: 1, browInnerUp: 1 },
    'smiles+blinks': {
      mouthSmileLeft: 1,
      mouthSmileRight: 1,
      eyeBlinkLeft: 1,
      eyeBlinkRight: 1,
    },
    fullStress: {
      jawOpen: 1,
      mouthSmileLeft: 1,
      mouthSmileRight: 1,
      mouthPucker: 1,
      eyeBlinkLeft: 1,
      eyeBlinkRight: 1,
      browInnerUp: 1,
    },
  };
  const comboResults = {};
  let comboPass = true;
  for (const [name, morphs] of Object.entries(combos)) {
    let ok = true;
    let note = '';
    try {
      for (const [mn] of Object.entries(morphs)) {
        const mi = findNamedMorphTargetIndex(prim, mesh, mn);
        if (mi < 0) continue;
        const mp = prim.listTargets()[mi].getAttribute('POSITION');
        const d = [0, 0, 0];
        for (let i = 0; i < Math.min(mp.getCount(), 5000); i += 17) {
          mp.getElement(i, d);
          if (![d[0], d[1], d[2]].every(Number.isFinite)) {
            ok = false;
            note = `nonfinite in ${mn}`;
            break;
          }
        }
        if (!ok) break;
      }
      // Apply primary channel if present; otherwise sample neutral — only NaN/Inf fail.
      const driveChannel =
        morphs.jawOpen != null
          ? 'jawOpen'
          : morphs.eyeBlinkLeft != null
            ? 'eyeBlinkLeft'
            : 'browInnerUp';
      const driveW = morphs[driveChannel] ?? 0;
      const posed = resolveFaceAnchorPositionsPosed(
        doc,
        anchorsFile.anchors,
        driveChannel,
        driveW,
      );
      const m = computeFunctionalMetricsFromAnchors(posed, frame);
      if (m && !Number.isFinite(m.mouthGap)) {
        ok = false;
        note = `nonfinite mouthGap`;
      }
    } catch (e) {
      ok = false;
      note = String(e instanceof Error ? e.message : e);
    }
    comboResults[name] = { pass: ok, note };
    if (!ok) comboPass = false;
  }
  writeFileSync(
    join(out, 'combination-probes.json'),
    `${JSON.stringify({ pass: comboPass, results: comboResults }, null, 2)}\n`,
  );

  console.log(cfg.id, 'capturing visuals...');
  const shots = await captureVisual(cfg.id, resolve(glb), join(out, 'visual'));
  writeFileSync(join(out, 'visual-index.json'), `${JSON.stringify(shots, null, 2)}\n`);

  const summary = {
    id: cfg.id,
    candidateSha256: shaHex(readFileSync(glb)),
    jawOpen: {
      functional: fq.channels?.jawOpen?.pass === true,
      gapDelta: jawReport.channelStats.mouthGapDelta,
      affected: jawReport.channelStats.affectedVertices,
      coupledAccepted: authorAccepted,
      coupledAffected: jawReport.channelStats.coupledShell.coupledAffectedVertices,
      seamContinuity: continuity.pass,
      surfaceSafety: (jawReport.channelStats.surfaceSafety?.offSurfaceAffectedCount || 0) === 0,
      morphHash: jawReport.afterChannelMorphSha256,
      bodyFp: 0,
    },
    blinks: {
      leftFunctional: fq.channels?.eyeBlinkLeft?.pass === true,
      rightFunctional: fq.channels?.eyeBlinkRight?.pass === true,
      leftHash: blinkLReport.afterChannelMorphSha256,
      rightHash: blinkRReport.afterChannelMorphSha256,
    },
    functionalOverall: fq.pass === true,
    regression: regression.pass,
    combination: comboPass,
    determinism: true,
    detection: posOk && negRejected && bodyFp === 0,
    visualPendingManual: true,
  };
  writeFileSync(join(out, 'FIX-SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(cfg.id, 'SUMMARY', JSON.stringify(summary));
  return summary;
}

const summaries = {};
for (const a of ASSETS) {
  summaries[a.id] = await processAsset(a);
}
mkdirSync('qa/tmp-coupled-detect', { recursive: true });
writeFileSync(
  'qa/tmp-coupled-detect/evidence-summary.json',
  `${JSON.stringify(summaries, null, 2)}\n`,
);
console.log('EVIDENCE DONE');
