#!/usr/bin/env node
/**
 * advanced-look-adaption-ux-check — Look Editor Advanced capability UI (#356).
 * Location: scripts/advanced-look-adaption-ux-check.mjs
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
  'src/domains/look/advanced-look-capability-status.ts',
  'src/app/look/editor/inspectors/AdvancedLookAdaptionPanel.tsx',
  '.qa/acceptance/advanced-look-adaption-ux.md',
  'e2e/advanced-look-adaption-ux.spec.ts',
].forEach(mustExist);

section('2 · Look Editor wires Advanced section');
{
  const sections = read('src/app/look/editor/look-editor-sections.ts');
  check(/'advanced'/.test(sections), 'advanced section id');
  check(/labelDe: 'Advanced'/.test(sections), 'Advanced nav label');

  const inspector = read('src/app/look/editor/LookEditorInspector.tsx');
  check(/AdvancedLookAdaptionPanel/.test(inspector), 'inspector mounts panel');
  check(/section === 'advanced'/.test(inspector), 'advanced branch');

  const panel = read('src/app/look/editor/inspectors/AdvancedLookAdaptionPanel.tsx');
  check(/data-look-advanced-adaption="v1"/.test(panel), 'AU surface');
  check(/listAdvancedLookProviders/.test(panel), 'reads registry');
  check(/data-look-advanced-mode="rendered"|data-look-advanced-mode=\{row\.mode\}/.test(panel), 'mode rows');
  check(/disabled/.test(panel), 'run CTAs disabled');
  check(!/api[_-]?key|sk_live|password\s*=/i.test(panel), 'no secret material in UI');
  check(/keine Provider-Secrets/.test(panel), 'explicit no-secrets copy');
}

section('3 · domain pure + behaviour');
{
  const domain = read('src/domains/look/advanced-look-capability-status.ts');
  check(!/from ['"]react['"]/.test(domain), 'domain React-free');
  check(!/supabase/i.test(domain), 'domain I/O-free');
  check(/buildAdvancedLookCapabilityStatusView/.test(domain), 'builder export');

  const esbuild = require('esbuild');
  const cacheDir = join(root, 'node_modules/.cache/advanced-look-adaption-ux-check');
  mkdirSync(cacheDir, { recursive: true });
  const outfile = join(cacheDir, 'advanced-look-capability-status.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/look/advanced-look-capability-status.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);

  const empty = mod.buildAdvancedLookCapabilityStatusView([]);
  check(empty.providerCount === 0, 'empty provider count');
  check(empty.rows.length === 2, 'rendered + realtime rows');
  check(empty.rows.every((r) => r.status === 'unavailable'), 'default unavailable');
  check(empty.rows.every((r) => r.runEnabled === false), 'runs disabled without engine');
  check(/Basic Look Adaption/.test(empty.basicSummaryDe), 'basic summary');

  const withRendered = mod.buildAdvancedLookCapabilityStatusView([
    {
      providerId: 'stub-render',
      supportsRendered: true,
      supportsRealtime: false,
      supportedGuideInputs: [],
    },
  ]);
  const rendered = withRendered.rows.find((r) => r.mode === 'rendered');
  const live = withRendered.rows.find((r) => r.mode === 'realtime');
  check(rendered?.status === 'available', 'rendered available with provider');
  check(live?.status === 'unavailable', 'live still unavailable');
  check(rendered?.runEnabled === false, 'no fake run when provider-only');
  check(rendered?.providerId === 'stub-render', 'provider id surfaced');
}

section('4 · acceptance + test-gate + e2e + barrel');
{
  const acceptance = read('.qa/acceptance/advanced-look-adaption-ux.md');
  check(/advanced-look-adaption-ux/.test(acceptance), 'acceptance slug');
  const gate = read('scripts/test-gate.mjs');
  check(/advanced-look-adaption-ux-check\.mjs/.test(gate), 'test-gate wiring');
  const e2e = read('e2e/advanced-look-adaption-ux.spec.ts');
  check(/data-look-advanced-adaption|look-advanced/.test(e2e), 'e2e targets panel');
  const barrel = read('src/domains/look/index.ts');
  check(/advanced-look-capability-status/.test(barrel), 'barrel export');
  const design = read('.qa/design/look-system.md');
  check(/#356|AdvancedLookAdaptionPanel/.test(design), 'design mentions UI');
}

section('5 · typed-strict');
{
  for (const rel of [
    'src/domains/look/advanced-look-capability-status.ts',
    'src/app/look/editor/inspectors/AdvancedLookAdaptionPanel.tsx',
    'src/app/look/editor/LookEditorInspector.tsx',
    'src/app/look/editor/look-editor-sections.ts',
  ]) {
    const src = read(rel);
    check(!/\bas any\b/.test(src), `${rel}: no as any`);
    check(!/@ts-ignore|@ts-expect-error|@ts-nocheck/.test(src), `${rel}: no ts suppress`);
  }
}

if (failures > 0) {
  console.error(`\nadvanced-look-adaption-ux-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('advanced-look-adaption-ux-check: PASS');
