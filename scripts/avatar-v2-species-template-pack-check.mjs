#!/usr/bin/env node
/**
 * avatar-v2-species-template-pack-check — deterministic tests for #256.
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
    console.error(`avatar-v2-species-template-pack-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/species-template-pack-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
check(/SPECIES_TEMPLATE_PACK_CONTRACT_VERSION/.test(domain), 'version');
check(/SPECIES_DEFAULT_BODY_FAMILY/.test(domain), 'family map');
check(/listSpeciesTemplatesV1/.test(domain), 'list');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/listSpeciesTemplatesV1/.test(index), 'barrel');

for (const s of ['human', 'elf', 'dwarf', 'halfling', 'orc', 'cyborg', 'alien']) {
  check(existsSync(join(root, `fixtures/avatar-v2/golden/species-${s}.json`)), `golden ${s}`);
}

const outDir = join(root, 'node_modules/.cache/avatar-v2-species-template-pack-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'species.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/species-template-pack-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);

const templates = m.listSpeciesTemplatesV1();
check(templates.length === 7, 'seven templates');
check(m.SPECIES_DEFAULT_BODY_FAMILY.dwarf === 'compact', 'dwarf compact');
check(m.SPECIES_DEFAULT_BODY_FAMILY.orc === 'heavy', 'orc heavy');
check(m.SPECIES_DEFAULT_BODY_FAMILY.human === 'standard', 'human standard');

const complete = m.assertSpeciesTemplatePackComplete(templates);
check(complete.ok === true, `complete ${complete.issues}`);

const picker = m.listSpeciesTemplatePickerItems();
check(picker.length === 7 && picker.every((p) => p.goldenPreviewRef), 'picker');

const orc = m.createSpeciesTemplateV1('orc');
check(orc.baseBodyAssetId === 'sd_body_heavy_v1', 'orc heavy asset');
check(orc.morphState != null, 'orc morph');

console.log('avatar-v2-species-template-pack-check OK');
