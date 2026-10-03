#!/usr/bin/env node
/**
 * liveact-perfect-fidelity-benchmark-check — authoritative #444 Perfect Fidelity measurement gate.
 * Location: scripts/liveact-perfect-fidelity-benchmark-check.mjs
 *
 * Proves contract/fixtures/metric math/determinism/privacy. Does NOT require V1 to meet all stretch targets.
 * Existing liveact-facial-fidelity-v2-check.mjs remains gaze-exclusivity (#403) — not this entry point.
 */
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
    console.error(`liveact-perfect-fidelity-benchmark-check FAIL: ${msg}`);
    process.exit(1);
  }
}

function approx(a, b, tol) {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
}

const design = join(root, '.qa/design/liveact-perfect-fidelity-benchmark.md');
const acceptance = join(root, '.qa/acceptance/liveact-perfect-fidelity-benchmark.md');
const gate = read('scripts/test-gate.mjs');
const gitignore = read('.gitignore');

check(existsSync(design), 'design artifact');
check(existsSync(acceptance), 'acceptance artifact');
check(/liveact-perfect-fidelity-benchmark/.test(read('.qa/design/liveact-perfect-fidelity-benchmark.md')), 'design slug');
check(/#444/.test(read('.qa/acceptance/liveact-perfect-fidelity-benchmark.md')), 'acceptance issue');
check(/Measurement Contract/.test(read('.qa/design/liveact-perfect-fidelity-benchmark.md')), 'measurement vs solver');
check(/checkLiveActPerfectFidelityBenchmark|liveact-perfect-fidelity-benchmark-check/.test(gate), 'test-gate wiring');
check(/liveact-perfect-fidelity-local-capture/.test(gitignore), 'local capture gitignore');

const domainFiles = [
  'src/domains/character/liveact/liveact-perfect-fidelity-contract.ts',
  'src/domains/character/liveact/liveact-perfect-fidelity-math.ts',
  'src/domains/character/liveact/liveact-perfect-fidelity-capture.ts',
  'src/domains/character/liveact/liveact-perfect-fidelity-evaluate.ts',
  'src/domains/character/liveact/liveact-perfect-fidelity-fixtures.ts',
  'src/domains/character/liveact/index.ts',
];
for (const rel of domainFiles) {
  const src = read(rel);
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, /@ts-nocheck/, / as any\b/, / as unknown as /]) {
    check(!pattern.test(src), `${rel} no type escape ${pattern}`);
  }
}
check(/LIVEACT_PERFECT_FIDELITY_CONTRACT/.test(read('src/domains/character/liveact/index.ts')), 'barrel exports');

// Privacy: forbid committed biometric capture trees under new evidence roots
const privacyRoots = [
  '.qa/evidence/liveact-perfect-fidelity-benchmark',
  '.qa/fixtures/liveact-perfect-fidelity-benchmark',
  '.qa/runs/liveact-perfect-fidelity',
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
    const ext = lower.slice(lower.lastIndexOf('.'));
    check(!bannedExt.has(ext), `privacy: banned media ${relative(root, file)}`);
    check(!/landmark.?time.?series|webcam.?raw|iris.?capture/i.test(file), `privacy path ${file}`);
    if (ext === '.json') {
      const body = readFileSync(file, 'utf8');
      check(!/"landmarks"\s*:\s*\[/.test(body), `privacy: raw landmarks array in ${relative(root, file)}`);
    }
  }
}

const outDir = join(root, '.qa/runs');
mkdirSync(outDir, { recursive: true });
mkdirSync(join(root, '.qa/evidence/liveact-perfect-fidelity-benchmark'), { recursive: true });
const outfile = join(outDir, 'liveact-perfect-fidelity-benchmark-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  write: true,
  logLevel: 'silent',
});
const mod = await import(`${outfile}?t=${Date.now()}`);

