#!/usr/bin/env node
/**
 * avatar-v2-canonical-body-families-check — deterministic tests for #255.
 * Location: scripts/avatar-v2-canonical-body-families-check.mjs
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
    console.error(`avatar-v2-canonical-body-families-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/canonical-body-families-v1.ts');
const catalog = read('src/infrastructure/character/avatar/base-body-catalog.ts');
const index = read('src/domains/character/avatar/index.ts');

check(/CANONICAL_BODY_FAMILIES_CONTRACT_VERSION/.test(domain), 'version');
check(/sd_body_standard_v1/.test(domain), 'standard id');
check(/sd_body_compact_v1/.test(domain), 'compact id');
check(/sd_body_heavy_v1/.test(domain), 'heavy id');
check(/bakedClothingForbidden/.test(domain), 'no baked clothing');
check(/separate-neutral/.test(domain), 'underwear policy');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/listCanonicalBodyFamilyManifests/.test(index), 'barrel');
check(/allowlistedCanonicalBodyPaths/.test(catalog), 'catalog uses families');
check(/getSagaDriveBaseBodyManifest\(/.test(catalog), 'catalog family arg');

for (const f of ['standard', 'compact', 'heavy']) {
  check(
    existsSync(join(root, `fixtures/avatar-v2/golden/body-${f}-mtoon.json`)),
    `golden ${f}`,
  );
}

const outDir = join(root, 'node_modules/.cache/avatar-v2-canonical-body-families-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'families.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/canonical-body-families-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);

const list = m.listCanonicalBodyFamilyManifests();
check(list.length === 3, 'three families');
check(m.resolveCanonicalBodyFamilyId('sagadrive-base-humanoid-v1') === 'standard', 'legacy→standard');

const morphBundle = await build({
  entryPoints: [join(root, 'src/domains/character/avatar/base-body-contract.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(outDir, 'base-body.mjs'),
  logLevel: 'silent',
  write: true,
});
void morphBundle;
const bb = await import(join(outDir, 'base-body.mjs') + `?t=${Date.now()}`);
const required = bb.listRequiredMorphTargetNames(bb.createCanonicalMorphTargetMap());

for (const family of list) {
  const gate = m.assertCanonicalBodyPublishable({
    family,
    presentMorphTargetNames: required,
    claimsBakedClothing: false,
  });
  check(gate.ok === true, `${family.familyId} publishable got ${gate.issues}`);
  check(family.bodyRegions.includes('underwear'), `${family.familyId} underwear region`);
  check(family.bakedClothingForbidden === true, `${family.familyId} no bake`);
}

const bakedFail = m.assertCanonicalBodyPublishable({
  family: list[0],
  presentMorphTargetNames: required,
  claimsBakedClothing: true,
});
check(bakedFail.ok === false, 'baked clothing rejected');

const paths = m.allowlistedCanonicalBodyPaths();
check(paths.includes('sd_body_standard_v1.vrm'), 'path standard');
check(paths.includes('sagadrive-base-humanoid-v1.vrm'), 'legacy path kept');

console.log('avatar-v2-canonical-body-families-check OK');
