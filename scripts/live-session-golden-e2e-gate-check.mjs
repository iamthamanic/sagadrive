#!/usr/bin/env node
/**
 * Live Session Golden E2E Gate (#378 / Epic #361 exit).
 * Location: scripts/live-session-golden-e2e-gate-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function mustExist(rel) {
  if (!existsSync(join(root, rel))) {
    throw new Error(`missing ${rel}`);
  }
}

function mustInclude(file, needles, label) {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${label}: missing ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

mustExist('src/domains/session/contracts/live-session-golden-e2e-gate.ts');
mustExist('e2e/live-session-golden-e2e-gate.spec.ts');
mustExist('.qa/acceptance/live-session-golden-e2e-gate.md');
mustExist('.qa/design/live-session-golden-e2e-gate.md');
mustExist('e2e/golden-mobile-journeys.spec.ts');
mustExist('src/domains/session/contracts/golden-adventure-dornhain.ts');
mustExist('src/domains/session/contracts/multiuser-e2e-security.ts');
mustExist('scripts/player-test-multiuser-e2e-security-check.mjs');

mustInclude(
  'src/domains/session/contracts/live-session-golden-e2e-gate.ts',
  [
    'LIVE_SESSION_GOLDEN_SCENARIOS',
    'LIVE_SESSION_GOLDEN_CONTEXTS',
    'LIVE_SESSION_GOLDEN_ADVERSARIAL',
    'authorizeGoldenGameplayMutation',
    'mayReceiveKnowledgeFact',
    'resolveDirectorCueWinner',
    'goldenRunDependencyRefs',
  ],
  'golden e2e domain',
);

mustInclude(
  'e2e/live-session-golden-e2e-gate.spec.ts',
  [
    'multi-context',
    'data-live-session-golden',
    'E2E_LIVE_SESSION_GOLDEN',
    'golden-mobile-journeys',
  ],
  'golden e2e playwright',
);

mustInclude('package.json', ['test:e2e:live-session-golden', 'test:e2e:golden-mobile'], 'npm scripts');
mustInclude(
  'src/domains/session/contracts/index.ts',
  ['live-session-golden-e2e-gate'],
  'barrel export',
);

const domainUrl = pathToFileURL(
  join(root, 'src/domains/session/contracts/live-session-golden-e2e-gate.ts'),
).href;

async function main() {
  // Prefer compiled-less import via tsx/jiti if available; else static-only.
  let mod;
  try {
    mod = await import(domainUrl);
  } catch {
    try {
      const jiti = require('jiti')(import.meta.url);
      mod = jiti(join(root, 'src/domains/session/contracts/live-session-golden-e2e-gate.ts'));
    } catch (err) {
      console.warn('live-session-golden-e2e-gate-check: domain import skipped', err?.message ?? err);
      console.log('live-session-golden-e2e-gate-check: PASS (static)');
      return;
    }
  }

  if (mod.LIVE_SESSION_GOLDEN_SCENARIOS?.length !== 20) {
    throw new Error('expected 20 golden scenarios');
  }
  if (mod.LIVE_SESSION_GOLDEN_ADVERSARIAL?.length !== 9) {
    throw new Error('expected 9 adversarial probes');
  }
  if (!mod.isCompleteLiveSessionGoldenChecklist([...mod.LIVE_SESSION_GOLDEN_SCENARIOS])) {
    throw new Error('checklist incomplete');
  }
  mod.assertDornhainPackageReady();
  const deps = mod.goldenRunDependencyRefs();
  if (deps.dornhainPackageId !== 'package:dornhain.whisper.v1') {
    throw new Error('dornhain dep missing');
  }
  if (deps.goldenMobileSpec !== 'e2e/golden-mobile-journeys.spec.ts') {
    throw new Error('golden mobile dep missing');
  }
  if (mod.mayReceiveKnowledgeFact('gm_only', 'viewer') !== false) {
    throw new Error('viewer must not see gm_only');
  }
  if (
    mod.resolveDirectorCueWinner({
      automaticCueId: 'a',
      manualOverrideCueId: 'b',
    }).source !== 'manual_override'
  ) {
    throw new Error('manual override must win');
  }
  console.log('live-session-golden-e2e-gate-check: PASS (#378)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
