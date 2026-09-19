#!/usr/bin/env node
/**
 * avatar-v2-skinned-wearable-runtime-check — deterministic tests for #258.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}
function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-v2-skinned-wearable-runtime-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const resolver = read('src/domains/character/avatar/body-family-variant-resolver-v1.ts');
const mask = read('src/domains/character/avatar/body-region-mask-v1.ts');
const plan = read('src/domains/character/avatar/skinned-wearable-plan.ts');
const runtime = read('src/infrastructure/character/avatar/avatar-skinned-wearable-runtime.ts');
const index = read('src/domains/character/avatar/index.ts');

check(/resolveBodyFamilyWearableVariant/.test(resolver), 'resolver');
check(/BodyRegionMaskRegistry/.test(mask), 'mask registry');
check(/ref-count|counts\.get/.test(mask), 'ref count');
check(/SkeletonUtils/.test(runtime), 'skeleton utils');
check(/rebindToAvatarSkeleton/.test(runtime), 'rebind');
check(/setBodyFamily/.test(runtime), 'setBodyFamily');
check(/regionMask/.test(runtime), 'runtime mask');
check(/resolveBodyFamilyWearableVariant/.test(index), 'barrel resolver');
check(/BodyRegionMaskRegistry/.test(index), 'barrel mask');
check(!/from ['"]react['"]/.test(resolver), 'resolver no react');
check(!/from ['"]three['"]/.test(mask), 'mask no three');
check(!/from ['"]three['"]/.test(plan), 'plan no three');

const outDir = join(root, 'node_modules/.cache/avatar-v2-skinned-wearable-runtime-check');
mkdirSync(outDir, { recursive: true });

async function bundle(entry, name) {
  const outfile = join(outDir, name);
  await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
  });
  return import(outfile + `?t=${Date.now()}`);
}

const maskMod = await bundle(
  'src/domains/character/avatar/body-region-mask-v1.ts',
  'mask.mjs',
);
const reg = new maskMod.BodyRegionMaskRegistry();
const d1 = reg.apply(['torso', 'arms']);
check(d1.newlyHidden.includes('torso') && d1.newlyHidden.includes('arms'), 'first hide');
const d2 = reg.apply(['torso']);
check(d2.newlyHidden.length === 0, 'second torso no newlyHidden');
const r1 = reg.release(['torso']);
check(r1.newlyRestored.length === 0, 'still masked by first wearer');
check(reg.isHidden('torso') === true, 'torso still hidden');
const r2 = reg.release(['torso', 'arms']);
check(r2.newlyRestored.includes('torso') && r2.newlyRestored.includes('arms'), 'full restore');
check(reg.isHidden('torso') === false, 'torso visible');

const resMod = await bundle(
  'src/domains/character/avatar/body-family-variant-resolver-v1.ts',
  'resolver.mjs',
);
const ready = resMod.resolveBodyFamilyWearableVariant({
  wearableId: 'basic-shirt',
  bodyFamily: 'compact',
});
check(ready.status === 'ready', 'compact shirt ready');
check(ready.assetPath.includes('compact'), 'compact path');
const badFamily = resMod.resolveBodyFamilyWearableVariant({
  wearableId: 'basic-shirt',
  bodyFamily: 'custom',
});
check(badFamily.status === 'unknown-family', 'custom family fail-closed');

const planMod = await bundle(
  'src/domains/character/avatar/skinned-wearable-plan.ts',
  'plan.mjs',
);
const planned = planMod.planSkinnedWearableAttaches({
  visuals: [
    {
      instanceId: 'i1',
      definitionId: 'd1',
      bindingId: null,
      assetKey: 'basic-shirt',
      attachment: 'skinned',
      anchor: null,
      slots: ['body'],
      primarySlot: 'body',
      transform: null,
      hideRegions: ['torso'],
      status: 'ready',
      reasonDe: '',
    },
  ],
  capabilityFlags: ['skinned-wearable-ready'],
  generation: 1,
  bodyFamily: 'standard',
});
check(planned.attach.length === 1, 'plan attach');
check(planned.attach[0].familyAssetPath.includes('standard'), 'family path on op');

const skip = planMod.planSkinnedWearableAttaches({
  visuals: planned.attach.length
    ? [
        {
          instanceId: 'i2',
          definitionId: 'd1',
          bindingId: null,
          assetKey: 'basic-shirt',
          attachment: 'skinned',
          anchor: null,
          slots: ['body'],
          primarySlot: 'body',
          transform: null,
          hideRegions: ['torso'],
          status: 'ready',
          reasonDe: '',
        },
      ]
    : [],
  capabilityFlags: ['skinned-wearable-ready'],
  generation: 2,
  bodyFamily: 'custom',
});
check(skip.attach.length === 0, 'unknown family skips attach');

console.log('avatar-v2-skinned-wearable-runtime-check OK');