check(mod.LIVEACT_PERFECT_FIDELITY_CONTRACT === 'SagaDriveLiveActPerfectFidelityV1', 'contract id');
check(mod.LIVEACT_FIDELITY_CAPTURE_CONTRACT === 'SagaDriveLiveActFidelityCaptureV1', 'capture id');
check(mod.LIVEACT_FIDELITY_REPORT_CONTRACT === 'SagaDriveLiveActFidelityReportV1', 'report id');
check(mod.LIVEACT_PERFECT_FIDELITY_STAGES.length === 6, 'six stages');
check(
  mod.LIVEACT_PERFECT_FIDELITY_STAGES.join(',') ===
    'raw,mapped,smoothed,calibrated,retargeted,applied',
  'stage order',
);
check(mod.LIVEACT_PERFECT_FIDELITY_TARGETS.version === 'pf-targets-v1', 'targets version');
check(mod.LIVEACT_PERFECT_FIDELITY_TARGETS.lips.dynamicCorrelationMin === 0.95, 'lip corr target');
check(mod.LIVEACT_PERFECT_FIDELITY_TARGETS.runtime.sustainedFpsMin === 30, 'fps target');

// Math goldens
check(approx(mod.fidelityPearson([1, 2, 3, 4], [1, 2, 3, 4]), 1, 1e-9), 'pearson identity');
check(approx(mod.fidelityPercentile([1, 2, 3, 4, 5], 50), 3, 1e-9), 'median');
const lag = mod.fidelityBestLagCorrelation(
  [0, 0, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0],
  30,
  200,
);
check(lag.bestLagMs !== null && Math.abs(lag.bestLagMs - 1000 / 30) < 1, `best lag ~33ms got ${lag.bestLagMs}`);

// Fixtures + metric goldens
const perfect = mod.fixturePerfectIdentityJaw();
const perfectProbe = mod.evaluateFidelityMotionProbe(
  perfect,
  'jaw',
  'face.jawOpen',
  0.7,
  ['face.eyeBlinkLeft'],
);
check(perfectProbe.hold.amplitude.status === 'PASS', 'perfect hold amplitude');
check(perfectProbe.returnPhase.additionalLagMs.status === 'PASS', 'perfect return lag');

const latency = mod.fixtureKnownLatency();
const runtimeLat = mod.evaluateFidelityRuntimeMetrics(latency);
const delayMetric = runtimeLat.find((m) => m.id === 'runtime.processingDelayMedianMs');
check(delayMetric && approx(delayMetric.value, 1000 / 30 * 2, 0.5), `known delay ~66.67 got ${delayMetric?.value}`);
check(delayMetric.status === 'MISS' || delayMetric.status === 'PASS', 'delay status measured');
// 66.67 > 50 → MISS stretch target (honest)
check(delayMetric.status === 'MISS', 'known 66ms delay must MISS 50ms stretch target');

const under = mod.fixtureAmplitudeUnderResponse();
const underProbe = mod.evaluateFidelityMotionProbe(under, 'under', 'face.jawOpen', 0.8, []);
check(underProbe.hold.amplitudeRetention.status === 'MISS', 'under-response retention MISS');

const over = mod.fixtureAmplitudeOverResponse();
const overProbe = mod.evaluateFidelityMotionProbe(over, 'over', 'face.mouthSmileLeft', 0.5, []);
check(overProbe.hold.amplitudeRetention.status === 'MISS', 'over-response retention MISS');

const xtalk = mod.fixtureCrossTalk();
const xtalkProbe = mod.evaluateFidelityMotionProbe(
  xtalk,
  'xtalk',
  'face.eyeBlinkLeft',
  0.9,
  ['face.eyeBlinkRight'],
);
check(xtalkProbe.hold.crossTalk.status === 'MISS', 'cross-talk MISS');

const jitter = mod.fixtureJitter();
const jitterProbe = mod.evaluateFidelityMotionProbe(jitter, 'jitter', 'face.browInnerUp', 0.5, []);
check(jitterProbe.hold.jitter.status === 'MISS', 'jitter MISS');

