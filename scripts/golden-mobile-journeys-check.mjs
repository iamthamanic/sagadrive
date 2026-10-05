#!/usr/bin/env node
/**
 * Golden Mobile Journeys scaffolding (#484).
 * Static checks for journey contract, adaptive surfaces, Playwright matrix, npm entry for #378.
 * Location: scripts/golden-mobile-journeys-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error(`FAIL: ${msg}`);
  }
}

const required = [
  'src/domains/session/contracts/golden-mobile-journeys.ts',
  'e2e/golden-mobile-journeys.spec.ts',
  '.qa/acceptance/golden-mobile-journeys.md',
  '.qa/design/golden-mobile-journeys.md',
];

for (const rel of required) {
  check(existsSync(`${root}/${rel}`), `missing ${rel}`);
}

const contract = read('src/domains/session/contracts/golden-mobile-journeys.ts');
const spec = read('e2e/golden-mobile-journeys.spec.ts');
const config = read('playwright.config.ts');
const pkg = read('package.json');
const login = read('src/app/shell/auth/LoginScreen.tsx');
const dashboard = read('src/app/dashboard/Dashboard.tsx');
const sessionJoin = read('src/app/session/SessionJoin.tsx');
const playerLive = read('src/app/session/PlayerLiveScreen.tsx');
const barrel = read('src/domains/session/contracts/index.ts');
const mobileCheck = read('scripts/mobile-ui-quality-gate-check.mjs');

check(/GOLDEN_MOBILE_JOURNEY_IDS/.test(contract), 'journey id list');
check(/login-dashboard/.test(contract), 'login-dashboard id');
check(/dashboard-character/.test(contract), 'dashboard-character id');
check(/session-join-assignment/.test(contract), 'session-join-assignment id');
check(/player-live-private/.test(contract), 'player-live-private id');
check(/golden-mobile-journeys/.test(barrel), 'barrel export');

check(/login-dashboard:/.test(spec), 'spec login-dashboard');
check(/dashboard-character:/.test(spec), 'spec dashboard-character');
check(/session-join-assignment:/.test(spec), 'spec session-join-assignment');
check(/player-live-private:/.test(spec), 'spec player-live-private');
check(/expectNoHorizontalOverflow/.test(spec), 'overflow gate in journeys');
check(/expectMinTouchTargets/.test(spec), 'touch gate in journeys');

check(
  /testMatch:\s*\/\(\?:adaptive-ui-quality\|golden-mobile-journeys\)\\.spec\\.ts\//.test(config) ||
    /testMatch: \/\(adaptive-ui-quality\|golden-mobile-journeys\)\\.spec\\.ts\//.test(config) ||
    /golden-mobile-journeys/.test(config),
  'playwright mobile/tablet includes golden-mobile-journeys',
);

check(/test:e2e:golden-mobile/.test(pkg), 'npm script test:e2e:golden-mobile');
check(/data-au-surface="login"/.test(login) && /data-au-pattern="page"/.test(login), 'login adaptive surface');
check(/AdaptivePage/.test(dashboard) && /data-au-surface="dashboard"/.test(dashboard), 'dashboard adaptive surface');
check(
  /AdaptivePage/.test(sessionJoin) && /data-au-surface="session-join"/.test(sessionJoin),
  'session-join adaptive surface',
);
check(/data-au-surface="player-live"/.test(playerLive), 'player-live adaptive surface');
check(/min-h-11/.test(sessionJoin), 'session-join touch targets');

// Keep #483 check tolerant of expanded matrix.
check(
  /golden-mobile-journeys|adaptive-ui-quality/.test(mobileCheck),
  'mobile quality gate aware of journey matrix',
);

if (failures > 0) {
  console.error(`golden-mobile-journeys-check: ${failures} Fehler`);
  process.exit(1);
}
console.log('golden-mobile-journeys-check: PASS (#484)');
