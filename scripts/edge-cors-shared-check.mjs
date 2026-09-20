#!/usr/bin/env node
/**
 * edge-cors-shared-check — Edge Functions must use `_shared/cors.ts` (#305/#306).
 * Location: scripts/edge-cors-shared-check.mjs
 *
 * Wave 1 (#305): migrated echo/allowlist functions must import shared CORS and
 * must not set Access-Control-Allow-Origin locally. Remaining functions stay on
 * an explicit legacy allowlist until #306.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const functionsRoot = join(root, 'supabase/functions');
const sharedCorsPath = join(functionsRoot, '_shared/cors.ts');

/** Functions still allowed to define CORS locally until wave 2 (#306). */
const LEGACY_CORS_ALLOWLIST = new Set([
  'ai-gm',
  'bestiary',
  'characters',
  'dm-tools',
  'export',
  'items',
  'lorekeeper',
  'marketplace',
  'media',
  'npcs',
  'quests',
  'rulesets',
  'sessions',
  'spellbook',
  'world',
]);

/** Must be migrated in wave 1 (#305). */
const WAVE1_MIGRATED = [
  'ai-provider-credentials',
  'character-avatar-meshy',
  'character-lore',
  'item-model3d',
  'item-thumbnail',
];

function fail(message) {
  console.error(`edge-cors-shared-check FAIL: ${message}`);
  process.exit(1);
}

function listFunctionDirs() {
  if (!existsSync(functionsRoot)) fail('supabase/functions missing');
  return readdirSync(functionsRoot)
    .filter((name) => name !== '_shared' && !name.startsWith('.'))
    .filter((name) => {
      const indexPath = join(functionsRoot, name, 'index.ts');
      try {
        return statSync(join(functionsRoot, name)).isDirectory() && existsSync(indexPath);
      } catch {
        return false;
      }
    })
    .sort();
}

if (!existsSync(sharedCorsPath)) {
  fail('supabase/functions/_shared/cors.ts is required');
}

const sharedSrc = readFileSync(sharedCorsPath, 'utf8');
if (!/export function corsHeaders/.test(sharedSrc)) {
  fail('_shared/cors.ts must export corsHeaders');
}
if (!/export function handleOptions/.test(sharedSrc)) {
  fail('_shared/cors.ts must export handleOptions');
}

const dirs = listFunctionDirs();
const originLiteral = /Access-Control-Allow-Origin/;
const sharedImport = /_shared\/cors(?:\.ts)?['"]/;

for (const name of WAVE1_MIGRATED) {
  if (!dirs.includes(name)) fail(`wave1 function missing: ${name}`);
  const src = readFileSync(join(functionsRoot, name, 'index.ts'), 'utf8');
  if (!sharedImport.test(src)) {
    fail(`${name}: must import ../_shared/cors.ts`);
  }
  if (originLiteral.test(src)) {
    fail(`${name}: must not set Access-Control-Allow-Origin locally`);
  }
  if (LEGACY_CORS_ALLOWLIST.has(name)) {
    fail(`${name}: must not remain on legacy CORS allowlist`);
  }
}

for (const name of dirs) {
  const src = readFileSync(join(functionsRoot, name, 'index.ts'), 'utf8');
  const hasOriginLiteral = originLiteral.test(src);
  const importsShared = sharedImport.test(src);

  if (WAVE1_MIGRATED.includes(name)) continue;

  if (importsShared) {
    if (hasOriginLiteral) {
      fail(`${name}: imported shared cors but still has Access-Control-Allow-Origin literal`);
    }
    continue;
  }

  if (hasOriginLiteral) {
    if (!LEGACY_CORS_ALLOWLIST.has(name)) {
      fail(
        `${name}: local Access-Control-Allow-Origin is not on wave1 legacy allowlist — migrate to _shared/cors or update allowlist in #306`,
      );
    }
  }
  // Functions with no CORS headers at all (e.g. main) are left for wave 2 / follow-up.
}

for (const legacy of LEGACY_CORS_ALLOWLIST) {
  if (!dirs.includes(legacy)) {
    fail(`legacy allowlist entry missing on disk: ${legacy}`);
  }
}

console.log(
  `edge-cors-shared-check PASS (${WAVE1_MIGRATED.length} migrated, ${LEGACY_CORS_ALLOWLIST.size} legacy until #306)`,
);