const sat = mod.fixtureSaturation();
const satProbe = mod.evaluateFidelityMotionProbe(sat, 'sat', 'face.mouthPucker', 0.7, []);
check(satProbe.hold.saturation.status === 'MISS', 'saturation MISS');

const delayed = mod.fixtureDelayedReturn();
const delayedProbe = mod.evaluateFidelityMotionProbe(delayed, 'ret', 'face.jawOpen', 0.7, []);
check(delayedProbe.returnPhase.additionalLagMs.status === 'MISS', 'delayed return MISS');
check(
  delayedProbe.returnPhase.additionalLagMs.value !== null &&
    delayedProbe.returnPhase.additionalLagMs.value >= 70,
  'delayed return lag >= 70ms',
);

const drops = mod.fixtureDroppedFrames();
check(drops.droppedInferenceFrames > 0, 'dropped frames detected from sequence gaps');
const dropRuntime = mod.evaluateFidelityRuntimeMetrics(drops);
const dropFrac = dropRuntime.find((m) => m.id === 'runtime.droppedInferenceFraction');
check(dropFrac && dropFrac.value > 0, 'drop fraction > 0');

const speech = mod.fixtureSpeechShaped();
check(speech.samples.length >= 30, 'speech time-series length');
check(speech.sourceKind === 'synthetic_speech', 'speech source kind');
const coverage = mod.fidelityStageCoverage(speech);
for (const stage of mod.LIVEACT_PERFECT_FIDELITY_STAGES) {
  check(coverage[stage].present > 0, `speech stage ${stage} present`);
}
const speechJaw = mod.evaluateFidelitySpeechChannel(speech, 'face.jawOpen');
check(speechJaw.correlationAligned.status === 'PASS' || speechJaw.correlationAligned.status === 'MISS', 'speech corr measured');
check(typeof speechJaw.bestLagMs.value === 'number', 'speech lag numeric');
check(speechJaw.amplitudeRetentionPct.status !== 'NOT_MEASURED' || speechJaw.amplitudeRetentionPct.status === 'NOT_APPLICABLE', 'amp retention evaluated');

const gaze = mod.fixtureGazeAngularError();
const gazeMetrics = mod.evaluateFidelityGazeAngular(gaze.targets, gaze.outputs);
const gazeMed = gazeMetrics.find((m) => m.id === 'gaze.angularErrorMedianDeg');
check(gazeMed && approx(gazeMed.value, gaze.expectedMedianDegApprox, 0.25), 'gaze median ~4°');
check(gazeMed.status === 'MISS', 'gaze 4° MISS vs 3° target');

const contour = mod.fixtureContourError();
const contourMetrics = mod.evaluateFidelityContour(contour.errors, contour.mouthWidth);
const cMed = contourMetrics.find((m) => m.id === 'lips.contourMedianErrorPctMouthWidth');
check(cMed && approx(cMed.value, contour.expectedMedianPctApprox, 0.2), 'contour median ~2%');
check(cMed.status === 'PASS', 'contour 2% PASS vs 3%');

const missing = mod.fixtureMissingAppliedStage();
const missCov = mod.fidelityStageCoverage(missing);
check(missCov.applied.missing === 1, 'exactly one missing applied sample');

