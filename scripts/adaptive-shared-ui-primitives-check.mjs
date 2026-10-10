#!/usr/bin/env node
/**
 * Adaptive shared UI primitives (#482).
 * Static contract: 8 patterns, band helpers, AU markers, no business/auth imports.
 * Location: scripts/adaptive-shared-ui-primitives-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
let group = '';

function read(relPath) {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
}

function section(name) {
  group = name;
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  }
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) {
    failures += 1;
    console.error(`FAIL [${group}]: fehlt ${label}`);
  }
}

const files = [
  'src/shared/ui/adaptive/bands.ts',
  'src/shared/ui/adaptive/AdaptivePage.tsx',
  'src/shared/ui/adaptive/AdaptiveJourneyColumn.tsx',
  'src/shared/ui/adaptive/AdaptiveActionBar.tsx',
  'src/shared/ui/adaptive/AdaptiveToolbar.tsx',
  'src/shared/ui/adaptive/AdaptiveSheet.tsx',
  'src/shared/ui/adaptive/AdaptiveInspector.tsx',
  'src/shared/ui/adaptive/AdaptiveMasterDetail.tsx',
  'src/shared/ui/adaptive/AdaptiveLiveStage.tsx',
  'src/shared/ui/adaptive/index.ts',
];

section('1 · Dateien vorhanden');
for (const rel of files) {
  check(existsSync(`${root}/${rel}`), rel);
}

const bands = read('src/shared/ui/adaptive/bands.ts');
const page = read('src/shared/ui/adaptive/AdaptivePage.tsx');
const journeyColumn = read('src/shared/ui/adaptive/AdaptiveJourneyColumn.tsx');
const actionBar = read('src/shared/ui/adaptive/AdaptiveActionBar.tsx');
const toolbar = read('src/shared/ui/adaptive/AdaptiveToolbar.tsx');
const sheet = read('src/shared/ui/adaptive/AdaptiveSheet.tsx');
const inspector = read('src/shared/ui/adaptive/AdaptiveInspector.tsx');
const masterDetail = read('src/shared/ui/adaptive/AdaptiveMasterDetail.tsx');
const liveStage = read('src/shared/ui/adaptive/AdaptiveLiveStage.tsx');
const barrel = read('src/shared/ui/adaptive/index.ts');
const layout = read('src/app/shell/Layout.tsx');
const all = [
  bands,
  page,
  journeyColumn,
  actionBar,
  toolbar,
  sheet,
  inspector,
  masterDetail,
  liveStage,
  barrel,
].join('\n');

section('2 · Band helpers (AU device + content bands)');
requireMatch(bands, /export type AdaptiveBand = 'phone' \| 'tablet' \| 'desktop'/, 'AdaptiveBand union');
requireMatch(bands, /ADAPTIVE_PHONE_MAX_PX = 767/, 'phone max 767');
requireMatch(bands, /ADAPTIVE_TABLET_MAX_PX = 1023/, 'tablet max 1023');
requireMatch(bands, /export function resolveAdaptiveBand/, 'resolveAdaptiveBand');
requireMatch(bands, /export function resolveAdaptiveContentBand/, 'resolveAdaptiveContentBand');
requireMatch(bands, /export function useAdaptiveBand/, 'useAdaptiveBand');
requireMatch(bands, /export function useAdaptiveContentBand/, 'useAdaptiveContentBand');
requireMatch(bands, /ResizeObserver/, 'content band ResizeObserver');

section('3 · Patterns exported');
for (const name of [
  'AdaptivePage',
  'AdaptiveJourneyColumn',
  'AdaptiveActionBar',
  'AdaptiveToolbar',
  'AdaptiveSheet',
  'AdaptiveInspector',
  'AdaptiveMasterDetail',
  'AdaptiveLiveStage',
  'useAdaptiveBand',
  'useAdaptiveContentBand',
  'resolveAdaptiveContentBand',
]) {
  requireMatch(barrel, new RegExp(name), `export ${name}`);
}

section('4 · AU markers + safe-area / touch + content width');
requireMatch(page, /data-au-pattern="page"/, 'page AU pattern');
requireMatch(page, /@container\/main|@\[40rem\]\/main/, 'page container gutters');
requireMatch(journeyColumn, /data-au-pattern="journey-column"/, 'journey-column AU pattern');
requireMatch(journeyColumn, /w-full min-w-0 max-w-2xl/, 'journey column fluid soft-cap');
requireMatch(layout, /@container\/main/, 'shell main named container');
requireMatch(layout, /data-adaptive-main/, 'shell main adaptive marker');
requireMatch(actionBar, /data-au-pattern="action-bar"/, 'action-bar AU pattern');
requireMatch(actionBar, /safe-area-pb|safe-area-inset/, 'action-bar safe area');
requireMatch(actionBar, /min-h-11/, 'action-bar 44px touch');
requireMatch(toolbar, /data-au-pattern="toolbar"/, 'toolbar AU pattern');
requireMatch(toolbar, /min-h-11/, 'toolbar touch');
requireMatch(sheet, /data-au-pattern="sheet"/, 'sheet AU pattern');
requireMatch(sheet, /band === 'phone' \? 'bottom' : 'right'/, 'sheet phone→bottom');
requireMatch(inspector, /data-au-pattern="inspector"/, 'inspector AU pattern');
requireMatch(masterDetail, /data-au-pattern="master-detail"/, 'master-detail AU pattern');
requireMatch(liveStage, /data-au-pattern="live-stage"/, 'live-stage AU pattern');
requireMatch(liveStage, /safe-area-pb/, 'live-stage safe area');
requireMatch(all, /motion-reduce/, 'reduced-motion considered');

section('4b · Governance docs (AU-CONTENT-WIDTH)');
const auContract = read('docs/concepts/adaptive-ui-experience-contract.md');
const styleguide = read('docs/ui-styleguide.md');
const agents = read('AGENTS.md');
requireMatch(auContract, /AU-CONTENT-WIDTH/, 'contract AU-CONTENT-WIDTH gate');
requireMatch(auContract, /@container\/main/, 'contract main container');
requireMatch(styleguide, /Page width/, 'styleguide page width section');
requireMatch(agents, /AU-CONTENT-WIDTH|Content width/, 'AGENTS content-width rule');

section('5 · Presentation-only (no auth/supabase/domain)');
check(!/from ['"].*supabase/.test(all), 'no supabase imports');
check(!/from ['"].*domains\//.test(all), 'no domains imports');
check(!/from ['"].*infrastructure\//.test(all), 'no infrastructure imports');
check(!/auth-context|useAuth|getSession/.test(all), 'no auth coupling');
requireMatch(sheet, /from '\.\.\/sheet'/, 'reuses shared sheet');

check(failures === 0, `${failures} Fehler insgesamt`);

if (failures > 0) {
  console.error(`\nadaptive-shared-ui-primitives-check: ${failures} Fehler`);
  process.exit(1);
}

console.log('adaptive-shared-ui-primitives-check: OK (#482)');
