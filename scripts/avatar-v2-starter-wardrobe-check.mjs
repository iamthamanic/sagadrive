#!/usr/bin/env node
/**
 * avatar-v2-starter-wardrobe-check — deterministic tests for #257.
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
    console.error(`avatar-v2-starter-wardrobe-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/starter-wardrobe-manifest-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
check(/STARTER_WARDROBE_CONTRACT_VERSION/.test(domain), 'version');
check(/STARTER_WEARABLE_IDS/.test(domain), 'ids');
check(/resolveStarterWearableFit/.test(domain), 'resolver');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/listStarterWearableManifests/.test(index), 'barrel');
check(/never species-duplicated/.test(domain), 'no species-dup contract intent');

const wearables = [
  'underwear',
  'basic-shirt',
  'basic-pants',
  'basic-boots',
  'basic-robe',
  'leather-armor',
];
const families = ['standard', 'compact', 'heavy'];
for (const w of wearables) {
  for (const f of families) {
    check(
      existsSync(join(root, `fixtures/avatar-v2/golden/wearable-${w}-${f}.json`)),
      `golden ${w}/${f}`,
    );
    check(
      existsSync(
        join(root, `fixtures/avatar-v2/golden/wearable-${w}-${f}-neutral.json`),
      ),
      `neutral ${w}/${f}`,
    );
    check(
      existsSync(
        join(root, `fixtures/avatar-v2/golden/wearable-${w}-${f}-extreme.json`),
      ),
      `extreme ${w}/${f}`,
    );
  }
}

const outDir = join(root, 'node_modules/.cache/avatar-v2-starter-wardrobe-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'wardrobe.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/starter-wardrobe-manifest-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);

const manifests = m.listStarterWearableManifests();
check(manifests.length === 6, 'six wearables');

const complete = m.assertStarterWardrobeComplete(manifests);
check(complete.ok === true, `complete: ${complete.issues.join('; ')}`);

const matrix = m.listGoldenFitMatrixEntries(manifests);
check(matrix.length === 18, `golden matrix 18 got ${matrix.length}`);

const underwear = m.getStarterWearableManifest('underwear');
check(underwear.isDefaultBaseLayer === true, 'underwear baselayer');
check(underwear.hideRule.reversible === true, 'reversible hide');

const humanShirt = m.resolveStarterWearableFitForSpecies({
  wearableId: 'basic-shirt',
  speciesId: 'human',
});
const dwarfShirt = m.resolveStarterWearableFitForSpecies({
  wearableId: 'basic-shirt',
  speciesId: 'dwarf',
});
check(humanShirt.wearableId === dwarfShirt.wearableId, 'same logical shirt');
check(humanShirt.familyId === 'standard', 'human → standard');
check(dwarfShirt.familyId === 'compact', 'dwarf → compact');
check(humanShirt.status === 'ready' && dwarfShirt.status === 'ready', 'both ready');
check(
  humanShirt.variant.assetPath !== dwarfShirt.variant.assetPath,
  'different family assets',
);

const restored = m.restoreRegionsAfterUnequip(underwear.hideRule);
check(Array.isArray(restored), 'unequip restores regions');

// Missing variant fail-closed
const incomplete = [
  {
    ...manifests[1],
    variants: manifests[1].variants.filter((v) => v.familyId !== 'heavy'),
  },
];
const missing = m.resolveStarterWearableFit({
  wearableId: 'basic-shirt',
  bodyFamily: 'heavy',
  catalog: incomplete,
});
check(missing.status === 'missing-variant', 'missing variant not silent');
check(missing.variant === null, 'no wrong fit');

// Morph out of range → incompatible
const shirt = m.getStarterWearableManifest('basic-shirt');
const stdVariant = shirt.variants.find((v) => v.familyId === 'standard');
const morphBody = Object.fromEntries(
  stdVariant.fitRange.bounds.map((b) => [b.key, 0]),
);
morphBody.height = 1.5;
const outOfRange = m.resolveStarterWearableFit({
  wearableId: 'basic-shirt',
  bodyFamily: 'standard',
  morph: {
    contractVersion: 'SagaDriveAvatarMorphV1',
    body: morphBody,
    face: {},
    colors: { skin: '#F5E6D3', eyes: '#3A2F28', hair: '#000000' },
    traits: { ears: [], horns: [], cybernetics: [] },
  },
});
check(outOfRange.status === 'incompatible', `morph OOR status=${outOfRange.status}`);

const paths = m.listAllowlistedStarterWearablePaths();
check(paths.length === 18, '18 allowlisted paths');
check(paths.every((p) => p.startsWith('wearables/')), 'path prefix');

console.log('avatar-v2-starter-wardrobe-check OK');
