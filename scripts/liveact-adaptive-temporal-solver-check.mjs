#!/usr/bin/env node
/**
 * liveact-adaptive-temporal-solver-check — authoritative #448 Temporal gate.
 * Location: scripts/liveact-adaptive-temporal-solver-check.mjs
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
    console.error(`liveact-adaptive-temporal-solver-check FAIL: ${msg}`);
    process.exit(1);
  }
}

check(existsSync(join(root, '.qa/design/liveact-adaptive-temporal-solver.md')), 'design');
check(existsSync(join(root, '.qa/acceptance/liveact-adaptive-temporal-solver.md')), 'acceptance');
const design = read('.qa/design/liveact-adaptive-temporal-solver.md');
const acceptance = read('.qa/acceptance/liveact-adaptive-temporal-solver.md');
check(/Temporal Solver/.test(design) && /Personal Calibration/.test(design), 'design boundaries');
check(/same value sequence/.test(design), 'design determinism');
check(/CE-04/.test(acceptance) && /CE-20/.test(acceptance), 'acceptance CE');
check(/liveact-adaptive-temporal-solver-check/.test(read('scripts/test-gate.mjs')), 'test-gate wiring');
check(/liveact-adaptive-temporal-local/.test(read('.gitignore')), 'local gitignore');

const domainFiles = [
  'src/domains/character/liveact/liveact-temporal-contract.ts',
  'src/domains/character/liveact/liveact-temporal-solve.ts',
  'src/domains/character/liveact/liveact-temporal-fixtures.ts',
  'src/domains/character/liveact/liveact-temporal-ab.ts',
];
for (const rel of domainFiles) {
  const src = read(rel);
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, /@ts-nocheck/, / as any\b/, / as unknown as /]) {
    check(!pattern.test(src), `${rel} no type escape`);
  }
  check(!/Date\.now\(/.test(src), `${rel} no Date.now`);
}

const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const calib = read('src/domains/character/liveact/liveact-calibration.ts');
const contract = read('src/domains/character/liveact/liveact-contract.ts');
check(/stepAdaptiveTemporal|mode === 'adaptive'|mode: LiveActSmoothPathMode = 'adaptive'/.test(calib), 'calibration uses adaptive');
check(/smoothLiveActFrame/.test(contract), 'V1 smoothLiveActFrame retained');
check(/DEFAULT_LIVEACT_LIMITS\.smooth/.test(contract) || /smooth:\s*0\.35/.test(contract), 'V1 alpha 0.35 retained');
check(/pipelineStep = null/.test(engine) && /bindOutput/.test(engine), 'engine model-swap temporal reset');
check(/semanticFace:\s*sample\.face/.test(engine), '#447 anatomical fusion intact');
check(/LIVEACT_TEMPORAL_CONTRACT/.test(read('src/domains/character/liveact/index.ts')), 'barrel');
check(/fidelityOvershoot/.test(read('src/domains/character/liveact/liveact-perfect-fidelity-math.ts')), 'overshoot metric');

// Privacy
const privacyRoots = ['.qa/evidence/liveact-adaptive-temporal-solver', '.qa/fixtures/liveact-adaptive-temporal-solver'];
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

const outfile = join(root, '.qa/runs/liveact-adaptive-temporal-solver-bundle.mjs');
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
check(mod.LIVEACT_TEMPORAL_CONTRACT === 'SagaDriveLiveActTemporalV1', 'contract id');
check(mod.LIVEACT_TEMPORAL_POLICY_VERSION === 'liveact-temporal-policy-v1', 'policy version');

// V1 baseline unchanged numerically on a fixed sample
const seq = mod.buildHeadYawStepSequence(30, 10);
let prev = null;
const v1a = [];
const v1b = [];
for (const f of seq.frames) {
  const o1 = mod.smoothLiveActFrame(prev, f, mod.DEFAULT_LIVEACT_LIMITS.smooth);
  v1a.push(o1.head.yaw);
  prev = o1;
}
prev = null;
for (const f of seq.frames) {
  const o1 = mod.smoothLiveActFrame(prev, f, 0.35);
  v1b.push(o1.head.yaw);
  prev = o1;
}
check(JSON.stringify(v1a) === JSON.stringify(v1b), 'V1 baseline alpha 0.35 stable');

// dt-based: resolveTemporalDtMs
const dt = mod.resolveTemporalDtMs(0, 33);
check(dt.dtMs > 0 && dt.rebase === false, 'dt normal');
const long = mod.resolveTemporalDtMs(0, 500);
check(long.rebase === true, 'long gap rebase');
const bad = mod.resolveTemporalDtMs(10, 5);
check(bad.dtMs === mod.LIVEACT_TEMPORAL_DEFAULT_DT_MS, 'invalid dt → default');

// Determinism
const ab1 = mod.runTemporalAbBenchmark();
const ab2 = mod.runTemporalAbBenchmark();
const h1 = createHash('sha256').update(JSON.stringify(ab1)).digest('hex');
const h2 = createHash('sha256').update(JSON.stringify(ab2)).digest('hex');
check(h1 === h2, 'AB deterministic');
check(ab1.success === true, `AB success=${ab1.success}`);

// Head jitter improved
check(
  (ab1.adaptive.headJitterP95 ?? 1) <= (ab1.v1Fixed.headJitterP95 ?? 1) + 1e-9,
  `head jitter ad=${ab1.adaptive.headJitterP95} v1=${ab1.v1Fixed.headJitterP95}`,
);

// Gaze fast
check(
  (ab1.adaptive.gazeLagMs ?? 999) <=
    (ab1.v1Fixed.gazeLagMs ?? 0) + ab1.targets.gazeLagSlackMsVsV1,
  `gaze lag ad=${ab1.adaptive.gazeLagMs}`,
);

// Blink
check((ab1.adaptive.blinkPeak ?? 0) >= ab1.targets.blinkPeakMin, `blink peak=${ab1.adaptive.blinkPeak}`);
check((ab1.adaptive.blinkCrossTalk ?? 1) <= (ab1.v1Fixed.blinkCrossTalk ?? 0) + 0.05, 'blink cross-talk');

// Lip frequency sweep
for (const f of ['1Hz', '2Hz', '3Hz', '5Hz']) {
  const m = ab1.adaptive.lip[f];
  check(m, `lip ${f} present`);
  check(
    (m.amplitudeRetentionPct ?? 0) >= ab1.targets.lipAmplitudeRetentionMinPct &&
      (m.amplitudeRetentionPct ?? 999) <= ab1.targets.lipAmplitudeRetentionMaxPct,
    `lip ${f} amp=${m.amplitudeRetentionPct}`,
  );
  check((m.lagMs ?? 999) <= ab1.targets.lipLagP95MsMax, `lip ${f} lag=${m.lagMs}`);
}

// Speech
check((ab1.adaptive.speech.returnLagMs ?? 999) <= ab1.targets.lipReturnLagMsMax, 'speech return');
check((ab1.adaptive.speech.saturation ?? 1) < ab1.targets.lipSaturationMax, 'speech sat');

// FPS
check(ab1.fps.comparable === true, '30/60 Hz comparable');

// Lifecycle
check(ab1.lifecycle.lostReacquireMaxSmileAfter <= 0.08, 'reacquire no stale smile');
check(ab1.lifecycle.droppedFinite === true, 'dropped finite');
check((ab1.lifecycle.droppedOvershoot ?? 1) <= 0.05, 'dropped overshoot');

// Behavioral lost/reacquire
const lostSeq = mod.buildLostReacquireSmileSequence(60);
let temporal = null;
const smileOut = [];
for (const f of lostSeq.frames) {
  const step = mod.stepAdaptiveTemporal(temporal, f);
  temporal = step.state;
  smileOut.push(step.frame.face.mouthSmileLeft ?? 0);
}
const after = smileOut.slice(-15);
check(Math.max(...after) <= 0.08, `reacquire smile max=${Math.max(...after)}`);

// Model-swap semantics: resetAdaptiveTemporal then new input
const reset = mod.resetAdaptiveTemporal(0);
check(reset.mode === 'rebase', 'reset mode rebase');
const afterReset = mod.stepAdaptiveTemporal(reset, lostSeq.frames[0]);
check((afterReset.frame.face.mouthSmileLeft ?? 0) > 0.5, 'after reset follows current input');

// #446 / #447 intact
check(mod.LIVEACT_IRIS_GAZE_CONTRACT === 'SagaDriveLiveActIrisGazeV1', '#446 contract');
check(typeof mod.solveIrisGaze === 'function', '#446 solve');
check(mod.LIVEACT_HYBRID_FACE_CONTRACT === 'SagaDriveLiveActHybridFaceV1', '#447 contract');
check(typeof mod.solveHybridFace === 'function', '#447 solve');

// Overshoot helper
check(typeof mod.fidelityOvershoot === 'function', 'overshoot export');
check(mod.fidelityOvershoot([0, 1, 1], [0, 1.1, 1.05], 1) > 0.09, 'overshoot detects');

mkdirSync(join(root, '.qa/evidence/liveact-adaptive-temporal-solver'), { recursive: true });
const evidence = {
  contractVersion: ab1.contractVersion,
  policyVersion: ab1.policyVersion,
  v1Fixed: {
    headJitter: ab1.v1Fixed.headJitterP95,
    gazeLag: ab1.v1Fixed.gazeLagMs,
    lipAmplitude: Object.fromEntries(
      Object.entries(ab1.v1Fixed.lip).map(([k, v]) => [k, v.amplitudeRetentionPct]),
    ),
    lipLag: Object.fromEntries(Object.entries(ab1.v1Fixed.lip).map(([k, v]) => [k, v.lagMs])),
    lipVelocity: Object.fromEntries(
      Object.entries(ab1.v1Fixed.lip).map(([k, v]) => [k, v.velocityRetentionPct]),
    ),
    overshoot: ab1.v1Fixed.headOvershoot,
    returnToNeutral: ab1.v1Fixed.speech.returnLagMs,
    speech: ab1.v1Fixed.speech,
  },
  adaptive: {
    headJitter: ab1.adaptive.headJitterP95,
    gazeLag: ab1.adaptive.gazeLagMs,
    lipAmplitude: Object.fromEntries(
      Object.entries(ab1.adaptive.lip).map(([k, v]) => [k, v.amplitudeRetentionPct]),
    ),
    lipLag: Object.fromEntries(Object.entries(ab1.adaptive.lip).map(([k, v]) => [k, v.lagMs])),
    lipVelocity: Object.fromEntries(
      Object.entries(ab1.adaptive.lip).map(([k, v]) => [k, v.velocityRetentionPct]),
    ),
    overshoot: ab1.adaptive.headOvershoot,
    returnToNeutral: ab1.adaptive.speech.returnLagMs,
    speech: ab1.adaptive.speech,
  },
  frequencySweep: ab1.frequencySweep,
  fps: ab1.fps,
  lifecycle: ab1.lifecycle,
  targets: ab1.targets,
  results: { success: ab1.success },
  ce: {
    'CE-04': 'lip lag p95 ≤66ms; gaze fast; #444 runtime targets',
    'CE-20': 'lost/reacquire/dropped defined; no stale leakage',
    other: 'N/A — no user-facing control surface changed',
  },
  privacy: ab1.privacy,
};
writeFileSync(
  join(root, '.qa/evidence/liveact-adaptive-temporal-solver/ab-adaptive-vs-v1.json'),
  JSON.stringify(evidence, null, 2) + '\n',
);

writeFileSync(
  join(root, '.qa/runs/448-adaptive-temporal-solver-summary.json'),
  JSON.stringify({ contractVersion: mod.LIVEACT_TEMPORAL_CONTRACT, ab: ab1, evidence, deterministicHash: h1 }, null, 2) +
    '\n',
);

console.log('liveact-adaptive-temporal-solver-check OK');
console.log(
  JSON.stringify(
    {
      success: ab1.success,
      headJitter: { v1: ab1.v1Fixed.headJitterP95, adaptive: ab1.adaptive.headJitterP95 },
      lip5HzAmp: ab1.adaptive.lip['5Hz']?.amplitudeRetentionPct,
      speechAmp: ab1.adaptive.speech.amplitudeRetentionPct,
      gazeLag: ab1.adaptive.gazeLagMs,
    },
    null,
    2,
  ),
);
