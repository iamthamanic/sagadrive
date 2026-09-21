#!/usr/bin/env node
/**
 * liveact-face-human-repro-check — m5+f5 face public assets core-v1 reproducibility (#387).
 * Location: scripts/liveact-face-human-repro-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

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
    runJson: 'assets/species-3d/human/runs/quality-20260921-m5-face1/run.json',
  },
  {
    id: 'f5',
    publicGlb: 'public/assets/avatars/species/human-female-quality-20260921-f5-face1.glb',
    baseline: 'public/assets/avatars/species/human-female-quality-20260921-f5.glb',
    runJson: 'assets/species-3d/human/runs/quality-20260921-f5-face1/run.json',
  },
];

const domain = readFileSync(join(root, 'src/domains/character/avatar/species-template-models-v1.ts'), 'utf8');
check(/m5-face1\.glb/.test(domain) && /f5-face1\.glb/.test(domain), 'both templates wired');
check(/liveact-face-human-repro-check/.test(readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8')), 'test-gate');

for (const p of pairs) {
  check(existsSync(join(root, p.publicGlb)), `${p.id} public exists`);
  check(existsSync(join(root, p.baseline)), `${p.id} baseline exists`);
  const run = JSON.parse(readFileSync(join(root, p.runJson), 'utf8'));
  check(run.faceAuthoringProvider === 'qtmesh-facerig', `${p.id} provider`);
  check(run.qtmesh?.commit === '8720dc91bd7426908b9218673fbd74d544dd908c', `${p.id} pinned commit`);
  check(run.validation?.ok === true, `${p.id} validation ok in ledger`);
  execFileSync(
    process.execPath,
    [
      'scripts/liveact-face-asset-check.mjs',
      '--input',
      p.publicGlb,
      '--baseline',
      p.baseline,
      '--profile',
      'core-v1',
      '--out',
      join(root, `.qa/runs/liveact-face-${p.id}-inventory.json`),
    ],
    { cwd: root, stdio: 'inherit' },
  );
}

console.log('liveact-face-human-repro-check OK');
