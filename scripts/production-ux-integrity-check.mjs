#!/usr/bin/env node
/**
 * production-ux-integrity-check — Dead controls / demo UI honesty (#493).
 * Location: scripts/production-ux-integrity-check.mjs
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const require = createRequire(import.meta.url);
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

section('1 · files exist');
[
  'src/domains/session/contracts/production-ux-integrity.ts',
  '.qa/acceptance/production-ux-integrity.md',
  'e2e/production-ux-integrity.spec.ts',
].forEach(mustExist);

section('2 · GM panel — no demo roster / no-op primaries');
{
  const gm = read('src/app/session/GamemasterPanel.tsx');
  check(!/demo-aria|demo-thorin|demo-luna|demo-session-player/.test(gm), 'no demo character IDs');
  check(/data-gm-scene-generate-deferred/.test(gm), 'scene generate deferred marker');
  check(/disabled/.test(gm) && /Szene generieren/.test(gm), 'scene generate disabled');
  check(/data-gm-object-deferred/.test(gm), 'object templates deferred');
  check(/data-gm-sound-deferred/.test(gm), 'soundscapes deferred');
  check(/data-gm-characters-empty|rosterCharacters/.test(gm), 'real/empty roster path');
  check(!/<Button>\s*<Wand2/.test(gm), 'no bare Wand2 generate CTA');
}

section('3 · SessionJoin has no fixture panel');
{
  const join = read('src/app/session/SessionJoin.tsx');
  check(!/PreparedAdventureFixturePanel/.test(join), 'fixture panel not mounted on SessionJoin');
  check(!/mayShowPreparedAdventureFixturePanel/.test(join), 'no DEV fixture gate on SessionJoin');
  const panel = read('src/app/session/PreparedAdventureFixturePanel.tsx');
  check(/DEV ·/.test(panel) || /data-dev-only-fixture/.test(panel), 'fixture component remains DEV-labeled');
}

section('4 · Marketplace paid CTA');
{
  const market = read('src/app/marketplace/browse/Marketplace.tsx');
  check(/marketplacePaidCtaLabelDe/.test(market), 'paid CTA helper');
  check(/marketplacePaidActionEnabled/.test(market), 'paid enable helper');
  check(!/wird implementiert/.test(market), 'no fake purchase toast');
  check(/paid-deferred/.test(market), 'paid deferred data attr');
  check(!/>Kaufen</.test(market), 'no live Kaufen label');
}

section('5 · Profile deferred settings');
{
  const profile = read('src/app/profile/Profile.tsx');
  check(/DEFERRED_SETTING_HINT_DE/.test(profile), 'deferred hint');
  check(/data-settings-deferred="compact"/.test(profile), 'compact deferred');
  check(/data-settings-deferred="session-invites"/.test(profile), 'invites deferred');
  check(/setTheme/.test(profile), 'theme still live');
  check(/handleSignOut|signOut/.test(profile), 'sign out still live');
}

section('6 · domain behaviour');
{
  const domain = read('src/domains/session/contracts/production-ux-integrity.ts');
  check(!/from ['"]react['"]/.test(domain), 'domain React-free');
  check(!/supabase/i.test(domain), 'domain I/O-free');

  const esbuild = require('esbuild');
  const cacheDir = join(root, 'node_modules/.cache/production-ux-integrity-check');
  mkdirSync(cacheDir, { recursive: true });
  const outfile = join(cacheDir, 'production-ux-integrity.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/session/contracts/production-ux-integrity.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);
  check(mod.mayShowPreparedAdventureFixturePanel(true) === false, 'DEV also hides fixture on product join');
  check(mod.mayShowPreparedAdventureFixturePanel(false) === false, 'prod hides fixture');
  check(mod.marketplacePaidActionEnabled(0) === true, 'free download enabled');
  check(mod.marketplacePaidActionEnabled(9.99) === false, 'paid disabled');
  check(mod.marketplacePaidCtaLabelDe(5) === 'Kauf nicht verfügbar', 'paid label');
  check(mod.disposeDeferredPrimaryAction({ implemented: false }) === 'disabled-deferred', 'disposition');
}

section('7 · acceptance + test-gate + e2e');
{
  const acceptance = read('.qa/acceptance/production-ux-integrity.md');
  check(/production-ux-integrity/.test(acceptance), 'acceptance slug');
  const gate = read('scripts/test-gate.mjs');
  check(/production-ux-integrity-check\.mjs/.test(gate), 'test-gate wiring');
  const e2e = read('e2e/production-ux-integrity.spec.ts');
  check(/data-gm-panel|settings-deferred|prepared-adventure-fixture/.test(e2e), 'e2e covers surfaces');
}

section('8 · typed-strict');
{
  for (const rel of [
    'src/domains/session/contracts/production-ux-integrity.ts',
    'src/app/session/GamemasterPanel.tsx',
    'src/app/marketplace/browse/Marketplace.tsx',
    'src/app/profile/Profile.tsx',
  ]) {
    const src = read(rel);
    check(!/\bas any\b/.test(src), `${rel}: no as any`);
    check(!/@ts-ignore|@ts-expect-error|@ts-nocheck/.test(src), `${rel}: no ts suppress`);
  }
}

if (failures > 0) {
  console.error(`\nproduction-ux-integrity-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('production-ux-integrity-check: PASS');
