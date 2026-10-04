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
const { profile, v1Set } = mod.buildPersonalCalibrationActorSession();
const bad = {
  ...profile,
  solverFingerprint: { ...profile.solverFingerprint, temporalPolicy: 'tampered' },
};
check(mod.resolveLiveActPersonalProfileStatus(bad) === 'needsRecalibration', 'fingerprint invalidate');
check(typeof profile.ownerLocalId === 'string' && profile.ownerLocalId.length > 0, 'profile has owner');
check(typeof profile.characterLocalId === 'string' && profile.characterLocalId.length > 0, 'profile has character');

// Skip semantics
const session = mod.createLiveActPersonalCalibrationSessionV2({
  ownerLocalId: 'skip-owner',
  characterLocalId: 'skip-test',
});
session.phaseIndex = 2; // eyesBrows
check(mod.skipLiveActPersonalCalibrationPhase(session) === true, 'skip eyesBrows');
check(session.skippedPhaseIds.includes('eyesBrows'), 'skipped recorded');

// --- Scope isolation (behavioral) ---
check(mod.isLiveActPersonalCalibrationScopeComplete(null) === false, 'null scope incomplete');
check(
  mod.isLiveActPersonalCalibrationScopeComplete({
    ownerLocalId: 'o',
    characterLocalId: 'draft',
  }) === false,
  'draft not persistable',
);
const scopeA1 = { ownerLocalId: 'owner-a', characterLocalId: 'char-1' };
const scopeA2 = { ownerLocalId: 'owner-a', characterLocalId: 'char-2' };
const scopeB1 = { ownerLocalId: 'owner-b', characterLocalId: 'char-1' };
const keyA1 = mod.liveActPersonalCalibrationStorageKey(scopeA1);
const keyA2 = mod.liveActPersonalCalibrationStorageKey(scopeA2);
const keyB1 = mod.liveActPersonalCalibrationStorageKey(scopeB1);
check(keyA1 !== keyA2, 'character isolation keys');
check(keyA1 !== keyB1, 'owner isolation keys');
check(!keyA1.includes('_default'), 'no default in key');
check(!/:_default$|_default:/.test(keyA1), 'no default segment');

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(String(k), String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    get _size() {
      return map.size;
    },
    _has(k) {
      return map.has(k);
    },
  };
}

const mem = createMemoryStorage();
globalThis.localStorage = mem;
const profileA1 = { ...profile, ownerLocalId: 'owner-a', characterLocalId: 'char-1' };
const profileA2 = {
  ...profile,
  ownerLocalId: 'owner-a',
  characterLocalId: 'char-2',
  createdAtLocalMs: profile.createdAtLocalMs + 1,
};
const profileB1 = {
  ...profile,
  ownerLocalId: 'owner-b',
  characterLocalId: 'char-1',
  createdAtLocalMs: profile.createdAtLocalMs + 2,
};
check(mod.saveLiveActPersonalCalibrationProfile(profileA1) === true, 'save A1');
check(mod.saveLiveActPersonalCalibrationProfile(profileA2) === true, 'save A2');
check(mod.saveLiveActPersonalCalibrationProfile(profileB1) === true, 'save B1');
const loadA1 = mod.loadLiveActPersonalCalibrationProfile(scopeA1);
const loadA2 = mod.loadLiveActPersonalCalibrationProfile(scopeA2);
const loadB1 = mod.loadLiveActPersonalCalibrationProfile(scopeB1);
check(loadA1.profile?.characterLocalId === 'char-1', 'load A1 character');
check(loadA2.profile?.characterLocalId === 'char-2', 'load A2 character');
check(loadB1.profile?.ownerLocalId === 'owner-b', 'load B1 owner');
check(loadA1.profile?.createdAtLocalMs !== loadA2.profile?.createdAtLocalMs, 'A1 ≠ A2');
check(loadA1.profile?.createdAtLocalMs !== loadB1.profile?.createdAtLocalMs, 'A1 ≠ B1');
check(mod.loadLiveActPersonalCalibrationProfile(null).status === 'missing', 'no-scope no load');
check(
  mod.loadLiveActPersonalCalibrationProfile({
    ownerLocalId: '',
    characterLocalId: 'char-1',
  }).status === 'missing',
  'missing owner no load',
);
const incompleteSave = mod.saveLiveActPersonalCalibrationProfile({
  ...profile,
  ownerLocalId: '',
  characterLocalId: 'char-1',
});
check(incompleteSave === false, 'incomplete scope no persist');
check(!String(keyA1).includes('undefined'), 'key defined');

