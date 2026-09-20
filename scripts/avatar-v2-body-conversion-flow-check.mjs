#!/usr/bin/env node
/**
 * avatar-v2-body-conversion-flow-check — deterministic tests for #263.
 * Location: scripts/avatar-v2-body-conversion-flow-check.mjs
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
    console.error(`avatar-v2-body-conversion-flow-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/body-conversion-flow-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const panel = read('src/app/character/avatar/AvatarBodyConversionPanel.tsx');
const importPanel = read('src/app/character/avatar/AvatarImportPanel.tsx');
const editor = [
  read('src/app/character/edit/CharacterEditor.tsx'),
  read('src/app/character/edit/useCharacterAvatarEditor.ts'),
].join('\n');

check(/planBodyConversion/.test(domain), 'plan');
check(/listBodyConversionFamilyOptions/.test(domain), 'options');
check(/resolveIdentityTransferDecision/.test(domain), 'uses spike decision');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/planBodyConversion/.test(index), 'barrel');
check(/Auf SagaDrive-Körper übertragen/.test(panel), 'CTA');
check(/data-avatar-conversion-family/.test(panel), 'family test id');
check(/Empfohlen/.test(panel), 'recommended copy');
check(/humanoide Interpretation/i.test(panel), 'custom warn');
check(/AvatarBodyConversionPanel/.test(importPanel), 'import mounts conversion');
check(/onConverted/.test(importPanel) && /onConverted/.test(editor), 'editor wires conversion');
check(/applyBodyConversion/.test(editor), 'editor handler');
check(/Original behalten/.test(importPanel), 'keep remains');

const outDir = join(root, 'node_modules/.cache/avatar-v2-body-conversion-flow-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'conv.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/body-conversion-flow-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);
const assert = m.assertBodyConversionFlowInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

const opts = m.listBodyConversionFamilyOptions({
  recommendedFamily: 'compact',
  anatomy: 'humanoid',
});
check(opts.length === 3, 'three options');
check(opts.find((o) => o.familyId === 'compact')?.recommended === true, 'compact recommended');

const ready = m.planBodyConversion({
  sourceArtifactId: 'a',
  sourceImportAssetId: 'i',
  sourceModelUrl: 'https://example.invalid/m',
  anatomy: 'humanoid',
  modularity: 'limited',
  recommendedFamily: 'heavy',
  targetFamily: 'standard',
  identityFidelityEstimate: 0.8,
});
check(ready.status === 'ready', 'ready');
check(ready.usesCanonicalBody === true, 'canonical');
check(ready.anatomy === 'humanoid' && ready.modularity === 'modular-parts', 'edit-norm axes');

check(existsSync(join(root, '.qa/acceptance/avatar-v2-body-conversion-flow.md')), 'acceptance');
console.log('avatar-v2-body-conversion-flow-check PASS');
