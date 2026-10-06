#!/usr/bin/env node
/**
 * session-lobby-preflight-check — Session Lobby between join and live (#491).
 * Location: scripts/session-lobby-preflight-check.mjs
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
  'src/domains/session/contracts/session-lobby.ts',
  'src/app/session/SessionLobbyScreen.tsx',
  'src/app/session/hooks/useSessionLobby.ts',
  '.qa/acceptance/session-lobby-preflight.md',
  'e2e/session-lobby-preflight.spec.ts',
].forEach(mustExist);

section('2 · route + join wire to lobby');
{
  const routes = read('src/app/shell/routing/routes.ts');
  check(/SessionPhaseId = 'prepare' \| 'lobby' \| 'live' \| 'recap'/.test(routes), 'lobby in SessionPhaseId');
  check(/prepare\|lobby\|live\|recap/.test(routes), 'lobby in path regex');

  const app = read('src/App.tsx');
  check(/resolveCanonicalLobbyEntry/.test(app), 'App uses lobby entry');
  check(/navigateToSessionPhase\(/.test(app) && /'lobby'/.test(app), 'App navigates to lobby phase');

  const resource = read('src/app/session/SessionResourceScreen.tsx');
  check(/SessionLobbyScreen/.test(resource), 'SessionResourceScreen mounts lobby');
  check(/phase === 'lobby'/.test(resource), 'lobby phase branch');
}

section('3 · no auto media / pure domain');
{
  const domain = read('src/domains/session/contracts/session-lobby.ts');
  check(!/from ['"]react['"]/.test(domain), 'domain React-free');
  check(!/supabase/.test(domain), 'domain Supabase-free');
  check(/mediaFailureBlocksSessionEnter/.test(domain), 'media never blocks enter helper');
  check(/decideLobbyEnterLive/.test(domain), 'enter decision');
  check(/resolveCanonicalLobbyEntry/.test(domain), 'post-join lobby entry');

  const screen = read('src/app/session/SessionLobbyScreen.tsx');
  check(/data-au-surface="session-lobby"/.test(screen), 'AU surface');
  check(/enterCtaLabelDe|Session betreten|Session starten/.test(screen), 'DE CTAs');
  check(/data-session-lobby-probe-camera/.test(screen), 'camera probe CTA');
  check(/data-session-lobby-enter/.test(screen), 'enter CTA');

  const hook = read('src/app/session/hooks/useSessionLobby.ts');
  check(/getUserMedia/.test(hook), 'getUserMedia only in probe helpers');
  check(/prompting/.test(hook), 'explicit probe state');
  // Ensure hook does not call getUserMedia on mount (no top-level await getUserMedia in useEffect without probe)
  check(!/useEffect\(\(\) => \{[^}]*getUserMedia/s.test(hook), 'no auto getUserMedia on mount');
}

section('4 · domain behaviour');
{
  const esbuild = require('esbuild');
  const cacheDir = join(root, 'node_modules/.cache/session-lobby-preflight-check');
  mkdirSync(cacheDir, { recursive: true });
  const outfile = join(cacheDir, 'session-lobby.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/session/contracts/session-lobby.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);

  check(mod.mediaFailureBlocksSessionEnter('denied', 'denied', 'unsupported') === false, 'media never blocks');

  const lobby = mod.resolveCanonicalLobbyEntry({
    role: 'player',
    sagaPublicId: 'sa-k7m4q',
    sessionPublicId: 'se-k7m4q',
  });
  check(lobby.kind === 'lobby', 'lobby entry ok');
  check(lobby.sagaPublicId === 'SA-K7M4Q', 'saga normalized');

  const enterGm = mod.decideLobbyEnterLive({
    role: 'gamemaster',
    sagaPublicId: 'SA-K7M4Q',
    sessionPublicId: 'SE-K7M4Q',
    characterPublicId: null,
  });
  check(enterGm.kind === 'gamemaster-live', 'GM may start without character');

  const enterPlayerBlocked = mod.decideLobbyEnterLive({
    role: 'player',
    sagaPublicId: 'SA-K7M4Q',
    sessionPublicId: 'SE-K7M4Q',
    characterPublicId: null,
  });
  check(enterPlayerBlocked.kind === 'blocked', 'player without character blocked');

  const enterPlayer = mod.decideLobbyEnterLive({
    role: 'player',
    sagaPublicId: 'SA-K7M4Q',
    sessionPublicId: 'SE-K7M4Q',
    characterPublicId: 'CH-K7M4Q',
  });
  check(enterPlayer.kind === 'player-live', 'player with character enters live');

  const vm = mod.buildLobbyPreflightViewModel({
    summary: {
      sessionId: 's1',
      sessionPublicId: 'SE-K7M4Q',
      sagaPublicId: 'SA-K7M4Q',
      sessionName: 'Test',
      sagaName: 'Saga',
      status: 'scheduled',
      code: 'ABCDEF',
    },
    selfRole: 'player',
    selfUserId: 'u1',
    selfCharacterId: 'c1',
    selfCharacterName: 'Kara',
    selfCharacterPublicId: 'CH-K7M4Q',
    characterBindingFinal: true,
    roster: [
      {
        userId: 'u1',
        characterId: 'c1',
        characterName: 'Kara',
        characterPublicId: 'CH-K7M4Q',
        role: 'player',
        isOnline: true,
        isReady: true,
        isSelf: true,
      },
    ],
    cameraStatus: 'denied',
    microphoneStatus: 'unavailable',
    liveActStatus: 'unsupported',
  });
  check(vm.enterCtaLabelDe === 'Session betreten', 'player CTA label');
  check(vm.mediaBlocksEnter === false, 'vm mediaBlocksEnter false');
  check(vm.readyCount === 1 && vm.onlineCount === 1, 'roster counts');
}

section('5 · acceptance + test-gate + e2e');
{
  const acceptance = read('.qa/acceptance/session-lobby-preflight.md');
  check(/session-lobby-preflight/.test(acceptance), 'acceptance slug');
  check(/User-Geste|Geste/.test(acceptance), 'gesture requirement');
  const gate = read('scripts/test-gate.mjs');
  check(/session-lobby-preflight-check\.mjs/.test(gate), 'test-gate wiring');
  const e2e = read('e2e/session-lobby-preflight.spec.ts');
  check(/data-au-surface="session-lobby"|session-lobby/.test(e2e), 'e2e targets lobby surface');
  const golden = read('e2e/golden-mobile-journeys.spec.ts');
  check(/session-lobby-preflight/.test(golden), 'golden mobile includes lobby AU');
  check(/data-session-lobby-probe-camera/.test(golden), 'golden asserts probe CTAs');
}

section('6 · typed-strict on new files');
{
  for (const rel of [
    'src/domains/session/contracts/session-lobby.ts',
    'src/app/session/SessionLobbyScreen.tsx',
    'src/app/session/hooks/useSessionLobby.ts',
  ]) {
    const src = read(rel);
    check(!/\bas any\b/.test(src), `${rel}: no as any`);
    check(!/: any\b|<any>|any\[\]/.test(src), `${rel}: no any annotations`);
    check(!/@ts-ignore|@ts-expect-error|@ts-nocheck/.test(src), `${rel}: no ts suppress`);
  }
}

if (failures > 0) {
  console.error(`\nsession-lobby-preflight-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('session-lobby-preflight-check: PASS');
