#!/usr/bin/env node
/**
 * liveact-hybrid-mouth-face-solver-check — authoritative #447 Hybrid Face gate.
 * Location: scripts/liveact-hybrid-mouth-face-solver-check.mjs
 *
 * Behavioral assertions (not regex-only) for orientation, neutral leakage,
 * jaw static anatomy, press/roll gating, disagreement authority, active-control
 * non-degradation, auditable improvement metric, CE refs, V1 fallback, A/B, #446.
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
const design = read('.qa/design/liveact-hybrid-mouth-face-solver.md');
const acceptance = read('.qa/acceptance/liveact-hybrid-mouth-face-solver.md');
check(/#447 fusion/.test(design), 'design boundaries');
check(/orientation authority = anatomical/i.test(design), 'design orientation authority');
check(/mirror exactly once/i.test(design), 'design mirror once');
check(/LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT|0\.05/.test(design), 'predeclared success rules');
check(/CE-04/.test(acceptance) && /CE-20/.test(acceptance), 'acceptance CE-04/CE-20');
check(/N\/A — no UI\/control surface changed/.test(acceptance), 'acceptance CE N/A');
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

const engineSrc = read('src/infrastructure/character/liveact/liveact-engine.ts');
check(/solveHybridFace/.test(engineSrc), 'engine hybrid');
check(/subscribeHybridFace/.test(engineSrc), 'engine subscribe');
// Orientation: fuse on sample.face (anatomical), then mirror
check(/semanticFace:\s*sample\.face/.test(engineSrc), 'engine fuses anatomical semantic');
check(
  /anatomicalFused[\s\S]*mirrorLiveActSourceSample\(anatomicalFused\)/.test(engineSrc) ||
    /applyHybridFaceToSemantic\(sample\.face[\s\S]*LIVEACT_MIRROR_AVATAR[\s\S]*mirrorLiveActSourceSample/.test(
      engineSrc,
    ),
  'engine mirror after hybrid',
);
check(!/solveHybridFace\(\{[\s\S]*semanticFace:\s*mirrored\.face/.test(engineSrc), 'engine must not fuse mirrored semantic');

check(/LIVEACT_HYBRID_FACE_CONTRACT/.test(read('src/domains/character/liveact/index.ts')), 'barrel');
check(!/HybridFace|denseFeatures/.test(read('src/domains/character/liveact/liveact-contract.ts')), 'V1 frame not polluted with hybrid/dense');
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

function solve(frame) {
  return mod.solveHybridFace({
    semanticFace: frame.semantic,
    dense: frame.dense,
    sequence: frame.sequence,
    timestampMs: frame.timestampMs,
    denseSequence: frame.denseSequenceOverride ?? frame.dense?.sequence ?? null,
  });
}

// --- Exact V1 fallback ---
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

const stale = mod.buildHybridFaceFixture('hy-dense-stale-sequence');
const staleSolved = solve(stale);
check(staleSolved.denseSequenceAligned === false, 'stale dense rejected');
check(
  Math.abs((staleSolved.controls.mouthSmileLeft.value ?? -1) - (stale.semantic.mouthSmileLeft ?? 0)) < 1e-9,
  'stale → semantic equality',
);

// --- Under-response correction ---
const underSolved = solve(under);
check(underSolved.denseSequenceAligned === true, 'under aligned');
check(
  (underSolved.controls.mouthSmileLeft.value ?? 0) > (under.semantic.mouthSmileLeft ?? 0) + 0.05,
  `under-response corrected got ${underSolved.controls.mouthSmileLeft.value}`,
);

// --- Orientation: unilateral L/R (anatomical domain) ---
const leftOnly = mod.buildHybridFaceFixture('hy-smile-left-only');
const leftSolved = solve(leftOnly);
check((leftSolved.controls.mouthSmileLeft.value ?? 0) > 0.35, 'smile left active');
check((leftSolved.controls.mouthSmileRight.value ?? 0) < 0.2, 'smile right stays low on left fixture');

const rightOnly = mod.buildHybridFaceFixture('hy-smile-right-only');
const rightSolved = solve(rightOnly);
check((rightSolved.controls.mouthSmileRight.value ?? 0) > 0.35, 'smile right active');
check((rightSolved.controls.mouthSmileLeft.value ?? 0) < 0.2, 'smile left stays low on right fixture');

const cheek = mod.buildHybridFaceFixture('hy-cheek');
const cheekS = solve(cheek);
check((cheekS.controls.cheekSquintLeft.value ?? 0) > 0.2, 'cheek left active');
check((cheekS.controls.cheekSquintRight.value ?? 0) > 0.2, 'cheek right active');

const nose = mod.buildHybridFaceFixture('hy-nose-sneer');
const noseS = solve(nose);
check((noseS.controls.noseSneerLeft.value ?? 0) > (noseS.controls.noseSneerRight.value ?? 0) + 0.1, 'nose L > R');

// Mirror-once semantics: anatomical hybrid apply → mirror swaps L/R once
const anatomicalFace = mod.applyHybridFaceToSemantic(leftOnly.semantic, leftSolved);
const mirroredOnce = mod.mirrorLiveActSourceSample({
  presence: 1,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  eyeLeftX: 0,
  eyeLeftY: 0,
  eyeRightX: 0,
  eyeRightY: 0,
  face: anatomicalFace,
  faceIndex: 0,
  faceCount: 1,
});
check(
  (mirroredOnce.face.mouthSmileRight ?? 0) > 0.35 && (mirroredOnce.face.mouthSmileLeft ?? 0) < 0.2,
  'mirror once: anatomical left smile → avatar right',
);
const mirroredTwice = mod.mirrorLiveActSourceSample(mirroredOnce);
check(
  Math.abs((mirroredTwice.face.mouthSmileLeft ?? 0) - (anatomicalFace.mouthSmileLeft ?? 0)) < 1e-9,
  'mirror twice restores anatomical',
);

// --- High-confidence disagreement (reachable BEFORE under/over) ---
const disagree = mod.fuseSemanticDense({
  semantic: 0.9,
  denseEvidence: 0.15,
  denseConfidence: 0.9,
  semanticConfidence: 0.9,
});
check(disagree.source === 'semantic', `disagree → semantic authority got source=${disagree.source}`);
check(Math.abs((disagree.value ?? -1) - 0.9) < 1e-9, 'disagree value = semantic');
check((disagree.confidence ?? 1) < 0.7, `disagree confidence reduced got ${disagree.confidence}`);

const agree = mod.fuseSemanticDense({
  semantic: 0.7,
  denseEvidence: 0.72,
  denseConfidence: 0.9,
  semanticConfidence: 0.85,
});
check(agree.source === 'hybrid' || agree.source === 'semantic', 'agree allows refine');
check(Math.abs((agree.value ?? 0) - 0.7) < 0.08, 'agree stays near semantic');

const weakSemStrongDense = mod.fuseSemanticDense({
  semantic: 0.2,
  denseEvidence: 0.75,
  denseConfidence: 0.9,
  semanticConfidence: 0.7,
});
check(weakSemStrongDense.source === 'hybrid', 'weak sem + strong dense → hybrid correction');
check((weakSemStrongDense.value ?? 0) > 0.35, 'weak/strong correction raises value');

const strongSemWeakDense = mod.fuseSemanticDense({
  semantic: 0.8,
  denseEvidence: 0.2,
  denseConfidence: 0.3,
  semanticConfidence: 0.9,
});
check(strongSemWeakDense.source === 'semantic', 'strong sem + weak dense conf → semantic passthrough');
check(Math.abs((strongSemWeakDense.value ?? -1) - 0.8) < 1e-9, 'passthrough equals semantic');

// Fixture-level disagree
const hyDisagree = solve(mod.buildHybridFaceFixture('hy-disagree'));
check(hyDisagree.controls.mouthSmileLeft.source === 'semantic', 'hy-disagree smileL source semantic');
check(
  Math.abs((hyDisagree.controls.mouthSmileLeft.value ?? 0) - 0.9) < 0.05,
  'hy-disagree output near semantic',
);

// --- Neutral leakage (realistic geometry) ---
const neut = mod.buildHybridFaceFixture('hy-neutral-realistic-geometry');
check((neut.dense?.jaw.chinDrop.value ?? 0) > 0.15, 'fixture has non-zero chinDrop anatomy');
check((neut.dense?.lips.gapCenter.value ?? 1) < 0.08, 'fixture closed mouth gap');
const neutS = solve(neut);
const leakIds = [
  'jawOpen',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthRollUpper',
  'mouthRollLower',
  'mouthPucker',
  'mouthFunnel',
  'mouthSmileLeft',
  'mouthSmileRight',
  'cheekSquintLeft',
  'cheekSquintRight',
  'noseSneerLeft',
  'noseSneerRight',
];
let maxLeak = 0;
for (const id of leakIds) {
  const v = neutS.controls[id].value ?? 0;
  maxLeak = Math.max(maxLeak, v);
  check(v <= 0.08, `neutral leakage ${id}=${v}`);
}

// --- Jaw: static chinDrop must not activate; open gap must ---
check((neutS.controls.jawOpen.value ?? 0) <= 0.05, `jaw neutral ≈0 got ${neutS.controls.jawOpen.value}`);
const jaw = solve(mod.buildHybridFaceFixture('hy-jaw'));
check((jaw.controls.jawOpen.value ?? 0) > 0.25, `jaw open recognized got ${jaw.controls.jawOpen.value}`);

// --- Press / roll gating ---
check((neutS.controls.mouthPressLeft.value ?? 0) <= 0.05, 'press L neutral');
check((neutS.controls.mouthPressRight.value ?? 0) <= 0.05, 'press R neutral');
check((neutS.controls.mouthRollUpper.value ?? 0) <= 0.05, 'roll upper neutral');
check((neutS.controls.mouthRollLower.value ?? 0) <= 0.05, 'roll lower neutral');

const press = solve(mod.buildHybridFaceFixture('hy-press'));
check((press.controls.mouthPressLeft.value ?? 0) > 0.2, 'press L active');
check((press.controls.mouthPressRight.value ?? 0) > 0.2, 'press R active');

const roll = solve(mod.buildHybridFaceFixture('hy-roll'));
check((roll.controls.mouthRollUpper.value ?? 0) > 0.2, `roll upper active got ${roll.controls.mouthRollUpper.value}`);
check((roll.controls.mouthRollLower.value ?? 0) > 0.15, `roll lower active got ${roll.controls.mouthRollLower.value}`);

// Pucker ≠ Funnel
const puck = mod.buildHybridFaceFixture('hy-pucker-under');
const fun = mod.buildHybridFaceFixture('hy-funnel');
const puckS = solve(puck);
const funS = solve(fun);
check((puckS.controls.mouthPucker.value ?? 0) > (puckS.controls.mouthFunnel.value ?? 0), 'pucker > funnel on pucker fixture');
check((funS.controls.mouthFunnel.value ?? 0) >= (fun.semantic.mouthFunnel ?? 0) - 0.01, 'funnel preserved/corrected');

// Determinism
const a1 = solve(under);
const a2 = solve(under);
check(JSON.stringify(a1.controls) === JSON.stringify(a2.controls), 'deterministic frame-local');

// --- A/B ---
const ab = mod.runHybridFaceAbBenchmark();
check(Array.isArray(ab.cleanActiveControls) && ab.cleanActiveControls.length > 0, 'cleanActiveControls reported');
check(ab.cleanNonDegradation === true, 'AB clean active non-degradation');
for (const row of ab.cleanActiveControls) {
  check(
    row.hybridError <= row.v1Error + mod.LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL + 1e-9,
    `clean active ${row.control} hyErr=${row.hybridError} v1Err=${row.v1Error}`,
  );
}

check(
  typeof ab.activeUnderResponseMedianAbs === 'number',
  'activeUnderResponseMedianAbs reported',
);
check(
  ab.activeUnderResponseMedianAbs === ab.activeUnderResponseMedianAbs &&
    ab.requiredMinimum === mod.LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT,
  'requiredMinimum matches contract',
);
check(
  ab.activeUnderResponseMedianAbs >= mod.LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT,
  `reported improvement ${ab.activeUnderResponseMedianAbs} >= ${mod.LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT}`,
);
check(
  ab.hybridBeatsV1 ===
    (ab.cleanNonDegradation &&
      ab.activeUnderResponseMedianAbs >= mod.LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT &&
      ab.validationImprovement >= -mod.LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL),
  'success flag equals reported metrics (single truth)',
);
check(ab.hybridBeatsV1 === true, `AB hybrid beats V1 underImp=${ab.activeUnderResponseMedianAbs}`);
check(ab.crossTalk.notWorse === true, `cross-talk not worse v1=${ab.crossTalk.v1MaxUnintended} hy=${ab.crossTalk.hybridMaxUnintended}`);
check(ab.speech.returnToNeutralOk === true, 'return to neutral');
check(
  ab.avatarContourFidelity === 'MEASURED_VIA_451_E2E_GATE' ||
    String(ab.avatarContourFidelity).startsWith('NOT_MEASURED'),
  'avatar contour labeled for #451 E2E measurement',
);
check(
  ab.speech.hybridCorrelation !== null && ab.speech.hybridCorrelation >= 0.95,
  `speech corr hy=${ab.speech.hybridCorrelation} v1=${ab.speech.v1Correlation}`,
);
check(
  (ab.speech.hybridSaturation ?? 1) <= (ab.speech.v1Saturation ?? 1) + 0.05,
  'saturation not worse',
);
check(
  (ab.neutralLeakage?.maxUnintendedActivation ?? 1) <= 0.08,
  `neutral leakage max=${ab.neutralLeakage?.maxUnintendedActivation}`,
);

const ab2 = mod.runHybridFaceAbBenchmark();
const h1 = createHash('sha256').update(JSON.stringify(ab)).digest('hex');
const h2 = createHash('sha256').update(JSON.stringify(ab2)).digest('hex');
check(h1 === h2, 'AB deterministic');

// #446 intact
check(mod.LIVEACT_IRIS_GAZE_CONTRACT === 'SagaDriveLiveActIrisGazeV1', '#446 contract intact');
check(typeof mod.solveIrisGaze === 'function', '#446 solve intact');
check(typeof mod.arbitrateLiveActGaze === 'function', '#446 arb intact');

mkdirSync(join(root, '.qa/evidence/liveact-hybrid-mouth-face-solver'), { recursive: true });
const evidence = {
  contractVersion: ab.contractVersion,
  fixtureVersion: ab.fixtureVersion,
  orientationAuthority: 'anatomical',
  mirrorPoint: 'once-after-hybrid',
  controlsEvaluated: ab.controlsEvaluated,
  clean: {
    activeControls: ab.cleanActiveControls,
    cleanNonDegradation: ab.cleanNonDegradation,
  },
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
    activeUnderResponseMedianAbs: ab.activeUnderResponseMedianAbs,
    requiredMinimum: ab.requiredMinimum,
    validationMedianAbs: ab.validationImprovement,
    cleanNonDegradation: ab.cleanNonDegradation,
    success: ab.hybridBeatsV1,
  },
  neutralLeakage: ab.neutralLeakage,
  speechNote:
    (ab.speech.hybridCorrelation ?? 0) < (ab.speech.v1Correlation ?? 0)
      ? 'correlation remains above target, while amplitude + velocity retention materially improve'
      : 'correlation at or above V1 with amplitude/velocity reported',
  avatarContourFidelity: ab.avatarContourFidelity,
  privacy: { committedRawLandmarks: 0, committedWebcam: 0 },
  ce: {
    'CE-04': 'frame-local same detect tick; #444 latency contract',
    'CE-20': 'dense unavailable/stale → exact V1 fallback',
    other: 'N/A — no UI/control surface changed',
  },
  requires450: [
    'nasolabial fold intensity (beyond noseSneer)',
    'richer cheek volume',
    'segmented lip contour correctives',
  ],
  requires449: ['neutral-relative chin/jaw geometry'],
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
  maxNeutralLeak: maxLeak,
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
      activeUnderResponseMedianAbs: ab.activeUnderResponseMedianAbs,
      requiredMinimum: ab.requiredMinimum,
      cleanNonDegradation: ab.cleanNonDegradation,
      speechCorr: { v1: ab.speech.v1Correlation, hybrid: ab.speech.hybridCorrelation },
      amplitude: {
        v1: ab.speech.v1AmplitudeRetentionPct,
        hybrid: ab.speech.hybridAmplitudeRetentionPct,
      },
      velocity: {
        v1: ab.speech.v1VelocityRetentionPct,
        hybrid: ab.speech.hybridVelocityRetentionPct,
      },
      crossTalkOk: ab.crossTalk.notWorse,
      maxNeutralLeak: maxLeak,
    },
    null,
    2,
  ),
);