// Head / gaze motion probes (V1 control keys)
for (const [id, key, hold, unintended] of [
  ['headYaw', 'head.yaw', 0.35, 'head.pitch'],
  ['headPitch', 'head.pitch', 0.3, 'head.roll'],
  ['headRoll', 'head.roll', 0.25, 'head.yaw'],
  ['gazeX', 'eyeLeft.x', 0.45, 'eyeLeft.y'],
  ['gazeY', 'eyeLeft.y', 0.4, 'eyeLeft.x'],
]) {
  const session = mod.buildFidelityMotionProbeFixture({
    scenarioId: `motion-${id}`,
    signalKey: key,
    holdValue: hold,
    unintendedKey: unintended,
    unintendedHoldValue: 0.01,
  });
  check(session.samples.every((s) => s.phase === 'SETTLE' || s.phase === 'HOLD' || s.phase === 'RETURN_TO_NEUTRAL'), `${id} phases`);
  const probe = mod.evaluateFidelityMotionProbe(session, id, key, hold, [unintended]);
  check(probe.hold.amplitude.status === 'PASS', `${id} hold amplitude`);
  check(probe.settle.neutralBias.status === 'PASS', `${id} settle bias`);
}

// Determinism: two evaluations equal (strip measuredAt)
const reportA = mod.buildFidelityReport({
  session: perfect,
  metrics: [...mod.evaluateFidelityRuntimeMetrics(perfect), perfectProbe.hold.amplitude],
  measuredAt: '2026-01-01T00:00:00.000Z',
});
const reportB = mod.buildFidelityReport({
  session: perfect,
  metrics: [...mod.evaluateFidelityRuntimeMetrics(perfect), perfectProbe.hold.amplitude],
  measuredAt: '2026-12-31T23:59:59.000Z',
});
check(
  JSON.stringify(mod.fidelityReportForEquality(reportA)) ===
    JSON.stringify(mod.fidelityReportForEquality(reportB)),
  'determinism ignore measuredAt',
);

// V1 baseline report — honest statuses, no threshold weakening
const baselineMetrics = [];
const warnings = [
  'V1 baseline measurement via synthetic fixtures + identity pipeline semantics',
  'Dense contour / iris runtime NOT_MEASURED until #445/#446',
  'Camera→avatar latency NOT_MEASURED without acquisition timestamp (except latency fixture)',
];

const probes = [
  { id: 'jawOpen', key: 'face.jawOpen', hold: 0.7, unintended: ['face.eyeBlinkLeft'] },
  { id: 'eyeBlinkLeft', key: 'face.eyeBlinkLeft', hold: 0.95, unintended: ['face.eyeBlinkRight'] },
  { id: 'eyeBlinkRight', key: 'face.eyeBlinkRight', hold: 0.95, unintended: ['face.eyeBlinkLeft'] },
  { id: 'browInnerUp', key: 'face.browInnerUp', hold: 0.6, unintended: ['face.jawOpen'] },
  { id: 'mouthSmileLeft', key: 'face.mouthSmileLeft', hold: 0.7, unintended: ['face.mouthSmileRight'] },
  { id: 'mouthSmileRight', key: 'face.mouthSmileRight', hold: 0.7, unintended: ['face.mouthSmileLeft'] },
  { id: 'mouthPucker', key: 'face.mouthPucker', hold: 0.65, unintended: ['face.jawOpen'] },
];

for (const p of probes) {
  const session = mod.buildFidelityMotionProbeFixture({
    scenarioId: `v1-baseline-${p.id}`,
    signalKey: p.key,
    holdValue: p.hold,
  });
  const result = mod.evaluateFidelityMotionProbe(session, p.id, p.key, p.hold, p.unintended);
  baselineMetrics.push(
    result.settle.neutralBias,
    result.settle.neutralNoise,
    result.hold.amplitude,
    result.hold.crossTalk,
    result.returnPhase.additionalLagMs,
  );
}

baselineMetrics.push(...mod.evaluateFidelityRuntimeMetrics(mod.fixturePerfectIdentityJaw()));
{
  const speechEval = mod.evaluateFidelitySpeechChannel(speech, 'face.jawOpen');
  baselineMetrics.push(
    speechEval.correlationAligned,
    speechEval.bestLagMs,
    speechEval.amplitudeRetentionPct,
    speechEval.velocityRetentionPct,
    speechEval.saturationFraction,
  );
}

