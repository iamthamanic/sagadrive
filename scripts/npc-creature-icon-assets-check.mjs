#!/usr/bin/env node
/**
 * npc-creature-icon-assets-check — contract for static SVG NPC/creature icons.
 * Location: scripts/npc-creature-icon-assets-check.mjs
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
  'src/domains/npc-creature/icon-assets.ts',
  'assets/npc-creature-icons.manifest.json',
  'assets/npc-creature-icon-sources/.gitkeep',
  'scripts/vectorize-npc-creature-icons.mjs',
  'scripts/lib/item-icon-svg.mjs',
].forEach(mustExist);

section('2 · domain path helpers + pack wiring');
{
  const icons = read('src/domains/npc-creature/icon-assets.ts');
  const barrel = read('src/domains/npc-creature/index.ts');
  const build = read('src/domains/npc-creature/packs/build-builtin.ts');
  check(/buildNpcCreatureIconPublicSrc/.test(icons), 'buildNpcCreatureIconPublicSrc');
  check(/buildNpcCreatureIconPrompt/.test(icons), 'buildNpcCreatureIconPrompt');
  check(/getNpcCreatureIconStyleTemplate/.test(icons), 'getNpcCreatureIconStyleTemplate');
  check(/NPC_CREATURE_ICON_PUBLIC_DIR/.test(icons), 'public dir constant');
  check(/buildNpcCreatureIconPublicSrc/.test(barrel), 'barrel exports public src helper');
  check(/builtinNpcCreatureIdToIconKey/.test(build), 'id → iconKey helper');
  check(/iconKey/.test(build), 'buildBuiltinNpcCreature sets iconKey');
}

section('3 · Library resolves public SVG');
{
  const browser = read('src/app/library/npc-creatures/NpcCreatureLibraryBrowser.tsx');
  check(/buildNpcCreatureIconPublicSrc/.test(browser), 'uses buildNpcCreatureIconPublicSrc');
  check(/imageUrl=\{iconSrc/.test(browser), 'passes imageUrl to EntityBrowserCard');
  check(!/dangerouslySetInnerHTML/.test(browser), 'no raw SVG injection');
}

section('4 · manifest + production SVGs');
{
  const manifest = JSON.parse(read('assets/npc-creature-icons.manifest.json'));
  check(Array.isArray(manifest) && manifest.length === 25, 'manifest has 25 entries');
  for (const entry of manifest) {
    check(typeof entry.slug === 'string' && entry.slug, `${entry.id ?? '?'}: slug`);
    check(typeof entry.iconPrompt === 'string' && entry.iconPrompt, `${entry.slug}: iconPrompt`);
    check(entry.iconKey === entry.slug, `${entry.slug}: iconKey matches slug`);
    check(
      entry.outputSvg === `public/assets/npc-creatures/${entry.slug}.svg`,
      `${entry.slug}: outputSvg path`,
    );
    check(
      entry.sourcePng === `assets/npc-creature-icon-sources/${entry.slug}.png`,
      `${entry.slug}: sourcePng path`,
    );

    if (entry.status === 'ready') {
      mustExist(entry.outputSvg);
      if (existsSync(join(root, entry.outputSvg))) {
        const result = validateAndSanitizeItemIconSvg(read(entry.outputSvg));
        check(result.ok, `${entry.slug}: SVG validation — ${(result.errors || []).join('; ')}`);
      }
    }
  }
}

section('5 · all public npc-creature SVGs sanitize cleanly');
{
  const dir = join(root, 'public/assets/npc-creatures');
  if (existsSync(dir)) {
    const files = readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.svg');
    check(files.length === 25, `expected 25 production SVGs, got ${files.length}`);
    for (const file of files) {
      const raw = read(`public/assets/npc-creatures/${file}`);
      const result = validateAndSanitizeItemIconSvg(raw);
      check(result.ok, `${file}: ${(result.errors || []).join('; ')}`);
      // Hand-authored @svg-icon-create templates are forbidden for NPC icons —
      // they break style parity with Cursor PNG → VTracer pack art.
      check(
        !/SagaDrive (NPC\/creature|item) icon:/i.test(raw),
        `${file}: hand-authored SVG comment — use Cursor PNG → VTracer`,
      );
      check(
        !/viewBox="0 0 512 512"/i.test(raw) || /width="1024"/i.test(raw),
        `${file}: looks like hand 512 template without VTracer canvas`,
      );
      check(raw.length > 4000, `${file}: SVG too small (${raw.length}B) — likely hand geometry`);
    }
  } else {
    check(false, 'public/assets/npc-creatures missing');
  }
}

section('6 · builtins expose iconKey matching manifest');
{
  const build = read('src/domains/npc-creature/packs/build-builtin.ts');
  check(/iconKey/.test(build), 'builtin builder includes iconKey');
  const manifest = JSON.parse(read('assets/npc-creature-icons.manifest.json'));
  for (const entry of manifest) {
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug), `${entry.slug}: kebab slug`);
  }
}

if (failures > 0) {
  console.error(`\nnpc-creature-icon-assets-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('npc-creature-icon-assets-check: OK');
