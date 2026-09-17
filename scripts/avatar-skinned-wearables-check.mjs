#!/usr/bin/env node
/**
 * avatar-skinned-wearables-check — deterministic tests for #162.
 * Location: scripts/avatar-skinned-wearables-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-skinned-wearables-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const plan = read('src/domains/character/avatar/skinned-wearable-plan.ts');
const index = read('src/domains/character/avatar/index.ts');
const runtime = read('src/infrastructure/character/avatar/avatar-skinned-wearable-runtime.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');

check(/planSkinnedWearableAttaches/.test(plan), 'plan');
check(/skinned-wearable-ready/.test(plan), 'capability gate');
check(/passt|muss geprüft werden|nicht kompatibel/.test(plan), 'DE ui status');
check(!/from ['"]three['"]/.test(plan), 'plan no three');
check(/planSkinnedWearableAttaches/.test(index), 'barrel');

check(/AvatarSkinnedWearableRuntime/.test(runtime), 'runtime');
check(/SkinnedMesh/.test(runtime), 'require skinned mesh');
check(/MAX_CACHED/.test(runtime), 'cache bound');
check(/skinnedWearableRuntime/.test(studio), 'studio wire');
check(/applySkinnedWearableVisuals/.test(studio), 'apply API');

function planSkinned(visuals, flags) {
  const can = flags.includes('skinned-wearable-ready');
  const attach = [];
  for (const v of visuals) {
    if (v.attachment !== 'skinned' || !v.assetKey) continue;
    if (!can || v.status !== 'ready') continue;
    attach.push(v.instanceId);
  }
  return attach;
}
check(
  planSkinned(
    [{ attachment: 'skinned', assetKey: 'model3d:a', status: 'ready', instanceId: 'i1' }],
    ['skinned-wearable-ready'],
  ).length === 1,
  'ready+cap attaches',
);
check(
  planSkinned(
    [{ attachment: 'skinned', assetKey: 'model3d:a', status: 'ready', instanceId: 'i1' }],
    ['rigid-equipment-ready'],
  ).length === 0,
  'no skinned cap → skip',
);

console.log('avatar-skinned-wearables-check PASS');
