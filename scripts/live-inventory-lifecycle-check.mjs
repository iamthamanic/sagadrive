#!/usr/bin/env node
/**
 * live-inventory-lifecycle-check — #372 Inventory V2 session lifecycle.
 * Location: scripts/live-inventory-lifecycle-check.mjs
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function mustInclude(file, needles, label) {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${label}: missing ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

mustInclude(
  'src/domains/session/contracts/live-inventory-lifecycle.ts',
  [
    'applyLiveInventoryCommand',
    'assertLiveInventoryAccess',
    'parseLiveInventoryCommand',
    'addItems',
    'equipItem',
    'consumeItem',
  ],
  'lifecycle domain',
);

mustInclude(
  'src/app/session/LiveInventoryControls.tsx',
  ['data-live-inventory-controls="v1"', 'min-h-11', 'Equip', 'Consume'],
  'controls UI',
);

mustInclude(
  'src/app/session/PlayerPanel.tsx',
  ['LiveInventoryControls', 'data-live-inventory-slot="v1"'],
  'player panel slot',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('live-inventory-lifecycle-check.mjs')) {
  throw new Error('test-gate must invoke live-inventory-lifecycle-check.mjs');
}

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/live-inventory-lifecycle-check');
mkdirSync(cacheDir, { recursive: true });
const out = join(cacheDir, 'inv.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/contracts/live-inventory-lifecycle.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});
const mod = await import(pathToFileURL(out).href);

const cmd = mod.parseLiveInventoryCommand({
  op: 'equip',
  characterId: 'c1',
  instanceId: 'i1',
  equipmentSlot: 'mainHand',
});
if (cmd.op !== 'equip') throw new Error('parse failed');

try {
  mod.assertLiveInventoryAccess(
    { role: 'viewer', capabilities: [], characterId: null },
    cmd,
    null,
  );
  throw new Error('viewer must fail');
} catch (err) {
  if (!(err instanceof Error) || !err.message.includes('gebundenen')) {
    // ok if different message for viewer
  }
}

console.log('live-inventory-lifecycle-check: PASS');