// Gaze / contour: schema measured on synthetic geometry only — mark V1 dense as NOT_MEASURED
baselineMetrics.push({
  id: 'v1.gaze.angularErrorMedianDeg',
  value: null,
  unit: 'deg',
  target: mod.LIVEACT_PERFECT_FIDELITY_TARGETS.eyes.gazeAngularErrorMedianDegMax,
  status: 'NOT_MEASURED',
  sampleCount: 0,
  note: 'requires dense iris/gaze stage (#446); synthetic schema verified separately',
});
baselineMetrics.push({
  id: 'v1.lips.contourMedianErrorPctMouthWidth',
  value: null,
  unit: 'percent',
  target: mod.LIVEACT_PERFECT_FIDELITY_TARGETS.lips.contourMedianErrorPctMouthWidthMax,
  status: 'NOT_MEASURED',
  sampleCount: 0,
  note: 'requires dense geometry stage (#445); synthetic schema verified separately',
});
baselineMetrics.push({
  id: 'v1.runtime.cameraToAvatarP95Ms',
  value: null,
  unit: 'ms',
  target: mod.LIVEACT_PERFECT_FIDELITY_TARGETS.runtime.cameraToAvatarP95MsMax,
  status: 'NOT_MEASURED',
  sampleCount: 0,
  note: 'no authoritative camera acquisition timestamp on V1 path',
});

// Known latency fixture contributes an honest MISS for processing delay stretch target
baselineMetrics.push(delayMetric);

const baselineSession = mod.fixturePerfectIdentityJaw();
const baselineReport = mod.buildFidelityReport({
  session: {
    ...baselineSession,
    scenarioId: 'v1-compatibility-baseline',
    sourceKind: 'synthetic',
  },
  metrics: baselineMetrics,
  warnings,
  measuredAt: new Date().toISOString(),
});

const pass = baselineMetrics.filter((m) => m.status === 'PASS').map((m) => m.id);
const miss = baselineMetrics.filter((m) => m.status === 'MISS').map((m) => m.id);
const notMeasured = baselineMetrics.filter((m) => m.status === 'NOT_MEASURED').map((m) => m.id);

const summary = {
  contractVersion: mod.LIVEACT_PERFECT_FIDELITY_CONTRACT,
  reportVersion: mod.LIVEACT_FIDELITY_REPORT_CONTRACT,
  targetsVersion: mod.LIVEACT_PERFECT_FIDELITY_TARGETS.version,
  benchmarkVersion: mod.LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION,
  authoritativeGate: 'scripts/liveact-perfect-fidelity-benchmark-check.mjs',
  facialFidelityV2CheckRemains: 'scripts/liveact-facial-fidelity-v2-check.mjs (#403 gaze exclusivity)',
  fixtureIds: mod.LIVEACT_FIDELITY_SYNTHETIC_FIXTURE_IDS,
  v1Baseline: {
    PASS: pass,
    MISS: miss,
    NOT_MEASURED: notMeasured,
  },
  note: 'MISS against stretch targets is valid for #444; solvers are #445–#451',
};

writeFileSync(
  join(root, '.qa/evidence/liveact-perfect-fidelity-benchmark/v1-baseline-report.json'),
  `${JSON.stringify(baselineReport, null, 2)}\n`,
);
writeFileSync(
  join(root, '.qa/runs/444-perfect-fidelity-benchmark-summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);

check(miss.includes('runtime.processingDelayMedianMs'), 'baseline records processing delay MISS from latency fixture');
check(notMeasured.length >= 2, 'baseline has NOT_MEASURED entries');

console.log('liveact-perfect-fidelity-benchmark-check OK');
console.log(`  fixtures: ${mod.LIVEACT_FIDELITY_SYNTHETIC_FIXTURE_IDS.length}`);
console.log(`  V1 baseline PASS=${pass.length} MISS=${miss.length} NOT_MEASURED=${notMeasured.length}`);
