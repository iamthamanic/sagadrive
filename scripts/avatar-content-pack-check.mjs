#!/usr/bin/env node
/**
 * avatar-content-pack-check — deterministic tests for #217 content pack v1.
 * Location: scripts/avatar-content-pack-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-content-pack-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const pack = read('src/domains/character/avatar/content-pack-v1.ts');
const catalog = read('src/domains/character/avatar/trait-catalog.ts');
const index = read('src/domains/character/avatar/index.ts');
const picker = read('src/app/character/avatar/TraitCardPicker.tsx');
const allowlist = read('src/infrastructure/character/avatar/trait-asset-allowlist.ts');

check(/CONTENT_PACK_VERSION/.test(pack), 'content pack version');
check(/CONTENT_PACK_V1_ASSETS/.test(pack), 'assets export');
check(/assertContentPackV1Minimums/.test(pack), 'minimums assert');
check(/createDefaultTraitFitRange/.test(pack), 'fit range stamp');
check(/MTOON_PROFILE_VERSION/.test(pack), 'mtoon stamp');
check(/RIG_CONTRACT_VERSION/.test(pack), 'rig stamp');
check(/CC0-1.0|spdx/.test(pack), 'license metadata');
check(/sagadrive-first-party/.test(pack), 'provenance');
check(!/https?:\/\//.test(pack), 'no remote URLs in pack');
check(!/from ['"]react['"]/.test(pack), 'pack has no React');

check(/CONTENT_PACK_V1_ASSETS/.test(catalog), 'catalog sourced from pack');
check(/settingFilter|setting:/.test(catalog) || /filter\?\.setting/.test(catalog), 'catalog setting filter');
check(/export \{[\s\S]*assertContentPackV1Minimums/.test(index), 'barrel exports assert');
check(/CONTENT_PACK_V1_ASSETS/.test(index), 'barrel exports assets');

check(/data-content-pack-setting/.test(picker), 'setting filter controls');
check(/data-content-pack-empty/.test(picker), 'empty state');
check(/Fantasy/.test(picker) && /Sci-Fi/.test(picker), 'setting labels');
check(/grid-cols-2/.test(picker), '2-col cards');
check(!/https?:\/\//.test(allowlist), 'allowlist has no remote URLs');

// Count replica from source literals
function countCategory(src, category) {
  const re = new RegExp(`category: '${category}'`, 'g');
  return (src.match(re) || []).length;
}
const mins = {
  face: 12,
  hair: 16,
  'facial-hair': 6,
  eyes: 8,
  outfit: 12,
  'species-trait': 10,
  accessory: 12,
  cybernetic: 8,
  'skin-marking': 6,
};
for (const [cat, min] of Object.entries(mins)) {
  const n = countCategory(pack, cat);
  check(n >= min, `${cat} count ${n} >= ${min}`);
}
const fantasyOutfits = (pack.match(/category: 'outfit', label: '[^']+', tags: \['fantasy'\]/g) || []).length
  + (pack.match(/setting: 'fantasy' \}\),?\n  asset\(\{ id: '[^']+', groupId: 'clothing'/g) || []).length;
// Simpler: count outfit+fantasy on same asset lines roughly
const fantasyOutfitLines = [...pack.matchAll(/asset\(\{ id: '[^']+', groupId: 'clothing', category: 'outfit'[^}]+setting: 'fantasy'/g)];
const sciFiOutfitLines = [...pack.matchAll(/asset\(\{ id: '[^']+', groupId: 'clothing', category: 'outfit'[^}]+setting: 'sci-fi'/g)];
check(fantasyOutfitLines.length >= 6, `fantasy outfits ${fantasyOutfitLines.length} >= 6`);
check(sciFiOutfitLines.length >= 6, `sci-fi outfits ${sciFiOutfitLines.length} >= 6`);

console.log('avatar-content-pack-check PASS');
