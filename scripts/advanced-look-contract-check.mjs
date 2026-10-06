#!/usr/bin/env node
/**
 * advanced-look-contract-check — Advanced Look Adaption domain contract (#355).
 * Location: scripts/advanced-look-contract-check.mjs
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

const EXPECTED_GUIDES = [
  'beauty',
  'clay',
  'depth',
  'normals',
  'edges',
  'segmentation',
  'camera',
  'temporal',
  'motion',
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

async function loadBundled(entryRel, cacheName) {
  const esbuild = require('esbuild');
  const cacheDir = join(root, 'node_modules/.cache/advanced-look-contract-check');
  mkdirSync(cacheDir, { recursive: true });
  const outfile = join(cacheDir, cacheName);
  esbuild.buildSync({
    entryPoints: [join(root, entryRel)],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  return import(pathToFileURL(outfile).href);
}

section('1 · files exist');
[
  'src/domains/look/advanced-adaption.ts',
  'src/domains/look/advanced-look-provider-registry.ts',
  'docs/advanced-look-adaption.md',
  '.qa/design/look-system.md',
  '.qa/acceptance/advanced-look-contract.md',
].forEach(mustExist);

section('2 · docs cover modes + guides + same LookProfile');
{
  const docs = read('docs/advanced-look-adaption.md');
  const design = read('.qa/design/look-system.md');
  check(/supportsRendered/.test(docs), 'docs supportsRendered');
  check(/supportsRealtime/.test(docs), 'docs supportsRealtime');
  check(/rendered/.test(docs) && /realtime/.test(docs), 'docs both execution modes');
  for (const id of EXPECTED_GUIDES) {
    check(docs.includes(id), `docs mention guide ${id}`);
  }
  check(
    /LookProfile/.test(docs) && /parallel|zweite|second/i.test(docs),
    'docs forbid parallel style system',
  );
  check(/#355/.test(design) || /advanced-adaption/.test(design), 'design ties to #355');
  check(/supportsRendered/.test(design) && /supportsRealtime/.test(design), 'design negotiation flags');
}

section('3 · barrel exports Advanced API');
{
  const barrel = read('src/domains/look/index.ts');
  check(/ADVANCED_LOOK_GUIDE_INPUT_KINDS/.test(barrel), 'exports guide kinds');
  check(/negotiateAdvancedLookProvider/.test(barrel), 'exports negotiate');
  check(/buildAdvancedLookAdaptionRequest/.test(barrel), 'exports request builder');
  check(/registerAdvancedLookProvider/.test(barrel), 'exports registry register');
  check(/resolveAdvancedLookProviderForMode/.test(barrel), 'exports resolve for mode');
  check(
    !/from ['"]react['"]/.test(read('src/domains/look/advanced-adaption.ts')),
    'advanced-adaption stays React-free',
  );
  check(
    !/from ['"]@supabase|supabase/.test(read('src/domains/look/advanced-adaption.ts')),
    'advanced-adaption stays Supabase-free',
  );
}

section('4 · negotiation + guides behaviour');
{
  const mod = await loadBundled(
    'src/domains/look/advanced-adaption.ts',
    'advanced-adaption.mjs',
  );
  const reg = await loadBundled(
    'src/domains/look/advanced-look-provider-registry.ts',
    'advanced-look-provider-registry.mjs',
  );

  const kinds = mod.ADVANCED_LOOK_GUIDE_INPUT_KINDS;
  check(Array.isArray(kinds) && kinds.length === 9, 'exactly 9 guide kinds');
  for (const id of EXPECTED_GUIDES) {
    check(kinds.includes(id), `kinds includes ${id}`);
  }
  check(
    mod.ADVANCED_LOOK_GUIDE_INPUT_DESCRIPTORS.length === 9,
    'descriptor count 9',
  );

  const missing = mod.negotiateAdvancedLookProvider({
    provider: null,
    executionMode: 'rendered',
  });
  check(missing.ok === false && missing.reason === 'provider_missing', 'null provider degrades');

  const absent = mod.negotiateAdvancedLookProvider({
    provider: {
      providerId: 'noop',
      supportsRendered: false,
      supportsRealtime: false,
      supportedGuideInputs: [],
    },
    executionMode: 'rendered',
  });
  check(
    absent.ok === false && absent.reason === 'advanced_capability_absent',
    'absent advanced capability',
  );

  const renderedOnly = {
    providerId: 'offline-ai',
    supportsRendered: true,
    supportsRealtime: false,
    supportedGuideInputs: ['beauty', 'depth', 'normals'],
  };

  const renderedOk = mod.negotiateAdvancedLookProvider({
    provider: renderedOnly,
    executionMode: 'rendered',
    requestedGuideInputs: ['beauty', 'depth', 'motion'],
  });
  check(renderedOk.ok === true, 'rendered-only provider ok for rendered');
  check(
    renderedOk.acceptedGuideInputs.join(',') === 'beauty,depth',
    'accepted guides subset',
  );
  check(
    renderedOk.omittedGuideInputs.join(',') === 'motion',
    'omitted unsupported guide soft-degrade',
  );

  const realtimeFail = mod.negotiateAdvancedLookProvider({
    provider: renderedOnly,
    executionMode: 'realtime',
  });
  check(
    realtimeFail.ok === false && realtimeFail.reason === 'execution_mode_unsupported',
    'rendered-only rejects realtime independently',
  );

  const realtimeOnly = {
    providerId: 'live-ai',
    supportsRendered: false,
    supportsRealtime: true,
    supportedGuideInputs: ['beauty', 'motion'],
  };
  const liveOk = mod.negotiateAdvancedLookProvider({
    provider: realtimeOnly,
    executionMode: 'realtime',
    requestedGuideInputs: ['beauty', 'depth'],
  });
  check(liveOk.ok === true, 'realtime-only ok for realtime');
  check(liveOk.omittedGuideInputs.includes('depth'), 'realtime reduced guides omit depth');

  const strictFail = mod.negotiateAdvancedLookProvider({
    provider: realtimeOnly,
    executionMode: 'realtime',
    requestedGuideInputs: ['depth'],
    strictGuideInputs: true,
  });
  check(
    strictFail.ok === false && strictFail.reason === 'guide_input_unsupported',
    'strict guide hard-fail',
  );

  const profile = {
    id: 'look-1',
    currentVersion: 2,
    ownerScope: 'saga',
    ownerId: 'saga-1',
  };
  const version = {
    profileId: 'look-1',
    version: 2,
    source: 'manual',
    displayName: 'Test',
    references: [{ id: 'r1', kind: 'style', uri: 'asset://style-1' }],
    capabilities: ['character'],
    executionModes: ['rendered', 'realtime'],
    createdAtIso: '2026-01-01T00:00:00.000Z',
  };
  const req = mod.buildAdvancedLookAdaptionRequest({
    profile,
    version,
    executionMode: 'rendered',
    guideInputs: ['beauty', 'clay'],
  });
  check(req.profile === profile, 'request reuses LookProfile identity');
  check(req.references[0]?.kind === 'style', 'request reuses LookReference');
  check(req.guideInputs.includes('clay'), 'request carries guide inputs');

  reg.__resetAdvancedLookProviderRegistryForTests();
  check(reg.resolveAdvancedLookProviderForMode('rendered') === null, 'empty registry → null');
  reg.registerAdvancedLookProvider(renderedOnly);
  const resolved = reg.resolveAdvancedLookProviderForMode('rendered');
  check(resolved?.providerId === 'offline-ai', 'registry resolves rendered provider');
  check(
    reg.resolveAdvancedLookProviderForMode('realtime') === null,
    'registry does not invent realtime support',
  );
  reg.__resetAdvancedLookProviderRegistryForTests();
}

section('5 · acceptance + test-gate wiring');
{
  const acceptance = read('.qa/acceptance/advanced-look-contract.md');
  check(/supportsRendered/.test(acceptance), 'acceptance mentions supportsRendered');
  check(/LookProfile/.test(acceptance), 'acceptance LookProfile reuse');
  const gate = read('scripts/test-gate.mjs');
  check(
    /advanced-look-contract-check\.mjs/.test(gate),
    'test-gate invokes advanced-look-contract-check',
  );
}

section('6 · typed-strict (no escape hatches in new domain files)');
{
  for (const rel of [
    'src/domains/look/advanced-adaption.ts',
    'src/domains/look/advanced-look-provider-registry.ts',
  ]) {
    const src = read(rel);
    check(!/\bas any\b/.test(src), `${rel}: no as any`);
    check(!/: any\b|<any>|any\[\]/.test(src), `${rel}: no any annotations`);
    check(!/@ts-ignore|@ts-expect-error|@ts-nocheck/.test(src), `${rel}: no ts suppress`);
  }
}

if (failures > 0) {
  console.error(`\nadvanced-look-contract-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('advanced-look-contract-check: PASS');