// Persistence failure → false (session-only path)
const throwingLs = {
  getItem: () => null,
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {},
};
globalThis.localStorage = throwingLs;
check(mod.saveLiveActPersonalCalibrationProfile(profileA1) === false, 'setItem throw → false');
globalThis.localStorage = null;
check(mod.saveLiveActPersonalCalibrationProfile(profileA1) === false, 'unavailable → false');
globalThis.localStorage = createMemoryStorage();
check(mod.loadLiveActPersonalCalibrationProfile(scopeA1).status === 'missing', 'reload after failed save absent');

// --- Valid capture time gating ---
function probeSample(presence = 1) {
  const s = mod.createEmptyLiveActSourceSample();
  s.faceIndex = 0;
  s.presence = presence;
  s.headYaw = 0.01;
  s.headPitch = 0;
  s.headRoll = 0;
  s.eyeLeftX = 0;
  s.eyeLeftY = 0;
  s.eyeRightX = 0;
  s.eyeRightY = 0;
  return s;
}

const capSession = mod.createLiveActPersonalCalibrationSessionV2(scopeA1);
const phase0 = mod.LIVEACT_PERSONAL_CALIBRATION_PHASES[0];
const dt = 33;
let t = 1000;
for (let i = 0; i < 20; i += 1) {
  t += dt;
  check(
    mod.pushLiveActPersonalCalibrationSample(capSession, probeSample(1), {
      headPoseSupported: true,
      nowMs: t,
    }) === true,
    'valid push',
  );
}
const captureAfterBurst = capSession.validCaptureMs;
check(captureAfterBurst > 0 && captureAfterBurst < 20 * dt + 1, 'capture ~burst');
const beforeGap = capSession.validCaptureMs;
t += 5000; // tracking lost 5s
check(
  mod.pushLiveActPersonalCalibrationSample(capSession, probeSample(1), {
    headPoseSupported: true,
    nowMs: t,
  }) === true,
  'recover push',
);
check(capSession.validCaptureMs - beforeGap <= mod.LIVEACT_PERSONAL_MAX_SAMPLE_GAP_MS, 'lost 5s not added');

// 90% lost + one recovered frame cannot complete phase
const wallSession = mod.createLiveActPersonalCalibrationSessionV2(scopeA1);
wallSession.phaseStartedAtMs = 0;
const fakeNow = phase0.durationMs + 10_000;
check(
  mod.isLiveActPersonalCalibrationPhaseComplete(wallSession, fakeNow) === false,
  'wall clock alone incomplete',
);
mod.pushLiveActPersonalCalibrationSample(wallSession, probeSample(1), {
  headPoseSupported: true,
  nowMs: 1,
});
check(
  mod.isLiveActPersonalCalibrationPhaseComplete(wallSession, phase0.durationMs + 50_000) === false,
  'one frame cannot finish phase',
);

// Full valid phase completes at ~duration via capture clock
const fullPhase = mod.createLiveActPersonalCalibrationSessionV2(scopeA1);
let ft = 0;
const framesNeeded = Math.ceil(phase0.durationMs / dt) + 5;
for (let i = 0; i < framesNeeded; i += 1) {
  ft += dt;
  mod.pushLiveActPersonalCalibrationSample(fullPhase, probeSample(1), {
    headPoseSupported: true,
    nowMs: ft,
  });
}
check(mod.isLiveActPersonalCalibrationPhaseComplete(fullPhase, ft) === true, 'full valid phase complete');
check(
  mod.liveActPersonalCalibrationPhaseRemainingSec(fullPhase) === 0,
  'countdown reaches 0 on complete',
);

