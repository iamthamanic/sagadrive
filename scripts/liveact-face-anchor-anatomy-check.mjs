#!/usr/bin/env node
/**
 * liveact-face-anchor-anatomy-check — SagaDriveFaceAnchorAnatomyQaV1 gate.
 * Location: scripts/liveact-face-anchor-anatomy-check.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { NodeIO } from '@gltf-transform/core';
import { authorHeuristicFaceAnchorsManifest } from './lib/liveact-face-anchor-heuristic.mjs';
import {
  evaluateFaceAnchorAnatomy,
  resolveFaceAnchorPositions,
  validateFaceAnchorAnatomyFile,
} from './lib/liveact-face-anchor-anatomy-validate.mjs';
import { FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION } from './lib/liveact-face-anchor-anatomy-profile-v1.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-anchor-anatomy-check FAIL: ${msg}`);
    process.exit(1);
  }
}

check(
  /liveact-face-anchor-anatomy-check/.test(readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8')),
  'test-gate wiring',
);
check(
  /anatomic-refine|head-normalized|QTMESH_MARKER_TO_ANCHOR/.test(
    readFileSync(join(root, 'scripts/lib/liveact-face-anchor-heuristic.mjs'), 'utf8'),
  ),
  'heuristic uses anatomic authoring (not morph-extremum primary)',
);
check(
  !/function morphSeededVertexOverrides/.test(
    readFileSync(join(root, 'scripts/lib/liveact-face-anchor-heuristic.mjs'), 'utf8'),
  ),
  'morphSeededVertexOverrides removed from heuristic',
);

const pairs = [
  {
    id: 'm5',
    glb: 'assets/species-3d/human/runs/quality-20260921-m5-face2/human-male-quality-20260921-m5-face1.glb',
    anchors: 'assets/species-3d/human/runs/quality-20260921-m5-face2/face-anchors.json',
  },
  {
    id: 'f5',
    glb: 'assets/species-3d/human/runs/quality-20260921-f5-face2/human-female-quality-20260921-f5-face1.glb',
    anchors: 'assets/species-3d/human/runs/quality-20260921-f5-face2/face-anchors.json',
  },
];

const evidenceDir = join(root, '.qa/runs/face-anchor-anatomy-evidence');
mkdirSync(evidenceDir, { recursive: true });

for (const p of pairs) {
  const result = await validateFaceAnchorAnatomyFile({
    manifestPath: join(root, p.anchors),
    glbPath: join(root, p.glb),
  });
  writeFileSync(
    join(evidenceDir, `${p.id}-after.json`),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  check(result.contractVersion === FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION, `${p.id} contract`);
  check(result.pass === true, `${p.id} anatomy PASS (${(result.violations || []).join('; ')})`);
  check(result.metrics?.eyeSymRel != null && result.metrics.eyeSymRel < 0.35, `${p.id} eye sym`);
  console.log(`liveact-face-anchor-anatomy-check: ${p.id} PASS`, result.metrics);
}

// Old face1 anchors must FAIL anatomy (regression: no greenwash).
const oldF5 = await validateFaceAnchorAnatomyFile({
  manifestPath: join(root, 'assets/species-3d/human/runs/quality-20260921-f5-face1/face-anchors.json'),
  glbPath: join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face1.glb'),
});
check(oldF5.pass === false, 'legacy f5-face1 anchors must FAIL anatomy QA');
check(existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face1-face-anchors.json')), 'public m5 sidecar');
check(existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face1-face-anchors.json')), 'public f5 sidecar');

// Fresh author → anatomy on fixture path
const io = new NodeIO();
const doc = await io.read(join(root, pairs[0].glb));
const authored = authorHeuristicFaceAnchorsManifest(doc, {});
const positions = resolveFaceAnchorPositions(doc, authored.anchors);
const fresh = evaluateFaceAnchorAnatomy(positions);
check(fresh.pass === true, `fresh author anatomy PASS (${fresh.violations.join('; ')})`);

console.log('liveact-face-anchor-anatomy-check OK');
