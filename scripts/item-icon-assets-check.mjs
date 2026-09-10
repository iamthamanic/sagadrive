#!/usr/bin/env node
/**
 * item-icon-assets-check — contract for static SVG item icons + VTracer pipeline.
 * Location: scripts/item-icon-assets-check.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import process from 'node:process';

import { validateAndSanitizeItemIconSvg } from './lib/item-icon-svg.mjs';

const root = process.cwd();
let failures = 0;
let group = '';

function section(name) {
  group = name;
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  }
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function mustExist(relPath) {
  check(existsSync(join(root, relPath)), `missing ${relPath}`);
}

section('1 · pipeline files exist');
[
  'src/domains/items/icon-assets.ts',
  'assets/item-icons.manifest.json',
  'assets/item-icon-sources/.gitkeep',
  'scripts/vectorize-item-icons.mjs',
  'scripts/lib/item-icon-svg.mjs',
  '.github/workflows/vectorize-item-icons.yml',
].forEach(mustExist);

section('2 · domain prompt + path helpers');
{
  const icons = read('src/domains/items/icon-assets.ts');
  const barrel = read('src/domains/items/index.ts');
  check(/buildItemIconPrompt/.test(icons), 'buildItemIconPrompt');
  check(/getItemIconStyleTemplate/.test(icons), 'getItemIconStyleTemplate');
  check(/buildItemIconPublicSrc/.test(icons), 'buildItemIconPublicSrc');
  check(/\{\{ITEM_DESCRIPTION\}\}/.test(icons), 'ITEM_DESCRIPTION placeholder');
  check(/Plain or transparent background/.test(icons), 'shared style constraints');
  check(/buildItemIconPrompt/.test(barrel), 'barrel exports buildItemIconPrompt');
  check(/buildItemIconPublicSrc/.test(barrel), 'barrel exports buildItemIconPublicSrc');
}

section('3 · InventoryItemThumb resolves public SVG');
{
  const thumb = read('src/app/character/inventory/InventoryItemThumb.tsx');
  check(/buildItemIconPublicSrc/.test(thumb), 'uses buildItemIconPublicSrc');
  check(/\/assets\/items/.test(thumb) || /buildItemIconPublicSrc/.test(thumb), 'SVG public path');
  check(!/dangerouslySetInnerHTML/.test(thumb), 'no raw SVG injection');
}

section('4 · no local AI / Flux / OmniSVG deps');
{
  const pkg = read('package.json');
  check(!/"mflux"|"ollama"|"omnisvg"|"stable-diffusion"|"@huggingface\/transformers"/i.test(pkg), 'no local AI image deps in package.json');
  const vectorize = read('scripts/vectorize-item-icons.mjs');
  check(/vtracer/.test(vectorize), 'vectorize script uses vtracer');
  check(/--preset['"]?\s*,?\s*['"]poster/.test(vectorize) || /--preset',\s*'poster'/.test(vectorize), 'poster preset');
  check(/--max-colors/.test(vectorize), 'max-colors');
  check(/--simplify/.test(vectorize), 'simplify');
  check(/--optimize/.test(vectorize), 'optimize');
}

section('5 · manifest + production SVGs');
{
  const manifest = JSON.parse(read('assets/item-icons.manifest.json'));
  check(Array.isArray(manifest) && manifest.length >= 1, 'manifest is non-empty array');
  for (const entry of manifest) {
    check(typeof entry.slug === 'string' && entry.slug, `${entry.id ?? '?'}: slug`);
    check(typeof entry.iconPrompt === 'string' && entry.iconPrompt, `${entry.slug}: iconPrompt`);
    check(entry.iconKey === entry.slug, `${entry.slug}: iconKey matches slug`);
    check(entry.outputSvg === `public/assets/items/${entry.slug}.svg`, `${entry.slug}: outputSvg path`);
    check(entry.sourcePng === `assets/item-icon-sources/${entry.slug}.png`, `${entry.slug}: sourcePng path`);

    const svgRel = entry.outputSvg;
    if (entry.status === 'ready') {
      mustExist(svgRel);
      if (existsSync(join(root, svgRel))) {
        const result = validateAndSanitizeItemIconSvg(read(svgRel));
        check(result.ok, `${entry.slug}: SVG validation — ${(result.errors || []).join('; ')}`);
      }
    }
  }
}

section('6 · all public item SVGs sanitize cleanly');
{
  const dir = join(root, 'public/assets/items');
  if (existsSync(dir)) {
    const files = readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.svg');
    check(files.length >= 1, 'at least one production SVG');
    for (const file of files) {
      const result = validateAndSanitizeItemIconSvg(read(`public/assets/items/${file}`));
      check(result.ok, `${file}: ${(result.errors || []).join('; ')}`);
    }
  } else {
    check(false, 'public/assets/items missing');
  }
}

if (failures > 0) {
  console.error(`\nitem-icon-assets-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('item-icon-assets-check: OK');
