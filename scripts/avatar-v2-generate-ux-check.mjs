#!/usr/bin/env node
/**
 * avatar-v2-generate-ux-check — deterministic tests for #267.
 * Location: scripts/avatar-v2-generate-ux-check.mjs
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
    console.error(`avatar-v2-generate-ux-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/generate-product-flow-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const panel = read('src/app/character/avatar/AvatarMeshyPanel.tsx');
const chooser = read('src/app/character/avatar/AvatarGenerateProductModeChooser.tsx');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const source = read('src/domains/character/avatar/avatar-source.ts');

check(/GENERATE_PRODUCT_FLOW_CONTRACT_VERSION/.test(domain), 'contract');
check(/editable-wardrobe/.test(domain) && /free-form/.test(domain), 'modes');
check(/v2Source: 'generate'/.test(domain), 'v2 generate source');
check(/capabilities: \[\]/.test(domain) || /capabilities: readonly \[\]/.test(domain), 'caps empty');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/buildGenerateEditorSeed/.test(index), 'barrel seed');
check(/listGenerateProductModeOptions/.test(index), 'barrel options');
check(/AvatarGenerateProductModeChooser/.test(panel), 'panel wires chooser');
check(/data-avatar-generate-product-mode/.test(panel), 'product mode attr');
check(/productMode: productModeRef/.test(panel), 'success passes mode');
check(/Editierbar & kleidungsfähig/.test(domain), 'editable label');
check(/Freie Form/.test(domain), 'free-form label');
check(/data-avatar-generate-mode/.test(chooser), 'chooser mode attrs');
check(/listGenerateProductModeOptions/.test(chooser), 'chooser uses domain options');
check(/buildGenerateEditorSeed/.test(editor) || /runModularGenerateFlow/.test(editor), 'editor seed/flow');
check(/runModularGenerateFlow/.test(editor) || /productMode === 'free-form'/.test(editor), 'editor free-form path');
check(/Editierbar & kleidungsfähig oder Freie Form/.test(source), 'source copy');
check(!/Tripo|Meshy Adapter/.test(chooser), 'no provider jargon in chooser');

const outDir = join(root, 'node_modules/.cache/avatar-v2-generate-ux-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'flow.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/generate-product-flow-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);
const assert = m.assertGenerateProductFlowInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

const seed = m.buildGenerateEditorSeed({
  modelUrl: 'https://example.invalid/x.glb',
  productMode: 'free-form',
  adapterProviderId: 'meshy',
});
check(seed.v2Source === 'generate', 'source generate');
check(seed.composition.anatomy === 'custom-creature', 'free anatomy');
check(seed.capabilities.length === 0, 'no caps from provider');
check(m.assertProviderDoesNotDriveCapabilities('meshy').capabilities.length === 0, 'guard');

check(existsSync(join(root, '.qa/acceptance/avatar-v2-generate-ux.md')), 'acceptance');
console.log('avatar-v2-generate-ux-check PASS');
