#!/usr/bin/env node
/**
 * sagadrive-performance-face-v2-check — authoritative #450 Performance Face gate.
 * Location: scripts/sagadrive-performance-face-v2-check.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`sagadrive-performance-face-v2-check FAIL: ${msg}`);
    process.exit(1);
  }
}

check(existsSync(join(root, '.qa/design/sagadrive-performance-face-v2.md')), 'design');
check(existsSync(join(root, '.qa/acceptance/sagadrive-performance-face-v2.md')), 'acceptance');
check(
  existsSync(join(root, 'docs/sagadrive-performance-face-authoring-v1.md')),
  'authoring doc',
);

const design = read('.qa/design/sagadrive-performance-face-v2.md');
const acceptance = read('.qa/acceptance/sagadrive-performance-face-v2.md');
const authoring = read('docs/sagadrive-performance-face-authoring-v1.md');
check(/SagaDrivePerformanceFaceV2/.test(design), 'design contract');
check(/Decision A/.test(design), 'compose decision');
check(/nasolabialFoldLeft/.test(design) && /lipContourUpperLeft/.test(design), 'required controls');
check(/CE-20/.test(acceptance), 'acceptance CE-20');
check(/Security Coverage/.test(acceptance), 'security coverage');
check(/sagadrive-performance-face-authoring-v1/.test(authoring), 'authoring spec id');
check(/Missing Premium never blocks import/.test(authoring), 'import degrade doc');
check(/sagadrive-performance-face-v2-check/.test(read('scripts/test-gate.mjs')), 'test-gate wiring');

const domainFiles = [
  'src/domains/character/liveact/liveact-performance-face-contract.ts',
  'src/domains/character/liveact/liveact-performance-face-aliases.ts',
  'src/domains/character/liveact/liveact-performance-face-validate.ts',
];
for (const rel of domainFiles) {
  check(existsSync(join(root, rel)), `exists ${rel}`);
  const src = read(rel);
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, /@ts-nocheck/, / as any\b/, / as unknown as /]) {
    check(!pattern.test(src), `${rel} no type escape`);
  }
  check(!/from ['"]three['"]/.test(src), `${rel} domain pure`);
  check(!/from ['"]@mediapipe/.test(src), `${rel} no mediapipe import`);
  check(!/\blocalStorage\b/.test(src), `${rel} no localStorage`);
  check(!/\bsupabase\b/i.test(src), `${rel} no supabase`);
  check(!/\bfetch\s*\(/.test(src), `${rel} no fetch`);
}

const barrel = read('src/domains/character/liveact/index.ts');
check(/SAGADRIVE_PERFORMANCE_FACE_CONTRACT/.test(barrel), 'barrel contract');
check(/validatePerformanceFaceV2/.test(barrel), 'barrel validate');
check(/composeLiveActWithPerformanceFace/.test(barrel), 'barrel compose');
check(/evaluatePerformanceFaceForImport/.test(barrel), 'barrel import eval');

const gltf = read('src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts');
const vrm = read('src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts');
const output = read('src/infrastructure/character/liveact/liveact-avatar-output.ts');
check(/getPerformanceFaceReport/.test(output), 'output port PerformanceFace');
check(/validatePerformanceFaceV2/.test(gltf) && /getPerformanceFaceReport/.test(gltf), 'gltf hook');
check(/validatePerformanceFaceV2/.test(vrm) && /getPerformanceFaceReport/.test(vrm), 'vrm hook');

const importFlow = read('src/domains/character/avatar/import-original-flow-v1.ts');
check(/evaluateImportOriginalPerformanceFace/.test(importFlow), 'import hook');
check(/evaluateImportOriginalPerformanceFace/.test(read('src/domains/character/avatar/index.ts')), 'avatar barrel');

const modular = read('src/domains/character/avatar/modular-glb-contract-v1.ts');
check(modular.length > 0, 'modular glb present (untouched by this gate content check)');

// --- behavioral bundle ---
const outfile = join(root, '.qa/tmp/performance-face-v2-bundle.mjs');
mkdirSync(join(root, '.qa/tmp'), { recursive: true });
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-performance-face-validate.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  logLevel: 'silent',
});

const mod = await import(outfile + `?t=${Date.now()}`);
const {
  validatePerformanceFaceV2,
  composeLiveActWithPerformanceFace,
  evaluatePerformanceFaceForImport,
  formatPerformanceFaceReportDe,
  applyPerformanceFaceWeights,
} = mod;

const contractOut = join(root, '.qa/tmp/performance-face-v2-contract-bundle.mjs');
await build({
  entryPoints: [
    join(root, 'src/domains/character/liveact/liveact-performance-face-contract.ts'),
  ],
  outfile: contractOut,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  logLevel: 'silent',
});
const {
  PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS,
  PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS,
  clampPerformanceFaceWeight,
  computeCorrectiveWeight,
  parsePerformanceFaceManifestV1,
  SAGADRIVE_PERFORMANCE_FACE_CONTRACT,
} = await import(contractOut + `?t=${Date.now()}`);

check(SAGADRIVE_PERFORMANCE_FACE_CONTRACT === 'SagaDrivePerformanceFaceV2', 'version string');
check(PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS.length === 8, '8 required premium');
check(PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS.length === 2, '2 optional premium');
check(clampPerformanceFaceWeight(1.5) === 1 && clampPerformanceFaceWeight(-1) === 0, 'clamp');
check(
  Math.abs(computeCorrectiveWeight([0.8, 0.4], 'min') - 0.4) < 1e-9,
  'corrective min',
);
check(
  Math.abs(computeCorrectiveWeight([0.5, 0.5], 'multiply') - 0.25) < 1e-9,
  'corrective multiply',
);

const coreArkit = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthPucker',
  'mouthShrugUpper',
  'mouthShrugLower',
];

function arkitOnlyInventory(extra = {}) {
  return {
    presentTargetNames: [...coreArkit],
    hasHumanoid: true,
    hasHead: true,
    gazeDrivePath: 'bones',
    arkitPresentChannels: [...coreArkit],
    ...extra,
  };
}

const arkitReport = validatePerformanceFaceV2(arkitOnlyInventory());
check(arkitReport.standardEligible === true, 'arkit standard');
check(arkitReport.premiumEligible === false, 'arkit not premium');
check(arkitReport.capabilityLevel === 2, 'arkit level 2');
check(arkitReport.importAllowed === true, 'arkit import allowed');
check(arkitReport.missingRequired.length === 8, 'arkit missing 8 premium');

const arkitFilename = validatePerformanceFaceV2(
  arkitOnlyInventory({ filenameHint: 'hero-premium-face.glb' }),
);
check(arkitFilename.premiumEligible === false, 'filename no premium');
check(
  arkitFilename.warnings.some((w) => /ignoriert/i.test(w)),
  'filename warning',
);

const premiumNames = [
  ...coreArkit,
  ...PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS,
  ...PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS,
];
const premiumReport = validatePerformanceFaceV2({
  presentTargetNames: premiumNames,
  hasHumanoid: true,
  hasHead: true,
  gazeDrivePath: 'bones',
  arkitPresentChannels: coreArkit,
});
check(premiumReport.premiumEligible === true, 'full premium');
check(premiumReport.capabilityLevel === 3, 'premium level 3');
check(premiumReport.missingRequired.length === 0, 'premium no missing required');

const manifestOnly = validatePerformanceFaceV2(
  arkitOnlyInventory({
    manifest: {
      contractVersion: 'SagaDrivePerformanceFaceManifestV1',
      claimedLevel: 3,
    },
  }),
);
check(manifestOnly.premiumEligible === false, 'manifest alone no premium');
check(
  manifestOnly.warnings.some((w) => /Manifest beansprucht Premium/i.test(w)),
  'manifest warning',
);

const requiredCorrectiveMissing = validatePerformanceFaceV2({
  presentTargetNames: premiumNames,
  hasHumanoid: true,
  hasHead: true,
  gazeDrivePath: 'bones',
  arkitPresentChannels: coreArkit,
  manifest: {
    contractVersion: 'SagaDrivePerformanceFaceManifestV1',
    correctives: [
      {
        id: 'smileCheekLeftCorrective',
        drivers: ['mouthSmileLeft', 'cheekVolumeLeft'],
        weightRule: 'min',
        required: true,
      },
    ],
  },
});
check(requiredCorrectiveMissing.premiumEligible === false, 'required corrective blocks premium');
check(requiredCorrectiveMissing.standardEligible === true, 'standard still ok');

const optionalCorrectiveMissing = validatePerformanceFaceV2({
  presentTargetNames: [...coreArkit, ...PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS],
  hasHumanoid: true,
  hasHead: true,
  gazeDrivePath: 'bones',
  arkitPresentChannels: coreArkit,
  manifest: {
    contractVersion: 'SagaDrivePerformanceFaceManifestV1',
    correctives: [
      {
        id: 'optionalSmileCheek',
        drivers: ['mouthSmileLeft', 'cheekVolumeLeft'],
        weightRule: 'min',
        required: false,
      },
    ],
  },
});
check(optionalCorrectiveMissing.premiumEligible === true, 'optional corrective warn only');
check(
  optionalCorrectiveMissing.warnings.some((w) => /optionalSmileCheek/.test(w)),
  'optional corrective warning',
);

const noHumanoid = validatePerformanceFaceV2({
  presentTargetNames: [],
  hasHumanoid: false,
  hasHead: false,
  gazeDrivePath: 'none',
  arkitPresentChannels: [],
});
check(noHumanoid.capabilityLevel === 0, 'display level');
check(noHumanoid.importAllowed === true, 'display import allowed');

const importEval = evaluatePerformanceFaceForImport(arkitOnlyInventory());
check(importEval.importAllowed === true && importEval.blocksImport === false, 'import eval');

const de = formatPerformanceFaceReportDe(arkitReport);
check(/LiveAct Standard: PASS/.test(de), 'de standard pass');
check(/LiveAct Premium: NOT AVAILABLE/.test(de), 'de premium na');
check(/Missing:/.test(de) && /Fallback:/.test(de), 'de missing+fallback');

const written = {};
applyPerformanceFaceWeights({
  writeWeight: (name, w) => {
    written[name] = w;
  },
  resolvedNames: { cheekVolumeLeft: 'cheekVolumeLeft' },
  weights: { cheekVolumeLeft: 0.75 },
  correctives: [
    {
      id: 'smileCheekLeftCorrective',
      drivers: ['mouthSmileLeft', 'cheekVolumeLeft'],
      weightRule: 'min',
    },
  ],
  driverWeights: { mouthSmileLeft: 0.9, cheekVolumeLeft: 0.75 },
});
check(written.cheekVolumeLeft === 0.75, 'apply driver');
check(Math.abs(written.smileCheekLeftCorrective - 0.75) < 1e-9, 'apply corrective after drivers');

const { createLiveActInputCapabilities, createLiveActAvatarCapabilities } = await (async () => {
  const cOut = join(root, '.qa/tmp/performance-face-v2-caps-bundle.mjs');
  await build({
    entryPoints: [join(root, 'src/domains/character/liveact/liveact-capabilities.ts')],
    outfile: cOut,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: true,
    logLevel: 'silent',
  });
  return import(cOut + `?t=${Date.now()}`);
})();

const faceSupport = Object.fromEntries(coreArkit.map((id) => [id, true]));
const avatar = createLiveActAvatarCapabilities({
  headBone: true,
  leftEyeBone: true,
  rightEyeBone: true,
  avatarFace: faceSupport,
  gazeDrivePath: 'bones',
  runtimeKind: 'gltf',
});
const composed = composeLiveActWithPerformanceFace(
  createLiveActInputCapabilities({ face: true, headPose: true, eyeGaze: true }),
  avatar,
  arkitReport,
);
check(composed.contractVersion === 'SagaDriveLiveActActiveCapabilityV2', 'compose version');
check(composed.capabilityLevel === 2, 'compose level');
check(composed.liveact.avatarFace.eyeBlinkLeft === true, 'caps v1 preserved');
check(composed.liveact.avatarFace.nasolabialFoldLeft === undefined, 'no non-arkit in avatarFace');

const badManifest = parsePerformanceFaceManifestV1({ contractVersion: 'wrong' });
check(badManifest === null, 'bad manifest null');
const goodManifest = parsePerformanceFaceManifestV1({
  contractVersion: 'SagaDrivePerformanceFaceManifestV1',
  claimedLevel: 3,
});
check(goodManifest?.claimedLevel === 3, 'good manifest');

const evidenceDir = join(root, '.qa/evidence/sagadrive-performance-face-v2');
mkdirSync(evidenceDir, { recursive: true });
writeFileSync(
  join(evidenceDir, 'gate-report.json'),
  JSON.stringify(
    {
      arkitLevel: arkitReport.capabilityLevel,
      premiumLevel: premiumReport.capabilityLevel,
      filenameHackBlocked: !arkitFilename.premiumEligible,
      manifestAloneBlocked: !manifestOnly.premiumEligible,
    },
    null,
    2,
  ),
);

console.log('sagadrive-performance-face-v2-check PASS');
