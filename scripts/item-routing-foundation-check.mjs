#!/usr/bin/env node
/**
 * item-routing-foundation-check — contract for #133 History routing.
 * Location: scripts/item-routing-foundation-check.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);

function mustInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${label}: missing ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

function mustNotInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (text.includes(needle)) {
      throw new Error(`${label}: forbidden ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

mustInclude(
  'src/App.tsx',
  ['useAppLocation', 'ItemCreatePlaceholder', 'ItemDetailPlaceholder', 'NotFoundPlaceholder'],
  'App wiring',
);
mustNotInclude('src/App.tsx', ['useState<AppView>', 'setCurrentView'], 'no parallel currentView SoT');
mustNotInclude('src/app/shell/routing/routes.ts', ['supabase', 'from \'react\'', 'from "react"'], 'pure routes');
mustNotInclude('src/app/shell/routing/routes.ts', ['localStorage'], 'no secrets/storage in routes');

const routesPath = join(root, 'src/app/shell/routing/routes.ts');
if (!existsSync(routesPath)) {
  throw new Error('missing routes.ts');
}

// Compile+load routes via esbuild (same pattern as inventory domain checks).
const esbuild = require('esbuild');
const outfile = join(root, 'node_modules/.cache/item-routing-foundation-check/routes.mjs');
esbuild.buildSync({
  entryPoints: [routesPath],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});

const routes = await import(pathToFileURL(outfile).href);

const cases = [
  ['/', 'view', 'dashboard'],
  ['/library', 'view', 'library'],
  ['/items/create', 'item-create', null],
  ['/items/abc-123', 'item-detail', 'abc-123'],
  ['/items/create/', 'item-create', null],
  ['/nope', 'not-found', null],
];

for (const [path, kind, extra] of cases) {
  const resolved = routes.resolvePathname(path);
  if (resolved.kind !== kind) {
    throw new Error(`resolvePathname(${path}) expected kind ${kind}, got ${resolved.kind}`);
  }
  if (kind === 'view' && resolved.view !== extra) {
    throw new Error(`resolvePathname(${path}) expected view ${extra}, got ${resolved.view}`);
  }
  if (kind === 'item-detail' && resolved.itemId !== extra) {
    throw new Error(`resolvePathname(${path}) expected itemId ${extra}, got ${resolved.itemId}`);
  }
}

if (routes.pathForView('library') !== '/library') {
  throw new Error('pathForView(library) mismatch');
}
if (routes.pathForView('project-join') !== '/join') {
  throw new Error('alias project-join → /join failed');
}
if (routes.pathForItemDetail('x y') !== '/items/x%20y') {
  throw new Error('pathForItemDetail encoding failed');
}

const unknown = routes.resolvePathname('/totally-unknown');
if (unknown.kind !== 'not-found') {
  throw new Error('unknown path must be not-found');
}

console.log('item-routing-foundation-check: OK');
