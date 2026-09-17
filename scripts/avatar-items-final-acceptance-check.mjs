#!/usr/bin/env node
/**
 * avatar-items-final-acceptance-check — E2E contract matrix for #163 (#158–#162).
 * Location: scripts/avatar-items-final-acceptance-check.mjs
 *
 * Inventory remains gameplay SoT; visuals/providers fail-soft.
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
    console.error(`avatar-items-final-acceptance-check FAIL: ${msg}`);
    process.exit(1);
  }
}

// Structural presence of the pipeline
const files = [
  'src/domains/character/avatar/equipment-visual-contract.ts',
  'src/domains/character/avatar/rigid-equipment-plan.ts',
  'src/domains/character/avatar/skinned-wearable-plan.ts',
  'src/domains/character/avatar/rigging-provider-contract.ts',
  'src/domains/character/avatar/item-avatar-fit-defaults.ts',
  'src/infrastructure/character/avatar/avatar-rigid-equipment-runtime.ts',
  'src/infrastructure/character/avatar/avatar-skinned-wearable-runtime.ts',
  'src/app/items/workbench/ItemAvatarFitSection.tsx',
  'src/app/character/avatar/AvatarSurfaceViewer.tsx',
];
for (const f of files) {
  check(read(f).length > 100, `present ${f}`);
}

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'node_modules/.cache/avatar-items-final-acceptance-check');
mkdirSync(outDir, { recursive: true });

async function bundle(entry, name) {
  const outfile = join(outDir, `${name}.mjs`);
  await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
  });
  return import(outfile);
}

const equip = await bundle(
  'src/domains/character/avatar/equipment-visual-contract.ts',
  'equip',
);
const rigid = await bundle('src/domains/character/avatar/rigid-equipment-plan.ts', 'rigid');
const skinned = await bundle(
  'src/domains/character/avatar/skinned-wearable-plan.ts',
  'skinned',
);
const providers = await bundle(
  'src/domains/character/avatar/rigging-provider-contract.ts',
  'providers',
);
const fitDefaults = await bundle(
  'src/domains/character/avatar/item-avatar-fit-defaults.ts',
  'fitDefaults',
);

// Fixtures: sword right, shield left, helm head, backpack back
const sword = equip.createAvatarEquipmentBinding({
  bindingId: 'b-sword',
  assetId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  definitionId: 'core-sword',
  attachment: 'rigid',
  anchor: 'rightHand',
});
const shield = equip.createAvatarEquipmentBinding({
  bindingId: 'b-shield',
  assetId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  definitionId: 'core-shield',
  attachment: 'rigid',
  anchor: 'leftHand',
});
const helm = equip.createAvatarEquipmentBinding({
  bindingId: 'b-helm',
  assetId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  definitionId: 'core-helm',
  attachment: 'rigid',
  anchor: 'head',
  hideRegions: ['hair'],
});
const pack = equip.createAvatarEquipmentBinding({
  bindingId: 'b-pack',
  assetId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  definitionId: 'core-pack',
  attachment: 'rigid',
  anchor: 'back',
});
const tunic = equip.createAvatarEquipmentBinding({
  bindingId: 'b-tunic',
  assetId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  definitionId: 'core-tunic',
  attachment: 'skinned',
  anchor: 'chest',
});

check(fitDefaults.defaultAnchorForItemType('weapon') === 'rightHand', 'workbench sword default');
check(fitDefaults.defaultAnchorForItemType('shield') === 'leftHand', 'workbench shield default');
check(fitDefaults.defaultAnchorForMiscEquip('head') === 'head', 'workbench helm default');
check(fitDefaults.defaultAnchorForMiscEquip('special') === 'back', 'workbench pack default');

const inventory = {
  schemaVersion: 1,
  instances: {
    iSword: { instanceId: 'iSword', definitionId: 'core-sword', quantity: 1 },
    iShield: { instanceId: 'iShield', definitionId: 'core-shield', quantity: 1 },
    iHelm: { instanceId: 'iHelm', definitionId: 'core-helm', quantity: 1 },
    iPack: { instanceId: 'iPack', definitionId: 'core-pack', quantity: 1 },
    iTunic: { instanceId: 'iTunic', definitionId: 'core-tunic', quantity: 1 },
    iTwo: { instanceId: 'iTwo', definitionId: 'core-sword', quantity: 1 },
  },
  baseSlots: Array(20).fill(null),
  containers: {},
  equipment: {
    mainHand: 'iSword',
    offHand: 'iShield',
    head: 'iHelm',
    special: 'iPack',
    body: 'iTunic',
  },
  quickSlots: [null, null, null, null],
  overflow: [],
};

const repo = equip.createInMemoryAvatarEquipmentBindingRepository([
  sword,
  shield,
  helm,
  pack,
  tunic,
]);
const projection = equip.projectInventoryEquipmentVisuals({
  inventory,
  definitions: new Map(),
  bindings: repo,
});
check(projection.visuals.length === 5, 'five equipped visuals');
check(projection.visuals.every((v) => v.status === 'ready'), 'all ready without fit');

// Two-handed collapse
const twoHandedInv = {
  ...inventory,
  equipment: { mainHand: 'iTwo', offHand: 'iTwo' },
  instances: { iTwo: inventory.instances.iTwo },
};
const twoProj = equip.projectInventoryEquipmentVisuals({
  inventory: twoHandedInv,
  definitions: new Map(),
  bindings: repo,
});
check(twoProj.visuals.length === 1, 'two-handed one visual');

const available = new Set(['rightHand', 'leftHand', 'head', 'back', 'chest']);
const rigidPlan = rigid.planRigidEquipmentAttaches({
  visuals: projection.visuals,
  availableAnchors: available,
  previousInstanceIds: [],
  generation: 1,
});
check(rigidPlan.attach.filter((a) => a.assetKey.includes('aaaa')).length === 1, 'sword attach');
check(rigidPlan.attach.some((a) => a.anchor === 'leftHand'), 'shield attach');
check(rigidPlan.attach.some((a) => a.hideRegions.includes('hair')), 'helm hide hair');

const skinnedPlan = skinned.planSkinnedWearableAttaches({
  visuals: projection.visuals,
  capabilityFlags: ['skinned-wearable-ready', 'humanoid'],
  previousInstanceIds: [],
  generation: 1,
});
check(skinnedPlan.attach.length === 1 && skinnedPlan.attach[0].instanceId === 'iTunic', 'tunic skinned');

const skinnedBlocked = skinned.planSkinnedWearableAttaches({
  visuals: projection.visuals,
  capabilityFlags: ['rigid-equipment-ready'],
  previousInstanceIds: [],
  generation: 1,
});
check(skinnedBlocked.attach.length === 0, 'no skinned cap → no attach');

// Provider matrix
const meshy = providers.createMockMeshyRiggingProvider();
const skinOff = providers.createMockSkinTokensRiggingProvider({ available: false });
const skinOn = providers.createMockSkinTokensRiggingProvider({
  available: true,
  supportExistingSkeleton: true,
});

const meshyOk = await meshy.submit({
  sourceAssetKey: 'model3d:src',
  mode: 'full-rig',
  provider: 'meshy',
  ownerUserId: 'u1',
  clientNonce: 'a',
});
check(meshyOk.status === 'succeeded' && meshyOk.rigAnalysisStatus === 'pending', 'meshy success pending');

const skinUnavail = await skinOff.submit({
  sourceAssetKey: 'model3d:src',
  mode: 'full-rig',
  provider: 'skintokens',
  ownerUserId: 'u1',
  clientNonce: 'b',
});
check(skinUnavail.status === 'unavailable', 'skintokens unavailable');

const skinExisting = await skinOn.submit({
  sourceAssetKey: 'model3d:src',
  mode: 'existing-skeleton-skinning',
  provider: 'skintokens',
  ownerUserId: 'u1',
  clientNonce: 'c',
});
check(skinExisting.status === 'needs-review', 'skintokens needs-review path');

// Capability matrix messaging
check(skinned.mapFitToSkinnedUiStatus('ready') === 'passt', 'passt');
check(skinned.mapFitToSkinnedUiStatus('needs-review') === 'muss geprüft werden', 'review');
check(skinned.mapFitToSkinnedUiStatus('incompatible') === 'nicht kompatibel', 'incompatible');

// Missing binding → gameplay ok, no visual
const missingProj = equip.projectInventoryEquipmentVisuals({
  inventory: {
    ...inventory,
    equipment: { body: 'iTunic' },
    instances: { iTunic: inventory.instances.iTunic },
  },
  definitions: new Map(),
  bindings: equip.createInMemoryAvatarEquipmentBindingRepository([]),
});
check(missingProj.visuals[0]?.status === 'missing', 'equipped without binding');

console.log('avatar-items-final-acceptance-check PASS');
