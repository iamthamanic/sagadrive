#!/usr/bin/env node
/**
 * look-world-capability-stubs-check — reserved world Look capabilities (#346).
 * Location: scripts/look-world-capability-stubs-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const require = createRequire(import.meta.url);
let failures = 0;
let group = '';

const EXPECTED_RESERVED = [
  'environment',
  'sky',
  'water',
  'vegetation',
  'terrain',
  'props',
  'vfx',
];

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

section('1 · files exist');
[
  'src/domains/look/capability-metadata.ts',
  'docs/look-world-capabilities.md',
  '.qa/design/look-system.md',
  '.qa/acceptance/look-world-capability-stubs.md',
].forEach(mustExist);

section('2 · docs name all seven + extend-not-fork');
{
  const docs = read('docs/look-world-capabilities.md');
  const design = read('.qa/design/look-system.md');
  for (const id of EXPECTED_RESERVED) {
    check(docs.includes(id), `docs mention ${id}`);
  }
  check(/Noch nicht verfügbar/.test(docs), 'docs unavailable copy');
  check(
    /erweitern|extend/i.test(docs) && /parallel/i.test(docs),
    'docs require extend LookProfile, not parallel style systems',
  );
  check(/LOOK_CAPABILITY_METADATA/.test(design), 'design references metadata registry');
  check(/#346/.test(design) || /capability-metadata/.test(design), 'design ties to #346');
}

section('3 · barrel exports metadata API');
{
  const barrel = read('src/domains/look/index.ts');
  check(/LOOK_CAPABILITY_METADATA/.test(barrel), 'exports LOOK_CAPABILITY_METADATA');
  check(/lookCapabilityUnavailableLabel/.test(barrel), 'exports unavailable label helper');
  check(/listLookCapabilityMetadata/.test(barrel), 'exports list helper');
  check(/classifyLookCapabilityToken/.test(barrel), 'exports classifier');
  check(/LOOK_WORLD_RESERVED_CAPABILITY_IDS/.test(barrel), 'exports reserved id list');
}

section('4 · metadata behaviour');
{
  const esbuild = require('esbuild');
  const outfile = join(
    root,
    'node_modules/.cache/look-world-capability-stubs-check/capability-metadata.mjs',
  );
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/look/capability-metadata.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);

  const reservedIds = mod.LOOK_WORLD_RESERVED_CAPABILITY_IDS;
  check(
    Array.isArray(reservedIds) && reservedIds.length === 7,
    'exactly 7 reserved world capability ids',
  );
  for (const id of EXPECTED_RESERVED) {
    check(reservedIds.includes(id), `reserved includes ${id}`);
  }

  const reservedMeta = mod.listReservedLookCapabilityMetadata();
  check(reservedMeta.length === 7, 'reserved metadata length 7');
  for (const meta of reservedMeta) {
    check(meta.availability === 'reserved', `${meta.id} availability reserved`);
    check(
      meta.unavailableLabelDe === 'Noch nicht verfügbar',
      `${meta.id} unavailable label`,
    );
  }

  const all = mod.listLookCapabilityMetadata();
  check(all.length === 10, '3 functional + 7 reserved = 10 metadata rows');
  check(mod.isLookCapabilitySupported('character') === true, 'character supported');
  check(mod.isLookCapabilitySupported('sky') === false, 'sky not supported');
  check(mod.lookCapabilityUnavailableLabel('water') === 'Noch nicht verfügbar', 'water UI label');
  check(mod.lookCapabilityUnavailableLabel('character') === null, 'character has no unavailable');
  check(
    mod.lookCapabilityUnavailableLabel('legacy-unknown-cap') === 'Noch nicht verfügbar',
    'unknown → unavailable',
  );

  const classified = mod.classifyLookCapabilityToken('vegetation');
  check(classified.kind === 'reserved' && classified.id === 'vegetation', 'classify reserved');
  const unknown = mod.classifyLookCapabilityToken('totally-new-cap');
  check(unknown.kind === 'unknown' && unknown.raw === 'totally-new-cap', 'classify unknown');
}

section('5 · types list matches expected reserved set');
{
  const types = read('src/domains/look/types.ts');
  for (const id of EXPECTED_RESERVED) {
    check(types.includes(`'${id}'`), `types.ts declares '${id}'`);
  }
}

section('6 · test-gate wiring');
{
  const gate = read('scripts/test-gate.mjs');
  check(
    /look-world-capability-stubs-check\.mjs/.test(gate),
    'test-gate invokes look-world-capability-stubs-check',
  );
}

if (failures > 0) {
  console.error(`\nlook-world-capability-stubs-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('look-world-capability-stubs-check: OK (#346)');
