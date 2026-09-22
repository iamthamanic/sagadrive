#!/usr/bin/env node
/**
 * liveact-face-human-repro-check — m5+f5 face public assets core-v1 + semantic QA (#387, #402).
 * Location: scripts/liveact-face-human-repro-check.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { validateLiveActFaceAsset } from './lib/liveact-face-asset-validate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-human-repro-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const pairs = [
  {
    id: 'm5',
    publicGlb: 'public/assets/avatars/species/human-male-quality-20260921-m5-face1.glb',
    baseline: 'public/assets/avatars/species/human-male-quality-20260921-m5.glb',
    runJson: 'assets/species-3d/human/runs/quality-20260921-m5-face2/run.json',
    anchors: 'assets/species-3d/human/runs/quality-20260921-m5-face2/face-anchors.json',
    inventory: 'assets/species-3d/human/runs/quality-20260921-m5-face2/face-inventory.json',
  },
  {
    id: 'f5',
    publicGlb: 'public/assets/avatars/species/human-female-quality-20260921-f5-face1.glb',
    baseline: 'public/assets/avatars/species/human-female-quality-20260921-f5.glb',
    runJson: 'assets/species-3d/human/runs/quality-20260921-f5-face2/run.json',
    anchors: 'assets/species-3d/human/runs/quality-20260921-f5-face2/face-anchors.json',
    inventory: 'assets/species-3d/human/runs/quality-20260921-f5-face2/face-inventory.json',
  },
];

const domain = readFileSync(join(root, 'src/domains/character/avatar/species-template-models-v1.ts'), 'utf8');
check(/m5-face1\.vrm/.test(domain) && /f5-face1\.vrm/.test(domain), 'both templates wired as VRM primary');
check(
  existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face1.vrm')) &&
    existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face1.vrm')),
  'both public VRM shipping assets exist',
);
check(/liveact-face-human-repro-check/.test(readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8')), 'test-gate');

for (const p of pairs) {
  check(existsSync(join(root, p.publicGlb)), `${p.id} public exists`);
  check(existsSync(join(root, p.baseline)), `${p.id} baseline exists`);
  const run = JSON.parse(readFileSync(join(root, p.runJson), 'utf8'));
  check(run.faceAuthoringProvider === 'qtmesh-facerig', `${p.id} provider`);
  check(run.qtmesh?.commit === '8720dc91bd7426908b9218673fbd74d544dd908c', `${p.id} pinned commit`);
  check(existsSync(join(root, p.anchors)), `${p.id} face-anchors.json in run dir`);
  check(run.faceRig?.fitResidual != null && run.faceRig.fitResidual <= 8, `${p.id} fit residual <=8%`);

  const outPath = join(root, p.inventory);
  const result = await validateLiveActFaceAsset({
    inputPath: join(root, p.publicGlb),
    baselinePath: join(root, p.baseline),
    profile: 'core-v1',
    anchorsPath: join(root, p.anchors),
    outPath,
  });
  writeFileSync(outPath, `${JSON.stringify(result.inventory, null, 2)}\n`);

  check(result.inventory.structuralPass === true, `${p.id} structural gate`);
  check(result.inventory.semanticQa?.skipped !== true, `${p.id} semantic QA ran with anchors`);
  check(
    result.inventory.faceAnchorAnatomyQa?.pass === true,
    `${p.id} face anchor anatomy PASS`,
  );
  check(
    result.inventory.semanticQa?.pass === true,
    `${p.id} semantic QA V2 pass (${(result.inventory.semanticQa?.violations || []).slice(0, 4).join('; ')})`,
  );
  check(
    result.inventory.semanticQa?.contractVersion === 'SagaDriveLiveActFaceSemanticQaV2',
    `${p.id} semantic contract V2`,
  );
  console.log(`liveact-face-human-repro-check: ${p.id} semantic QA V2 pass`);
}

console.log('liveact-face-human-repro-check OK');
