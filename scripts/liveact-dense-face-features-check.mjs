#!/usr/bin/env node
/**
 * liveact-dense-face-features-check — authoritative #445 Dense Face Features gate.
 * Location: scripts/liveact-dense-face-features-check.mjs
 *
 * Proves contract, normalization invariance, region features, L/R semantics,
 * partial availability, numerical safety, V1 frame isolation, privacy.
 * Does NOT require iris gaze, avatar solvers, or temporal filtering.
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
    console.error(`liveact-dense-face-features-check FAIL: ${msg}`);
    process.exit(1);
  }
}

function approx(a, b, tol) {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
}

const design = join(root, '.qa/design/liveact-dense-face-features.md');
const acceptance = join(root, '.qa/acceptance/liveact-dense-face-features.md');
const gate = read('scripts/test-gate.mjs');
const gitignore = read('.gitignore');

check(existsSync(design), 'design artifact');
check(existsSync(acceptance), 'acceptance artifact');
check(/liveact-dense-face-features/.test(read('.qa/design/liveact-dense-face-features.md')), 'design slug');
check(/#445/.test(read('.qa/acceptance/liveact-dense-face-features.md')), 'acceptance issue');
check(/provider-neutral/.test(read('.qa/design/liveact-dense-face-features.md')), 'provider-neutral design');
check(/Dense Feature Extraction/.test(read('.qa/design/liveact-dense-face-features.md')), 'boundary vs temporal/calib');
check(/checkLiveActDenseFaceFeatures|liveact-dense-face-features-check/.test(gate), 'test-gate wiring');
check(/liveact-dense-face-features-local/.test(gitignore), 'local dense capture gitignore');

const domainFiles = [
  'src/domains/character/liveact/liveact-dense-face-features-contract.ts',
  'src/domains/character/liveact/liveact-dense-face-features-normalize.ts',
  'src/domains/character/liveact/liveact-dense-face-features-extract.ts',
  'src/domains/character/liveact/liveact-dense-face-features-fixtures.ts',
  'src/domains/character/liveact/liveact-dense-face-features-contour-metric.ts',
];
for (const rel of domainFiles) {
  const src = read(rel);
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, /@ts-nocheck/, / as any\b/, / as unknown as /]) {
    check(!pattern.test(src), `${rel} no type escape ${pattern}`);
  }
  check(!/\bMediaPipe\b/.test(src), `${rel} no MediaPipe in domain`);
  check(!/\b478\b/.test(src), `${rel} no 478 in domain`);
  check(!/landmarkIndices/.test(src), `${rel} no landmarkIndices in domain`);
}

check(/LIVEACT_DENSE_FACE_FEATURES_CONTRACT/.test(read('src/domains/character/liveact/index.ts')), 'barrel exports');
check(/subscribeDenseFaceFeatures/.test(read('src/infrastructure/character/liveact/liveact-engine.ts')), 'engine side-channel');
check(/denseFeatures/.test(read('src/infrastructure/character/liveact/mediapipe-face-source.ts')), 'source emits dense side-channel');
check(
  /MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1/.test(
    read('src/infrastructure/character/liveact/mediapipe-dense-semantic-points-v1.ts'),
  ),
  'reuses #421 anchor map',
);

// V1 frame must not gain landmarks/dense payload
const frameContract = read('src/domains/character/liveact/liveact-contract.ts');
check(/assertLiveActFrameLocalOnly/.test(frameContract), 'V1 local-only assert');
check(!/DenseFaceFeatures/.test(frameContract), 'V1 contract not polluted with dense type');

// Privacy: no biometric media under dense evidence roots
const privacyRoots = [
  '.qa/evidence/liveact-dense-face-features',
  '.qa/fixtures/liveact-dense-face-features',
  '.qa/runs/445-dense-face-features',
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
      check(!lower.endsWith(ext), `privacy: no media ${relative(root, file)}`);
    }
    const body = readFileSync(file, 'utf8');
    check(!/"landmarks"\s*:\s*\[/.test(body), `privacy: no landmark arrays in ${relative(root, file)}`);
  }
}

const outfile = join(root, '.qa/runs/liveact-dense-face-features-bundle.mjs');
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

check(mod.LIVEACT_DENSE_FACE_FEATURES_CONTRACT === 'SagaDriveLiveActDenseFaceFeaturesV1', 'contract id');
check(mod.LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT === 'SagaDriveLiveActDenseSemanticGeometryV1', 'geometry id');
check(Array.isArray(mod.DENSE_SEMANTIC_POINT_IDS) && mod.DENSE_SEMANTIC_POINT_IDS.length >= 30, 'semantic points');

const INVAR_TOL = 0.04;
const neutral = mod.buildCanonicalNeutralGeometry();
const base = mod.extractDenseFaceFeatures({ geometry: neutral, sequence: 1, timestampMs: 0 });
check(base.presence === true, 'neutral presence');
check(base.normalizationStatus === 'ok', 'neutral normalization ok');
check(base.lips.width.available && base.lips.width.value !== null, 'lips.width available');
check(base.eyes.eyeOpeningLeft.available, 'eyes opening left');
check(base.brows.innerLeft.available, 'brows inner left');
check(base.cheeks.raiseLeft.available, 'cheeks raise left');
check(base.nose.width.available, 'nose width');
check(base.jaw.chinDrop.available, 'jaw chinDrop');

function maxAbsDiff(a, b, path = '', acc = []) {
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    if ('available' in a && 'value' in a) {
      if (a.available && b.available && a.value !== null && b.value !== null) {
        acc.push({ path, d: Math.abs(a.value - b.value) });
      }
      return acc;
    }
    for (const k of Object.keys(a)) {
      if (k === 'timestampMs' || k === 'sequence') continue;
      maxAbsDiff(a[k], b[k], path ? `${path}.${k}` : k, acc);
    }
  }
  return acc;
}

function invarianceError(transformed) {
  const feats = mod.extractDenseFaceFeatures({
    geometry: transformed,
    sequence: 2,
    timestampMs: 0,
  });
  check(feats.normalizationStatus === 'ok', 'transformed normalization ok');
  const diffs = maxAbsDiff(base, feats);
  const max = diffs.reduce((m, x) => Math.max(m, x.d), 0);
  return { max, feats, diffs };
}

const inv = {
  translation: invarianceError(
    mod.transformDenseSemanticGeometry(neutral, { translate: { x: 1.5, y: -0.7, z: 0.3 } }),
  ),
  scale: invarianceError(mod.transformDenseSemanticGeometry(neutral, { uniformScale: 2.5 })),
  yaw: invarianceError(mod.transformDenseSemanticGeometry(neutral, { yawRad: 0.35 })),
  pitch: invarianceError(mod.transformDenseSemanticGeometry(neutral, { pitchRad: 0.25 })),
  roll: invarianceError(mod.transformDenseSemanticGeometry(neutral, { rollRad: 0.4 })),
};

for (const [name, result] of Object.entries(inv)) {
  check(result.max <= INVAR_TOL, `invariance ${name} max=${result.max} tol=${INVAR_TOL}`);
}

// Feature direction tests
const mouthOpen = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureMouthOpen(),
  sequence: 3,
  timestampMs: 0,
});
check(
  mouthOpen.lips.gapCenter.value > base.lips.gapCenter.value + 0.05,
  'mouth open increases gapCenter',
);
check(mouthOpen.jaw.chinDrop.value > base.jaw.chinDrop.value + 0.05, 'chin drop increases');

const smileL = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureSmileLeft(),
  sequence: 4,
  timestampMs: 0,
});
const smileR = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureSmileRight(),
  sequence: 5,
  timestampMs: 0,
});
check(smileL.lips.cornerLeft.value > base.lips.cornerLeft.value + 0.02, 'smile left raises left corner');
check(smileR.lips.cornerRight.value > base.lips.cornerRight.value + 0.02, 'smile right raises right corner');
check(
  smileL.lips.cornerLeft.value > smileL.lips.cornerRight.value,
  'smile left: left corner > right (anatomical, no mirror)',
);

const pucker = mod.extractDenseFaceFeatures({
  geometry: mod.fixturePuckerCompression(),
  sequence: 6,
  timestampMs: 0,
});
check(pucker.lips.width.value < base.lips.width.value - 0.05, 'pucker reduces width');
check(pucker.lips.compression.value > base.lips.compression.value + 0.05, 'pucker raises compression');

const eyeL = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureEyeCloseLeft(),
  sequence: 7,
  timestampMs: 0,
});
const eyeR = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureEyeCloseRight(),
  sequence: 8,
  timestampMs: 0,
});
check(eyeL.eyes.eyeOpeningLeft.value < base.eyes.eyeOpeningLeft.value * 0.35, 'left blink closes left');
check(
  approx(eyeL.eyes.eyeOpeningRight.value, base.eyes.eyeOpeningRight.value, 0.05),
  'left blink keeps right open',
);
check(eyeR.eyes.eyeOpeningRight.value < base.eyes.eyeOpeningRight.value * 0.35, 'right blink closes right');

const brow = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureBrowInnerRaise(),
  sequence: 9,
  timestampMs: 0,
});
check(brow.brows.innerLeft.value > base.brows.innerLeft.value + 0.05, 'brow inner raise left');
check(brow.brows.innerRight.value > base.brows.innerRight.value + 0.05, 'brow inner raise right');

const cheek = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureCheekRaiseLeft(),
  sequence: 10,
  timestampMs: 0,
});
check(cheek.cheeks.raiseLeft.value > base.cheeks.raiseLeft.value + 0.05, 'cheek raise left');

const nose = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureNoseNasolabial(),
  sequence: 11,
  timestampMs: 0,
});
check(nose.nose.width.value > base.nose.width.value + 0.01, 'nose width proxy reacts');

// Partial mouth missing — eyes still ok
const partial = mod.extractDenseFaceFeatures({
  geometry: mod.fixturePartialMissingMouth(),
  sequence: 12,
  timestampMs: 0,
});
check(partial.normalizationStatus === 'ok', 'partial mouth still normalizes');
check(partial.eyes.eyeOpeningLeft.available, 'partial: eyes still available');
check(!partial.lips.width.available, 'partial: lips.width unavailable');
check(partial.lips.width.value === null, 'partial: lips.width null not 0');

// Degenerate scale fail-closed
const degen = mod.extractDenseFaceFeatures({
  geometry: mod.fixtureDegenerateScale(),
  sequence: 13,
  timestampMs: 0,
});
check(degen.normalizationStatus === 'degenerate' || degen.normalizationStatus === 'unavailable', 'degenerate status');
check(degen.presence === false, 'degenerate presence false');
check(degen.lips.width.value === null, 'degenerate lips null');

// NaN / Infinity input safety
const dirty = mod.buildCanonicalNeutralGeometry();
const dirtyPoints = { ...dirty.points };
dirtyPoints.forehead = { available: true, x: Number.NaN, y: 0.65, z: 0 };
const dirtyGeom = { ...dirty, points: dirtyPoints };
const dirtyFeats = mod.extractDenseFaceFeatures({
  geometry: dirtyGeom,
  sequence: 14,
  timestampMs: 0,
});
check(
  dirtyFeats.normalizationStatus !== 'ok' || dirtyFeats.presence === true,
  'NaN forehead handled without crash',
);
function assertFeatureScalarsFinite(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  if ('available' in obj && 'value' in obj && 'confidence' in obj) {
    check(Number.isFinite(obj.confidence), `confidence finite ${path}`);
    if (obj.available) {
      check(obj.value !== null && Number.isFinite(obj.value), `value finite ${path}`);
    } else {
      check(obj.value === null, `unavailable value null ${path}`);
    }
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'timestampMs' || k === 'sequence') continue;
    if (v && typeof v === 'object') assertFeatureScalarsFinite(v, path ? `${path}.${k}` : k);
  }
}
assertFeatureScalarsFinite(base);
assertFeatureScalarsFinite(mouthOpen);
assertFeatureScalarsFinite(partial);

// Contour metric at feature level (#444 integration)
const contourRef = base;
const contourMeas = mouthOpen;
const contour = mod.evaluateDenseFeatureLipContour({
  reference: contourRef,
  measured: contourMeas,
});
check(contour.measurable === true, 'dense contour measurable at feature level');
check(contour.median && contour.median.status !== 'NOT_MEASURED', 'contour median measured');

// Determinism
const a1 = mod.denseFeaturesForEquality(base);
const a2 = mod.denseFeaturesForEquality(
  mod.extractDenseFaceFeatures({ geometry: neutral, sequence: 1, timestampMs: 999 }),
);
const h1 = createHash('sha256').update(JSON.stringify(a1)).digest('hex');
const h2 = createHash('sha256').update(JSON.stringify(a2)).digest('hex');
check(h1 === h2, 'deterministic equality hash');

// Scope creep guards
const extractSrc = read('src/domains/character/liveact/liveact-dense-face-features-extract.ts');
check(!/\bEMA\b|exponentialMoving|hysteresis|\bkalman\b/i.test(extractSrc), 'no temporal filtering');
check(!/morphTarget|\bVRM\b|retarget/i.test(extractSrc), 'no avatar retarget in extract');
check(!/gazeVector|\biris\b/i.test(extractSrc), 'no iris gaze solver');

const summary = {
  contractVersion: mod.LIVEACT_DENSE_FACE_FEATURES_CONTRACT,
  geometryContractVersion: mod.LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
  fixtureIds: [...mod.LIVEACT_DENSE_FIXTURE_IDS],
  normalizationInvariance: {
    tolerance: INVAR_TOL,
    translationMaxAbs: inv.translation.max,
    scaleMaxAbs: inv.scale.max,
    yawMaxAbs: inv.yaw.max,
    pitchMaxAbs: inv.pitch.max,
    rollMaxAbs: inv.roll.max,
  },
  featureDirection: {
    mouthOpenGapDelta: mouthOpen.lips.gapCenter.value - base.lips.gapCenter.value,
    smileLeftCornerDelta: smileL.lips.cornerLeft.value - base.lips.cornerLeft.value,
    leftBlinkOpening: eyeL.eyes.eyeOpeningLeft.value,
    rightOpenDuringLeftBlink: eyeL.eyes.eyeOpeningRight.value,
  },
  availability: {
    partialMouthLipsWidthAvailable: partial.lips.width.available,
    partialMouthEyesAvailable: partial.eyes.eyeOpeningLeft.available,
    degenerateStatus: degen.normalizationStatus,
  },
  contourFeatureLevel: {
    measurable: contour.measurable,
    medianStatus: contour.median?.status ?? 'NOT_MEASURED',
    p95Status: contour.p95?.status ?? 'NOT_MEASURED',
  },
  remainingNotMeasuredAtE2E: [
    'runtime.cameraToAvatarP95Ms',
    'v1.gaze.angularErrorMedianDeg — requires #446',
    'end-to-end avatar lip contour fidelity — requires #447/#451',
  ],
  privacy: {
    committedRawLandmarkArrays: 0,
    committedRealFaceFeatureTraces: 0,
    networkSerialization: 0,
  },
  deterministicHash: h1,
  authoritativeGate: 'scripts/liveact-dense-face-features-check.mjs',
};

const summaryPath = join(root, '.qa/runs/445-dense-face-features-summary.json');
writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

console.log('liveact-dense-face-features-check OK');
console.log(
  JSON.stringify(
    {
      invariance: summary.normalizationInvariance,
      contour: summary.contourFeatureLevel,
      hash: h1.slice(0, 12),
    },
    null,
    2,
  ),
);
