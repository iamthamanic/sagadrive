#!/usr/bin/env node
/**
 * liveact-personal-calibration-v2-check — authoritative #449 Personal Calibration gate.
 * Location: scripts/liveact-personal-calibration-v2-check.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-personal-calibration-v2-check FAIL: ${msg}`);
    process.exit(1);
  }
}

check(existsSync(join(root, '.qa/design/liveact-personal-calibration-v2.md')), 'design');
check(existsSync(join(root, '.qa/acceptance/liveact-personal-calibration-v2.md')), 'acceptance');
const design = read('.qa/design/liveact-personal-calibration-v2.md');
const acceptance = read('.qa/acceptance/liveact-personal-calibration-v2.md');
check(/Personal Calibration V2/.test(design) && /Temporal Solver/.test(design), 'design boundaries');
check(/CE-04/.test(acceptance) && /CE-20/.test(acceptance), 'acceptance CE');
check(/liveact-personal-calibration-v2-check/.test(read('scripts/test-gate.mjs')), 'test-gate wiring');
check(/liveact-personal-calibration-local/.test(read('.gitignore')), 'local gitignore');

const domainFiles = [
  'src/domains/character/liveact/liveact-personal-calibration-contract.ts',
  'src/domains/character/liveact/liveact-personal-calibration-solve.ts',
  'src/domains/character/liveact/liveact-personal-calibration-store.ts',
  'src/domains/character/liveact/liveact-personal-calibration-fixtures.ts',
  'src/domains/character/liveact/liveact-personal-calibration-ab.ts',
];
for (const rel of domainFiles) {
  const src = read(rel);
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, /@ts-nocheck/, / as any\b/, / as unknown as /]) {
    check(!pattern.test(src), `${rel} no type escape`);
  }
}

const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const calib = read('src/domains/character/liveact/liveact-calibration.ts');
check(/calibratePersonalV2/.test(engine), 'engine personal V2 entry');
check(/personalProfile/.test(engine), 'engine stores personal profile');
check(/applyLiveActPersonalCalibration|personalProfile/.test(calib), 'calib stage personal apply');
check(/stepAdaptiveTemporal/.test(calib), '#448 temporal seat preserved');
check(/LIVEACT_RANGE_CALIBRATION_STEPS/.test(read('src/domains/character/liveact/liveact-calibration.ts')), 'V1 steps retained');
check(/LIVEACT_PERSONAL_CALIBRATION_CONTRACT/.test(read('src/domains/character/liveact/index.ts')), 'barrel');
check(/liveact-calibrate-personal-v2/.test(read('src/app/character/avatar/AvatarPreviewSettings.tsx')), 'UI premium button');
check(/localStorage/.test(read('src/domains/character/liveact/liveact-personal-calibration-store.ts')), 'local storage');
check(!/supabase|fetch\(|XMLHttpRequest/.test(read('src/domains/character/liveact/liveact-personal-calibration-store.ts')), 'no network store');

const privacyRoots = [
  '.qa/evidence/liveact-personal-calibration-v2',
  '.qa/fixtures/liveact-personal-calibration-v2',
];
const bannedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.mov']);
function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}
for (const rel of privacyRoots) {
  for (const file of walkFiles(join(root, rel))) {
    const lower = file.toLowerCase();
    for (const ext of bannedExt) {
      check(!lower.endsWith(ext), `no media ${file}`);
    }
  }
}

const outFile = join(root, '.qa/runs/liveact-personal-calibration-v2-bundle.mjs');
mkdirSync(join(root, '.qa/runs'), { recursive: true });
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: outFile,
  write: true,
  logLevel: 'silent',
});

const mod = await import(`${outFile}?t=${Date.now()}`);
check(mod.LIVEACT_PERSONAL_CALIBRATION_CONTRACT === 'SagaDriveLiveActCalibrationProfileV2', 'contract');
check(mod.LIVEACT_PERSONAL_CALIBRATION_DURATION_MS >= 20_000, 'duration >=20s');
check(mod.LIVEACT_PERSONAL_CALIBRATION_DURATION_MS <= 40_000, 'duration <=40s');
check(Array.isArray(mod.LIVEACT_PERSONAL_CALIBRATION_PHASES) && mod.LIVEACT_PERSONAL_CALIBRATION_PHASES.length === 6, '6 phases');

const ab1 = mod.runPersonalCalibrationAbBenchmark();
const ab2 = mod.runPersonalCalibrationAbBenchmark();
check(ab1.success === true, 'ab success');
check(JSON.stringify(ab1) === JSON.stringify(ab2), 'deterministic ab');
check(ab1.improvements.neutralBiasReduced, 'neutral bias improved');
check(ab1.improvements.weakChannelNotExploded, 'weak channel not exploded');
check(ab1.improvements.asymmetryPreserved, 'asymmetry preserved');
check(ab1.personal.noseSneerGain <= 1.0001, 'nose gain not exploded');
check((ab1.v1.noseSneerGain ?? 1) >= ab1.personal.noseSneerGain, 'v1 nose gain >= personal');

// Fingerprint invalidation
const { profile } = mod.buildPersonalCalibrationActorSession();
const bad = {
  ...profile,
  solverFingerprint: { ...profile.solverFingerprint, temporalPolicy: 'tampered' },
};
check(mod.resolveLiveActPersonalProfileStatus(bad) === 'needsRecalibration', 'fingerprint invalidate');

// Skip semantics
const session = mod.createLiveActPersonalCalibrationSessionV2('skip-test');
session.phaseIndex = 2; // eyesBrows
check(mod.skipLiveActPersonalCalibrationPhase(session) === true, 'skip eyesBrows');
check(session.skippedPhaseIds.includes('eyesBrows'), 'skipped recorded');

const evidenceDir = join(root, '.qa/evidence/liveact-personal-calibration-v2');
mkdirSync(evidenceDir, { recursive: true });
const evidence = {
  contractVersion: ab1.contractVersion,
  policyVersion: ab1.policyVersion,
  choreographyDurationMs: ab1.choreographyDurationMs,
  v1: ab1.v1,
  personal: ab1.personal,
  improvements: ab1.improvements,
  targets: {
    durationMs: [20_000, 40_000],
    measurableImprovementMin: 1,
  },
  results: { success: ab1.success },
  privacy: ab1.privacy,
  ce: {
    'CE-04': 'premium start immediate; phase timers',
    'CE-20': 'skip/N/A/fingerprint → V1 or recalibrate',
  },
};
writeFileSync(join(evidenceDir, 'ab-personal-vs-v1.json'), `${JSON.stringify(evidence, null, 2)}\n`);
const summary = {
  contractVersion: ab1.contractVersion,
  ab: ab1,
  evidence,
  deterministicHash: createHash('sha256').update(JSON.stringify(ab1)).digest('hex'),
};
mkdirSync(join(root, '.qa/runs'), { recursive: true });
writeFileSync(
  join(root, '.qa/runs/449-personal-calibration-v2-summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log('liveact-personal-calibration-v2-check OK');
console.log(
  JSON.stringify(
    {
      success: ab1.success,
      durationMs: ab1.choreographyDurationMs,
      improvements: ab1.improvements,
      nose: { v1: ab1.v1.noseSneerGain, personal: ab1.personal.noseSneerGain, cap: ab1.personal.noseCapability },
      bias: { v1: ab1.v1.neutralSmileBias, personal: ab1.personal.neutralSmileBias },
    },
    null,
    2,
  ),
);
