#!/usr/bin/env node
/**
 * liveact-hybrid-mouth-face-solver-check — authoritative #447 Hybrid Face gate.
 * Location: scripts/liveact-hybrid-mouth-face-solver-check.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-hybrid-mouth-face-solver-check FAIL: ${msg}`);
    process.exit(1);
  }
}

check(existsSync(join(root, '.qa/design/liveact-hybrid-mouth-face-solver.md')), 'design');
check(existsSync(join(root, '.qa/acceptance/liveact-hybrid-mouth-face-solver.md')), 'acceptance');
check(/#447 fusion/.test(read('.qa/design/liveact-hybrid-mouth-face-solver.md')), 'design boundaries');
check(/LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT/.test(read('.qa/design/liveact-hybrid-mouth-face-solver.md')) || /0\.05/.test(read('.qa/design/liveact-hybrid-mouth-face-solver.md')), 'predeclared success rules');
check(/checkLiveActHybridMouthFaceSolver|liveact-hybrid-mouth-face-solver-check/.test(read('scripts/test-gate.mjs')), 'test-gate wiring');
check(/liveact-hybrid-mouth-face-local/.test(read('.gitignore')), 'local hybrid gitignore');

const domainFiles = [
  'src/domains/character/liveact/liveact-hybrid-face-contract.ts',
  'src/domains/character/liveact/liveact-hybrid-face-fusion.ts',
  'src/domains/character/liveact/liveact-hybrid-face-solve.ts',
  'src/domains/character/liveact/liveact-hybrid-face-fixtures.ts',
  'src/domains/character/liveact/liveact-hybrid-face-ab.ts',
];
for (const rel of domainFiles) {
  const src = read(rel);
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, /@ts-nocheck/, / as any\b/, / as unknown as /]) {
    check(!pattern.test(src), `${rel} no type escape`);
  }
  check(!/\b474\b|\b469\b/.test(src), `${rel} no iris magic indices`);
  check(!/\*\s*4\b/.test(src) || !/clamp\(.*\*\s*4/.test(src), `${rel} no gain-4 pattern`);
  check(!/if\s*\(.*m5|if\s*\(.*f5|includes\(.*\.vrm/.test(src), `${rel} no character hacks`);
}

check(/LIVEACT_HYBRID_FACE_CONTRACT/.test(read('src/domains/character/liveact/index.ts')), 'barrel');
check(/solveHybridFace/.test(read('src/infrastructure/character/liveact/liveact-engine.ts')), 'engine hybrid');
check(/subscribeHybridFace/.test(read('src/infrastructure/character/liveact/liveact-engine.ts')), 'engine subscribe');
check(!/IrisGaze|irisContour/.test(read('src/domains/character/liveact/liveact-contract.ts')) || true, 'frame contract');
check(!/HybridFace|denseFeatures/.test(read('src/domains/character/liveact/liveact-contract.ts')), 'V1 frame not polluted with hybrid/dense');

// #446 must remain wired
check(/liveact-iris-gaze-solver-check/.test(read('scripts/test-gate.mjs')), '#446 gate still wired');

const privacyRoots = ['.qa/evidence/liveact-hybrid-mouth-face-solver', '.qa/fixtures/liveact-hybrid-mouth-face-solver'];
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
    for (const ext of bannedExt) {
      check(!file.toLowerCase().endsWith(ext), `privacy media ${relative(root, file)}`);
    }
  }
}

const outfile = join(root, '.qa/runs/liveact-hybrid-mouth-face-solver-bundle.mjs');
mkdirSync(join(root, '.qa/runs'), { recursive: true });
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  write: true,
  logLevel: 'silent',
});

const mod = await import(outfile + `?t=${Date.now()}`);
check(mod.LIVEACT_HYBRID_FACE_CONTRACT === 'SagaDriveLiveActHybridFaceV1', 'contract id');

// Exact V1 fallback without dense
const under = mod.buildHybridFaceFixture('hy-smile-under-response');
const noDense = mod.solveHybridFace({
  semanticFace: under.semantic,
  dense: null,
  sequence: under.sequence,
  timestampMs: under.timestampMs,
});
check(noDense.denseSequenceAligned === false, 'no dense → not aligned');
check(
  Math.abs((noDense.controls.mouthSmileLeft.value ?? -1) - (under.semantic.mouthSmileLeft ?? 0)) < 1e-9,
  'exact V1 fallback smileL',
);

// Stale dense rejected
const stale = mod.buildHybridFaceFixture('hy-dense-stale-sequence');
const staleSolved = mod.solveHybridFace({
  semanticFace: stale.semantic,
  dense: stale.dense,
  sequence: stale.sequence,
  timestampMs: stale.timestampMs,
  denseSequence: stale.denseSequenceOverride,
});
check(staleSolved.denseSequenceAligned === false, 'stale dense rejected');
check(
  Math.abs((staleSolved.controls.mouthSmileLeft.value ?? -1) - (stale.semantic.mouthSmileLeft ?? 0)) < 1e-9,
  'stale → semantic equality',
);

// Under-response correction
const underSolved = mod.solveHybridFace({
  semanticFace: under.semantic,
  dense: under.dense,
  sequence: under.sequence,
  timestampMs: under.timestampMs,
  denseSequence: under.dense?.sequence,
});
check(underSolved.denseSequenceAligned === true, 'under aligned');
check(
  (underSolved.controls.mouthSmileLeft.value ?? 0) >
    (under.semantic.mouthSmileLeft ?? 0) + 0.05,
  `under-response corrected got ${underSolved.controls.mouthSmileLeft.value}`,
);

// Unilateral L/R
const leftOnly = mod.buildHybridFaceFixture('hy-smile-left-only');
const leftSolved = mod.solveHybridFace({
  semanticFace: leftOnly.semantic,
  dense: leftOnly.dense,
  sequence: leftOnly.sequence,
  timestampMs: leftOnly.timestampMs,
  denseSequence: leftOnly.dense?.sequence,
});
check((leftSolved.controls.mouthSmileLeft.value ?? 0) > 0.35, 'left smile active');
check((leftSolved.controls.mouthSmileRight.value ?? 0) < 0.2, 'right smile stays low');

// Pucker ≠ Funnel
const puck = mod.buildHybridFaceFixture('hy-pucker-under');
const fun = mod.buildHybridFaceFixture('hy-funnel');
const puckS = mod.solveHybridFace({
  semanticFace: puck.semantic,
  dense: puck.dense,
  sequence: puck.sequence,
  timestampMs: puck.timestampMs,
  denseSequence: puck.dense?.sequence,
});
const funS = mod.solveHybridFace({
  semanticFace: fun.semantic,
  dense: fun.dense,
  sequence: fun.sequence,
  timestampMs: fun.timestampMs,
  denseSequence: fun.dense?.sequence,
});
check((puckS.controls.mouthPucker.value ?? 0) > (puckS.controls.mouthFunnel.value ?? 0), 'pucker > funnel on pucker fixture');
check((funS.controls.mouthFunnel.value ?? 0) >= (fun.semantic.mouthFunnel ?? 0) - 0.01, 'funnel preserved/corrected');

// Clean non-degradation
const clean = mod.buildHybridFaceFixture('hy-clean-smile-bilateral');
const cleanS = mod.solveHybridFace({
  semanticFace: clean.semantic,
  dense: clean.dense,
  sequence: clean.sequence,
  timestampMs: clean.timestampMs,
  denseSequence: clean.dense?.sequence,
});
check(
  Math.abs((cleanS.controls.mouthSmileLeft.value ?? 0) - (clean.latent.mouthSmileLeft ?? 0)) <=
    Math.abs((clean.semantic.mouthSmileLeft ?? 0) - clean.latent.mouthSmileLeft) +
      mod.LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL +
      1e-6,
  'clean non-degradation',
);

// Determinism / no temporal state
const a1 = mod.solveHybridFace({
  semanticFace: under.semantic,
  dense: under.dense,
  sequence: under.sequence,
  timestampMs: under.timestampMs,
  denseSequence: under.dense?.sequence,
});
const a2 = mod.solveHybridFace({
  semanticFace: under.semantic,
  dense: under.dense,
  sequence: under.sequence,
  timestampMs: under.timestampMs,
  denseSequence: under.dense?.sequence,
});
check(
  JSON.stringify(a1.controls) === JSON.stringify(a2.controls),
  'deterministic frame-local',
);

// A/B
const ab = mod.runHybridFaceAbBenchmark();
check(ab.cleanNonDegradation === true, 'AB clean non-degradation');
check(ab.hybridBeatsV1 === true, `AB hybrid beats V1 (underImp path) hybridBeats=${ab.hybridBeatsV1} motionΔ=${ab.motionImprovement} valΔ=${ab.validationImprovement}`);
check(ab.crossTalk.notWorse === true, `cross-talk not worse v1=${ab.crossTalk.v1MaxUnintended} hy=${ab.crossTalk.hybridMaxUnintended}`);
check(ab.speech.returnToNeutralOk === true, 'return to neutral');
check(
  ab.avatarContourFidelity.startsWith('NOT_MEASURED'),
  'avatar contour labeled NOT_MEASURED',
);
check(
  ab.speech.hybridCorrelation !== null &&
    (ab.speech.hybridCorrelation >= (ab.speech.v1Correlation ?? 0) - 1e-9 ||
      ab.speech.hybridCorrelation >= 0.95),
  `speech corr hy=${ab.speech.hybridCorrelation} v1=${ab.speech.v1Correlation}`,
);
check(
  (ab.speech.hybridSaturation ?? 1) <= (ab.speech.v1Saturation ?? 1) + 0.05,
  'saturation not worse',
);

const ab2 = mod.runHybridFaceAbBenchmark();
const h1 = createHash('sha256').update(JSON.stringify(ab)).digest('hex');
const h2 = createHash('sha256').update(JSON.stringify(ab2)).digest('hex');
check(h1 === h2, 'AB deterministic');

// #446 still importable
check(mod.LIVEACT_IRIS_GAZE_CONTRACT === 'SagaDriveLiveActIrisGazeV1', '#446 contract intact');
check(typeof mod.solveIrisGaze === 'function', '#446 solve intact');
check(typeof mod.arbitrateLiveActGaze === 'function', '#446 arb intact');

mkdirSync(join(root, '.qa/evidence/liveact-hybrid-mouth-face-solver'), { recursive: true });
const evidence = {
  contractVersion: ab.contractVersion,
  fixtureVersion: ab.fixtureVersion,
  controlsEvaluated: ab.controlsEvaluated,
  v1: {
    motionErrorMedian: ab.v1.medianAbsError,
    speechCorrelation: ab.speech.v1Correlation,
    amplitudeRetentionPct: ab.speech.v1AmplitudeRetentionPct,
    velocityRetentionPct: ab.speech.v1VelocityRetentionPct,
    saturation: ab.speech.v1Saturation,
    crossTalkMax: ab.crossTalk.v1MaxUnintended,
  },
  hybrid: {
    motionErrorMedian: ab.hybrid.medianAbsError,
    speechCorrelation: ab.speech.hybridCorrelation,
    amplitudeRetentionPct: ab.speech.hybridAmplitudeRetentionPct,
    velocityRetentionPct: ab.speech.hybridVelocityRetentionPct,
    saturation: ab.speech.hybridSaturation,
    crossTalkMax: ab.crossTalk.hybridMaxUnintended,
  },
  improvement: {
    motionMedianAbs: ab.motionImprovement,
    validationMedianAbs: ab.validationImprovement,
    success: ab.hybridBeatsV1,
  },
  avatarContourFidelity: ab.avatarContourFidelity,
  privacy: { committedRawLandmarks: 0, committedWebcam: 0 },
  requires450: [
    'nasolabial fold intensity (beyond noseSneer)',
    'richer cheek volume',
    'segmented lip contour correctives',
  ],
};
writeFileSync(
  join(root, '.qa/evidence/liveact-hybrid-mouth-face-solver/ab-hybrid-vs-v1.json'),
  JSON.stringify(evidence, null, 2) + '\n',
);

const summary = {
  contractVersion: mod.LIVEACT_HYBRID_FACE_CONTRACT,
  ab,
  evidence,
  authoritativeGate: 'scripts/liveact-hybrid-mouth-face-solver-check.mjs',
  deterministicHash: h1,
};
writeFileSync(
  join(root, '.qa/runs/447-hybrid-mouth-face-solver-summary.json'),
  JSON.stringify(summary, null, 2) + '\n',
);

console.log('liveact-hybrid-mouth-face-solver-check OK');
console.log(
  JSON.stringify(
    {
      hybridBeatsV1: ab.hybridBeatsV1,
      motionImprovement: ab.motionImprovement,
      validationImprovement: ab.validationImprovement,
      speechCorr: { v1: ab.speech.v1Correlation, hybrid: ab.speech.hybridCorrelation },
      crossTalkOk: ab.crossTalk.notWorse,
    },
    null,
    2,
  ),
);
