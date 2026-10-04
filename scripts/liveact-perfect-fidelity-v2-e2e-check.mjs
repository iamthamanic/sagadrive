#!/usr/bin/env node
/**
 * liveact-perfect-fidelity-v2-e2e-check — authoritative #451 Premium E2E gate.
 * Location: scripts/liveact-perfect-fidelity-v2-e2e-check.mjs
 */
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
    console.error(`liveact-perfect-fidelity-v2-e2e-check FAIL: ${msg}`);
    process.exit(1);
  }
}

check(existsSync(join(root, '.qa/design/liveact-perfect-fidelity-v2-e2e.md')), 'design');
check(existsSync(join(root, '.qa/acceptance/liveact-perfect-fidelity-v2-e2e.md')), 'acceptance');
check(
  existsSync(join(root, '.qa/fixtures/liveact-perfect-fidelity-v2/external-premium-inventory.json')),
  'external fixture',
);
check(/liveact-perfect-fidelity-v2-e2e-check/.test(read('scripts/test-gate.mjs')), 'test-gate wiring');
check(/\*liveact-perfect-fidelity-v2-e2e-local\*/.test(read('.gitignore')), 'local gitignore');

const domainFiles = [
  'src/domains/character/liveact/liveact-performance-face-drive.ts',
  'src/domains/character/liveact/liveact-perfect-fidelity-v2-e2e.ts',
];
for (const rel of domainFiles) {
  check(existsSync(join(root, rel)), `exists ${rel}`);
  const src = read(rel);
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, /@ts-nocheck/, / as any\b/, / as unknown as /]) {
    check(!pattern.test(src), `${rel} no type escape`);
  }
  check(!/from ['"]three['"]/.test(src), `${rel} domain pure`);
  check(!/\blocalStorage\b/.test(src) && !/\bfetch\s*\(/.test(src), `${rel} no storage/network`);
}

const barrel = read('src/domains/character/liveact/index.ts');
check(/drivePerformanceFaceWeights/.test(barrel), 'barrel drive');
check(/runPerfectFidelityV2E2e/.test(barrel), 'barrel e2e');

const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
check(/drivePerformanceFaceWeights/.test(engine), 'engine drive');
check(/applyPerformanceFaceWeights/.test(engine), 'engine apply');

const gltf = read('src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts');
const vrm = read('src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts');
check(/applyPerformanceFaceWeights/.test(gltf) && /premiumEligible/.test(gltf), 'gltf premium apply');
check(/applyPerformanceFaceWeights/.test(vrm) && /premiumEligible/.test(vrm), 'vrm premium apply');

check(
  /MEASURED_VIA_451_E2E_GATE/.test(read('src/domains/character/liveact/liveact-hybrid-face-ab.ts')),
  'hybrid AB contour handoff',
);

const privacyRoots = ['.qa/evidence/liveact-perfect-fidelity-v2-e2e', '.qa/fixtures/liveact-perfect-fidelity-v2'];
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

mkdirSync(join(root, '.qa/tmp'), { recursive: true });
const outfile = join(root, '.qa/tmp/perfect-fidelity-v2-e2e-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-perfect-fidelity-v2-e2e.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  logLevel: 'silent',
});

const mod = await import(outfile + `?t=${Date.now()}`);
const report = mod.runPerfectFidelityV2E2e();

check(report.contractVersion === 'SagaDriveLiveActPerfectFidelityV2E2E', 'contract');
check(report.standardFallbackGreen === true, 'canonical standard fallback');
check(report.canonicalPremiumBlockerOk === true, 'canonical premium blocker documented');
check(report.externalPremiumPass === true, 'external premium pass');
check(report.applyPath.appliedControls >= 8, 'applied premium controls');
check(report.applyPath.contour.status === 'MEASURED', 'contour measured');
check(report.applyPath.contour.sampleCount === 4, 'contour 4 lip samples');
check(report.privacy.biometricsCommitted === false, 'privacy');

const { validatePerformanceFaceV2 } = await (async () => {
  const cOut = join(root, '.qa/tmp/pf451-validate-bundle.mjs');
  await build({
    entryPoints: [
      join(root, 'src/domains/character/liveact/liveact-performance-face-validate.ts'),
    ],
    outfile: cOut,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: true,
    logLevel: 'silent',
  });
  return import(cOut + `?t=${Date.now()}`);
})();

const hack = validatePerformanceFaceV2({
  ...mod.buildCanonicalFace3Inventory(),
  filenameHint: 'super-premium-face.glb',
});
check(hack.premiumEligible === false, 'filename hack blocked');
check(hack.warnings.some((w) => /ignoriert/i.test(w)), 'filename warning');

const evidenceDir = join(root, '.qa/evidence/liveact-perfect-fidelity-v2-e2e');
mkdirSync(evidenceDir, { recursive: true });
const summary = {
  contractVersion: report.contractVersion,
  standardFallbackGreen: report.standardFallbackGreen,
  externalPremiumPass: report.externalPremiumPass,
  canonicalPremiumBlockerOk: report.canonicalPremiumBlockerOk,
  contour: report.applyPath.contour,
  avatars: report.avatars.map((a) => ({
    id: a.profileId,
    level: a.report.capabilityLevel,
    standard: a.standardOk,
    premium: a.premiumOk,
    missingRequired: a.report.missingRequired,
  })),
};
writeFileSync(join(evidenceDir, 'e2e-summary.json'), JSON.stringify(summary, null, 2));
writeFileSync(
  join(root, '.qa/runs/451-perfect-fidelity-v2-e2e-summary.json'),
  JSON.stringify(summary, null, 2),
);

console.log('liveact-perfect-fidelity-v2-e2e-check PASS');
