#!/usr/bin/env node
/**
 * liveact-face-fidelity-e2e-check — aggregate Epic #396 fidelity regression gate (#406).
 * Location: scripts/liveact-face-fidelity-e2e-check.mjs
 *
 * Orchestrates existing deterministic checks only — no LLM scoring.
 * Covers VRM primary humans, GLB fallback presence, gaze exclusivity, semantic QA,
 * overlays/diagnostics, and the VRM packer.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-fidelity-e2e-check FAIL: ${msg}`);
    process.exit(1);
  }
}

function run(relScript) {
  console.log(`→ ${relScript}`);
  execFileSync(process.execPath, [relScript], { cwd: root, stdio: 'inherit' });
}

const acceptance = join(root, '.qa/acceptance/liveact-face-fidelity-vrm-runtime.md');
const e2eSpec = join(root, 'e2e/liveact-face-fidelity.spec.ts');
const smoke = join(root, 'e2e/liveact-viewport-smoke.spec.ts');
const domain = readFileSync(
  join(root, 'src/domains/character/avatar/species-template-models-v1.ts'),
  'utf8',
);
const gate = readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8');

check(existsSync(acceptance), 'acceptance doc present');
check(existsSync(e2eSpec), 'fidelity e2e spec present');
check(existsSync(smoke), 'viewport smoke preserved');
check(/m5-face1\.vrm/.test(domain) && /f5-face1\.vrm/.test(domain), 'human VRM primary wired');
check(
  existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face1.vrm')),
  'm5 VRM shipping asset',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face1.vrm')),
  'f5 VRM shipping asset',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face1.glb')),
  'm5 GLB fallback retained',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face1.glb')),
  'f5 GLB fallback retained',
);
check(/checkLiveActFaceFidelityE2E/.test(gate), 'test-gate wiring');

const steps = [
  'scripts/liveact-diagnostics-v2-check.mjs',
  'scripts/liveact-facial-fidelity-v2-check.mjs',
  'scripts/liveact-camera-overlay-metrics-check.mjs',
  'scripts/liveact-character-face-overlay-check.mjs',
  'scripts/liveact-face-human-repro-check.mjs',
  'scripts/species-template-gender-model-preview-check.mjs',
  'scripts/avatar-vrm-pack-check.mjs',
  'scripts/liveact-avatar-output-check.mjs',
  'scripts/liveact-retarget-profile-check.mjs',
];

for (const step of steps) {
  check(existsSync(join(root, step)), `missing orchestrated check ${step}`);
  run(step);
}

console.log('liveact-face-fidelity-e2e-check OK');
