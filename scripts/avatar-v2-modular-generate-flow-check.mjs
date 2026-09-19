#!/usr/bin/env node
/**
 * avatar-v2-modular-generate-flow-check — deterministic tests for #269.
 * Location: scripts/avatar-v2-modular-generate-flow-check.mjs
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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
    console.error(`avatar-v2-modular-generate-flow-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/modular-generate-flow-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const progress = read('src/app/character/avatar/AvatarModularGenerateProgress.tsx');

check(/MODULAR_GENERATE_FLOW_CONTRACT_VERSION/.test(domain), 'contract');
check(/runModularGenerateFlow/.test(domain), 'run');
check(/buildModularGenerateHandoffFor269/.test(domain), 'handoff');
check(/fullModular/.test(domain), 'fullModular flag');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/runModularGenerateFlow/.test(index), 'barrel');
check(/AvatarModularGenerateProgress/.test(editor), 'editor progress');
check(/runModularGenerateFlow/.test(editor), 'editor orchestrates');
check(/starterWardrobeIds/.test(editor) && /modularGenerateResult\?\.modularity/.test(editor), 'save wardrobe');
check(/data-avatar-modular-generate-progress/.test(progress), 'progress UI');
check(/Ziel verstehen|Körper wählen/.test(domain), 'DE stage labels');
check(/useDegradedApproach/.test(domain), 'degraded path');
check(/forbidFullModularFromBlob|fullModular/.test(domain), 'blob guard');

const outDir = join(root, 'node_modules/.cache/avatar-v2-modular-generate-flow-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'flow.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/modular-generate-flow-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);
const assert = m.assertModularGenerateFlowInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

const ready = m.runModularGenerateFlow({
  productMode: 'editable-wardrobe',
  fixtureId: 'human',
});
check(ready.status === 'ready', 'ready');
check(ready.fullModular === true, 'catalog modular');
check(ready.capabilities.length === 0, 'caps');

const gumo = m.runModularGenerateFlow({
  productMode: 'editable-wardrobe',
  fixtureId: 'gumo-like',
});
check(gumo.status === 'degraded-free-form', 'gumo degrade');
check(gumo.fullModular === false, 'gumo not modular');

const partial = m.runModularGenerateFlow({
  productMode: 'editable-wardrobe',
  fixtureId: 'human',
  failWearables: true,
});
check(partial.status === 'partial', 'partial');
check(partial.fullModular === false, 'partial not full');

const degraded = m.runModularGenerateFlow({
  productMode: 'editable-wardrobe',
  fixtureId: 'human',
  useDegradedApproach: true,
});
check(degraded.approachId === 'generate-body-only-catalog-wearables', 'degraded id');
check(degraded.fullModular === true, 'degraded catalog modular');

check(existsSync(join(root, '.qa/acceptance/avatar-v2-modular-generate-flow.md')), 'acceptance');
console.log('avatar-v2-modular-generate-flow-check PASS');
