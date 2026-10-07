#!/usr/bin/env node
/**
 * session-prepare-recap-check — Prepare/Recap lifecycle product surfaces (#492).
 * Location: scripts/session-prepare-recap-check.mjs
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
  'src/domains/session/contracts/session-prepare-recap.ts',
  'src/app/session/SessionPrepareScreen.tsx',
  'src/app/session/SessionRecapScreen.tsx',
  'src/app/session/SessionAutoPhaseRedirect.tsx',
  'src/app/session/hooks/useSessionPrepareRecap.ts',
  '.qa/acceptance/session-prepare-recap.md',
  'e2e/session-prepare-recap.spec.ts',
].forEach(mustExist);

section('2 · SessionResourceScreen wires prepare/recap/auto');
{
  const resource = read('src/app/session/SessionResourceScreen.tsx');
  check(/SessionPrepareScreen/.test(resource), 'mounts Prepare');
  check(/SessionRecapScreen/.test(resource), 'mounts Recap');
  check(/SessionAutoPhaseRedirect/.test(resource), 'mounts auto redirect');
  check(/phase === 'prepare'/.test(resource), 'prepare branch');
  check(/phase === 'recap'/.test(resource), 'recap branch');
  check(/phase === 'auto'/.test(resource), 'auto branch');
  check(!/Session vorbereiten[\s\S]*Resource-Identität/.test(resource), 'prepare not placeholder shell');
}

section('3 · domain pure + CTAs');
{
  const domain = read('src/domains/session/contracts/session-prepare-recap.ts');
  check(!/from ['"]react['"]/.test(domain), 'domain React-free');
  check(!/supabase/i.test(domain), 'domain Supabase-free');
  check(/resolveLifecycleScreenFromStatus/.test(domain), 'status resolver');
  check(/buildPreparePrimaryCta/.test(domain), 'prepare CTA');
  check(/buildRecapPrimaryCta/.test(domain), 'recap CTA');
  check(/nextSessionDefaultName/.test(domain), 'next session name');

  const prepare = read('src/app/session/SessionPrepareScreen.tsx');
  check(/data-au-surface="session-prepare"/.test(prepare), 'prepare AU');
  check(/SessionInviteShareButton/.test(prepare), 'invite on prepare');
  check(/pathForSessionLobby/.test(prepare), 'lobby entry from prepare');
  check(/data-session-prepare-primary/.test(prepare), 'prepare primary CTA');

  const recap = read('src/app/session/SessionRecapScreen.tsx');
  check(/data-au-surface="session-recap"/.test(recap), 'recap AU');
  check(/createNextSession/.test(recap), 'next session action');
  check(/data-session-recap-primary/.test(recap), 'recap primary CTA');
  check(/data-session-recap-highlights/.test(recap), 'highlights section');

  const hook = read('src/app/session/hooks/useSessionPrepareRecap.ts');
  check(/projectAdventureRuntimeForAudience/.test(hook), 'audience projection');
  check(/createProjectSession/.test(hook), 'same-saga next session');
}

section('4 · domain behaviour');
{
  const esbuild = require('esbuild');
  const cacheDir = join(root, 'node_modules/.cache/session-prepare-recap-check');
  mkdirSync(cacheDir, { recursive: true });
  const outfile = join(cacheDir, 'session-prepare-recap.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/session/contracts/session-prepare-recap.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);

  check(mod.resolveLifecycleScreenFromStatus('scheduled') === 'prepare', 'scheduled→prepare');
  check(mod.resolveLifecycleScreenFromStatus('active') === 'live', 'active→live');
  check(mod.resolveLifecycleScreenFromStatus('paused') === 'live', 'paused→live');
  check(mod.resolveLifecycleScreenFromStatus('completed') === 'recap', 'completed→recap');
  check(mod.resolveLifecycleScreenFromStatus('cancelled') === 'recap', 'cancelled→recap');
  check(mod.resolveLifecycleScreenFromStatus('waiting') === 'prepare', 'waiting→prepare');

  const prepGm = mod.buildPreparePrimaryCta({ role: 'gamemaster', status: 'scheduled' });
  check(prepGm.kind === 'lobby' && /Lobby/.test(prepGm.labelDe), 'GM prepare→lobby');

  const prepLive = mod.buildPreparePrimaryCta({ role: 'player', status: 'active' });
  check(prepLive.kind === 'live-resume', 'active→live-resume CTA');

  const recapGm = mod.buildRecapPrimaryCta({ role: 'gamemaster' });
  check(recapGm.kind === 'next-session', 'GM next session CTA');

  const recapPlayer = mod.buildRecapPrimaryCta({ role: 'player' });
  check(recapPlayer.kind === 'saga', 'player saga CTA');

  const empty = mod.buildRecapHighlightLines({ consequences: [] });
  check(empty.length === 1 && empty[0].kind === 'empty', 'empty highlights');

  const lines = mod.buildRecapHighlightLines({
    consequences: [
      { id: '1', kind: 'reveal', summary: 'Tor geöffnet' },
      { id: '2', kind: 'flag', summary: 'Alarm' },
    ],
  });
  check(lines.length === 2 && lines[0].summary === 'Tor geöffnet', 'highlight map');

  check(
    mod.nextSessionDefaultName('Nachtwache', 3) === 'Nachtwache · Folge 4',
    'next session name',
  );
  check(mod.sessionStatusLabelDe('completed') === 'Abgeschlossen', 'DE status label');
}

section('5 · acceptance + test-gate + e2e + golden');
{
  const acceptance = read('.qa/acceptance/session-prepare-recap.md');
  check(/session-prepare-recap-journey/.test(acceptance), 'acceptance slug');
  check(/Audience|gm_only|projectAdventureRuntimeForAudience/.test(acceptance), 'audience');
  const gate = read('scripts/test-gate.mjs');
  check(/session-prepare-recap-check\.mjs/.test(gate), 'test-gate wiring');
  const e2e = read('e2e/session-prepare-recap.spec.ts');
  check(/session-prepare|session-recap/.test(e2e), 'e2e targets surfaces');
  const golden = read('e2e/golden-mobile-journeys.spec.ts');
  check(/session-prepare-recap/.test(golden), 'golden mobile includes prepare/recap');
  check(/data-au-surface="session-prepare"/.test(golden), 'golden prepare AU');
  check(/data-au-surface="session-recap"/.test(golden), 'golden recap AU');
}

section('6 · typed-strict on new files');
{
  for (const rel of [
    'src/domains/session/contracts/session-prepare-recap.ts',
    'src/app/session/SessionPrepareScreen.tsx',
    'src/app/session/SessionRecapScreen.tsx',
    'src/app/session/SessionAutoPhaseRedirect.tsx',
    'src/app/session/hooks/useSessionPrepareRecap.ts',
  ]) {
    const src = read(rel);
    check(!/\bas any\b/.test(src), `${rel}: no as any`);
    check(!/: any\b|<any>|any\[\]/.test(src), `${rel}: no any annotations`);
    check(!/@ts-ignore|@ts-expect-error|@ts-nocheck/.test(src), `${rel}: no ts suppress`);
  }
}

if (failures > 0) {
  console.error(`\nsession-prepare-recap-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('session-prepare-recap-check: PASS');