// Every phase only one valid frame → cannot finalize valid
const sparse = mod.createLiveActPersonalCalibrationSessionV2(scopeA1);
for (let p = 0; p < mod.LIVEACT_PERSONAL_CALIBRATION_PHASES.length; p += 1) {
  sparse.phaseIndex = p;
  sparse.validFrameCount = 0;
  sparse.validCaptureMs = 0;
  sparse.lastValidSampleTimestamp = 0;
  mod.pushLiveActPersonalCalibrationSample(sparse, probeSample(1), {
    headPoseSupported: true,
    nowMs: (p + 1) * 1000,
  });
  if (p < mod.LIVEACT_PERSONAL_CALIBRATION_PHASES.length - 1) {
    // Force advance without meeting capture requirements (simulates bug path)
    sparse.phaseIndex += 1;
    sparse.validFrameCount = 0;
    sparse.validCaptureMs = 0;
    sparse.lastValidSampleTimestamp = 0;
  }
}
check(mod.hasLiveActPersonalCalibrationEnoughValidSamples(sparse) === false, 'sparse not enough');
const sparseProfile = mod.finalizeLiveActPersonalCalibrationProfile(sparse, 1);
check(sparseProfile.status !== 'valid', 'sparse profile not valid');

// --- Classic overrides Personal for session (apply stage) ---
const mapped = mod.createNeutralLiveActFrame(0);
mapped.trackingLost = false;
mapped.face = { ...mapped.face, mouthSmileLeft: 0.8, mouthSmileRight: 0.3 };
const withPersonal = mod.stepLiveActCalibratedFrame(null, mapped, v1Set, undefined, 'v1-fixed', profile);
const classicOnly = mod.stepLiveActCalibratedFrame(null, mapped, v1Set, undefined, 'v1-fixed', null);
check(classicOnly.calibrated != null && withPersonal.calibrated != null, 'both apply paths produce frames');
const personalWins =
  Math.abs(withPersonal.calibrated.face.mouthSmileLeft - classicOnly.calibrated.face.mouthSmileLeft) > 1e-6 ||
  Math.abs(withPersonal.calibrated.face.mouthSmileRight - classicOnly.calibrated.face.mouthSmileRight) > 1e-6;
check(personalWins, 'personal profile changes apply vs classic-null override');
// Stored premium still exists after classic session override simulation
globalThis.localStorage = createMemoryStorage();
check(mod.saveLiveActPersonalCalibrationProfile(profileA1) === true, 'premium still savable');
check(mod.loadLiveActPersonalCalibrationProfile(scopeA1).status === 'valid', 'premium still loadable');

// Engine classic clears personalProfile (source contract)
check(/this\.personalProfile = null/.test(engine), 'classic/session clears personalProfile');
check(/setPersonalCalibrationScope/.test(engine), 'engine scope API');
check(/Gesicht nicht erkannt — Kalibrierung pausiert/.test(engine), 'lost tracking copy');
check(/lokales Speichern nicht verfügbar/.test(engine), 'session-only copy');
check(/persisted/.test(engine), 'persisted result field');

// UI touch targets + wiring
const settingsUi = read('src/app/character/avatar/AvatarPreviewSettings.tsx');
check(/min-h-11[\s\S]*?liveact-calibrate-personal-v2/.test(settingsUi), 'premium min-h-11');
check(/min-h-11[\s\S]*?liveact-personal-calib-skip/.test(settingsUi), 'skip min-h-11');
check(/setPersonalCalibrationScope/.test(read('src/app/character/liveact/useLiveActViewport.ts')), 'viewport scope wire');
check(/getAuthenticatedUserId/.test(read('src/app/character/avatar/AvatarSurfaceViewer.tsx')), 'owner from auth');
check(/personalCalibrationCharacterLocalId:\s*surfaceRef\.characterId/.test(read('src/app/character/avatar/AvatarSurfaceViewer.tsx')), 'character from surfaceRef');

// AU acceptance references
check(/AU-01/.test(acceptance) && /AU-02/.test(acceptance) && /AU-15/.test(acceptance), 'AU gates');
check(/AU-03[\s\S]*N\/A/.test(acceptance), 'AU-03 N/A documented');
check(/owner \+ character|owner\+character|ownerLocalId/.test(acceptance), 'acceptance scope');
check(/valid capture/i.test(acceptance), 'acceptance capture validity');
check(/session-only|Sitzung/.test(acceptance), 'acceptance persistence degraded');
check(/Classic|Klassisch/.test(acceptance), 'acceptance classic override');
check(/ownerLocalId/.test(design) && /validCaptureMs|valid capture/i.test(design), 'design scope+capture');

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
