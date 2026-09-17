#!/usr/bin/env node
/**
 * avatar-rigging-providers-check — deterministic mocks for #161.
 * Location: scripts/avatar-rigging-providers-check.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { build } from 'esbuild';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-rigging-providers-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/rigging-provider-contract.ts');
const index = read('src/domains/character/avatar/index.ts');

check(/RIGGING_PROVIDER_CONTRACT_VERSION/.test(domain), 'version');
check(/AvatarRiggingProvider/.test(domain), 'provider port');
check(/createMockMeshyRiggingProvider/.test(domain), 'meshy mock');
check(/createMockSkinTokensRiggingProvider/.test(domain), 'skintokens mock');
check(/assertRiggingCapabilitiesPending/.test(domain), 'caps pending');
check(/model3d:/.test(domain), 'logical keys');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/createMockSkinTokensRiggingProvider/.test(index), 'barrel');

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'node_modules/.cache/avatar-rigging-providers-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'contract.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/rigging-provider-contract.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const mod = await import(outfile);

const meshy = mod.createMockMeshyRiggingProvider();
const skinOff = mod.createMockSkinTokensRiggingProvider({ available: false });
const skinOn = mod.createMockSkinTokensRiggingProvider({
  available: true,
  supportExistingSkeleton: false,
});

let threw = false;
try {
  mod.assertLogicalRiggingAssetKey('https://evil/x.glb');
} catch {
  threw = true;
}
check(threw, 'reject free URL');

const ok = await meshy.submit({
  sourceAssetKey: 'model3d:abc',
  mode: 'full-rig',
  provider: 'meshy',
  ownerUserId: 'u1',
  clientNonce: 'n1',
});
check(ok.status === 'succeeded' && ok.rigAnalysisStatus === 'pending', 'meshy success pending caps');

const unavail = await skinOff.submit({
  sourceAssetKey: 'model3d:abc',
  mode: 'full-rig',
  provider: 'skintokens',
  ownerUserId: 'u1',
  clientNonce: 'n2',
});
check(unavail.status === 'unavailable', 'skintokens unavailable');

const existing = await skinOn.submit({
  sourceAssetKey: 'model3d:abc',
  mode: 'existing-skeleton-skinning',
  provider: 'skintokens',
  ownerUserId: 'u1',
  clientNonce: 'n3',
});
check(existing.status === 'unavailable', 'existing-skeleton unavailable by default');

check(mod.selectDefaultRiggingProvider({ meshyAvailable: true, skintokensAvailable: false }) === 'meshy', 'default meshy');
check(mod.assertRiggingCapabilitiesPending('SUCCEEDED') === 'pending', 'never escalate');

console.log('avatar-rigging-providers-check PASS');
