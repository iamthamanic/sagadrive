#!/usr/bin/env node
/**
 * avatar-equipment-visual-contract-check — unit tests for #158.
 * Location: scripts/avatar-equipment-visual-contract-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-equipment-visual-contract-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/equipment-visual-contract.ts');
const index = read('src/domains/character/avatar/index.ts');

check(/EQUIPMENT_VISUAL_CONTRACT_VERSION/.test(domain), 'contract version');
check(/projectInventoryEquipmentVisuals/.test(domain), 'resolver');
check(/AvatarEquipmentBinding/.test(domain), 'binding type');
check(/rigid|skinned/.test(domain), 'attachment kinds');
check(/model3d:/.test(domain), 'logical asset key');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(!/from ['"].*supabase/.test(domain), 'no supabase import');
check(!/from ['"]three['"]/.test(domain), 'no three import');
check(/projectInventoryEquipmentVisuals/.test(index), 'barrel export');

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'node_modules/.cache/avatar-equipment-visual-contract-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'contract.mjs');

await build({
  entryPoints: [join(root, 'src/domains/character/avatar/equipment-visual-contract.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});

const mod = await import(outfile);
const {
  createAvatarEquipmentBinding,
  createInMemoryAvatarEquipmentBindingRepository,
  projectInventoryEquipmentVisuals,
  validateAvatarEquipmentBinding,
  clampEquipmentTransform,
} = mod;

const badUrl = createAvatarEquipmentBinding({
  bindingId: 'b1',
  assetId: 'aaa',
  definitionId: 'sword',
});
// forge a free URL
const freeUrlBinding = { ...badUrl, assetKey: 'https://evil.example/x.glb' };
check(validateAvatarEquipmentBinding(freeUrlBinding).ok === false, 'reject free URL');

const binding = createAvatarEquipmentBinding({
  bindingId: 'bind-sword',
  assetId: '11111111-1111-1111-1111-111111111111',
  definitionId: 'core-sword',
  attachment: 'rigid',
  anchor: 'rightHand',
});
check(validateAvatarEquipmentBinding(binding).ok === true, 'valid binding');

const inventory = {
  schemaVersion: 1,
  instances: {
    i1: { instanceId: 'i1', definitionId: 'core-sword', quantity: 1 },
    i2: { instanceId: 'i2', definitionId: 'core-axe', quantity: 1 },
  },
  baseSlots: Array(20).fill(null),
  containers: {},
  equipment: { mainHand: 'i1', offHand: 'i1' }, // two-handed same instance
  quickSlots: [null, null, null, null],
  overflow: [],
};

const repo = createInMemoryAvatarEquipmentBindingRepository([binding]);
const projection = projectInventoryEquipmentVisuals({
  inventory,
  definitions: new Map(),
  bindings: repo,
});
check(projection.visuals.length === 1, 'two-handed → one visual');
check(projection.visuals[0].instanceId === 'i1', 'instance id');
check(projection.visuals[0].slots.includes('mainHand') && projection.visuals[0].slots.includes('offHand'), 'both slots');
check(projection.visuals[0].status === 'ready', 'ready without fit');

const missing = projectInventoryEquipmentVisuals({
  inventory: {
    ...inventory,
    equipment: { body: 'i2' },
    instances: { i2: inventory.instances.i2 },
  },
  definitions: new Map(),
  bindings: createInMemoryAvatarEquipmentBindingRepository([]),
});
check(missing.visuals[0]?.status === 'missing', 'equipped without binding → missing');

const superseded = projectInventoryEquipmentVisuals({
  inventory,
  definitions: new Map(),
  bindings: repo,
  supersededBindingIds: new Set(['bind-sword']),
});
check(superseded.visuals[0]?.status === 'needs-review', 'asset replace → needs-review');

const clamped = clampEquipmentTransform({ position: [999, 0, 0], scale: [0, 99, 1] });
check(clamped.position[0] <= 5 && clamped.scale[0] >= 0.05, 'transform clamp');

console.log('avatar-equipment-visual-contract-check PASS');
