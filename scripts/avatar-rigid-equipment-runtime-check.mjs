#!/usr/bin/env node
/**
 * avatar-rigid-equipment-runtime-check — deterministic tests for #159.
 * Location: scripts/avatar-rigid-equipment-runtime-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-rigid-equipment-runtime-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const plan = read('src/domains/character/avatar/rigid-equipment-plan.ts');
const index = read('src/domains/character/avatar/index.ts');
const runtime = read('src/infrastructure/character/avatar/avatar-rigid-equipment-runtime.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');

check(/planRigidEquipmentAttaches/.test(plan), 'plan helper');
check(/RIGID_EQUIPMENT_PLAN_VERSION/.test(plan), 'plan version');
check(!/from ['"]react['"]/.test(plan), 'plan no react');
check(!/from ['"]three['"]/.test(plan), 'plan no three');
check(/planRigidEquipmentAttaches/.test(index), 'barrel');

check(/AvatarRigidEquipmentRuntime/.test(runtime), 'runtime class');
check(/MAX_CACHED_GLBS/.test(runtime), 'cache bound');
check(/loadTokens/.test(runtime), 'stale load tokens');
check(/hideTargets/.test(runtime), 'hide restore');
check(/parseItemModel3dAssetKey/.test(runtime), 'logical key only');

check(/rigidEquipmentRuntime/.test(studio), 'studio wires runtime');
check(/applyRigidEquipmentVisuals/.test(studio), 'public apply');
check(/bindAvatar\(root, this\.lastRigAnalysis\)/.test(studio), 'bind after rig');
check(/rigidEquipmentRuntime\.dispose\(\)/.test(studio), 'dispose');

// pure plan replica
function planAttaches(visuals, available, previous) {
  const attach = [];
  const keep = new Set();
  for (const v of visuals) {
    if (v.status !== 'ready' || v.attachment !== 'rigid') continue;
    if (!v.assetKey || !v.anchor || !v.transform) continue;
    if (!available.has(v.anchor)) continue;
    keep.add(v.instanceId);
    attach.push(v.instanceId);
  }
  const detach = previous.filter((id) => !keep.has(id));
  return { attach, detach };
}
const available = new Set(['rightHand']);
const r = planAttaches(
  [
    { status: 'ready', attachment: 'rigid', assetKey: 'model3d:a', anchor: 'rightHand', transform: {}, instanceId: 'i1' },
    { status: 'missing', attachment: 'rigid', assetKey: null, anchor: 'rightHand', transform: null, instanceId: 'i2' },
    { status: 'ready', attachment: 'skinned', assetKey: 'model3d:b', anchor: 'chest', transform: {}, instanceId: 'i3' },
    { status: 'ready', attachment: 'rigid', assetKey: 'model3d:c', anchor: 'leftHand', transform: {}, instanceId: 'i4' },
  ],
  available,
  ['i1', 'old'],
);
check(r.attach.length === 1 && r.attach[0] === 'i1', 'only ready rigid+anchor');
check(r.detach.includes('old') && !r.detach.includes('i1'), 'detach stale');

console.log('avatar-rigid-equipment-runtime-check PASS');
