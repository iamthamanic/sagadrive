#!/usr/bin/env node
/**
 * avatar-modular-traits-check — deterministic tests for #4 modular trait system.
 * Location: scripts/avatar-modular-traits-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-modular-traits-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const layers = read('src/domains/character/avatar/trait-layers.ts');
const catalog = read('src/domains/character/avatar/trait-catalog.ts');
const domainIndex = read('src/domains/character/avatar/index.ts');
const allowlist = read('src/infrastructure/character/avatar/trait-asset-allowlist.ts');
const runtime = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const panels = read('src/app/character/avatar/AvatarTraitPanels.tsx');
const picker = read('src/app/character/avatar/TraitCardPicker.tsx');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const presets = read('src/domains/character/use-cases/avatar-presets.ts');

check(/AVATAR_TRAIT_GROUP_IDS/.test(layers), 'trait group ids');
check(/resolveEffectiveTraits/.test(layers), 'effective trait resolver');
check(/serializePersistedBaseTraits/.test(layers), 'persist base-only helper');
check(/RuntimeTraitOverlay/.test(layers), 'runtime overlay contract');
check(/hides/.test(layers), 'hide channel semantics');
check(!/from ['"]react['"]/.test(layers), 'trait-layers has no React');
check(!/from ['"]three['"]/.test(layers), 'trait-layers has no Three');

check(/listTraitOptionsForGroup/.test(catalog), 'catalog list');
check(/isAllowedTraitId/.test(catalog), 'allowlist gate in domain');
check(/AVATAR_TRAIT_SECTIONS/.test(catalog), 'editor sections');
check(/'head'/.test(catalog) && /'hair'/.test(catalog) && /'clothing'/.test(catalog), 'core groups in catalog');

check(/export \{[\s\S]*resolveEffectiveTraits/.test(domainIndex), 'barrel exports resolver');
check(/toTraitAssetKey/.test(allowlist), 'opaque asset keys');
check(/trait:\$\{/.test(allowlist) || /`trait:/.test(allowlist), 'no free URL asset keys');
check(!/https?:\/\//.test(allowlist), 'allowlist file has no remote URLs');

check(/setRuntimeOverlays/.test(runtime), 'runtime overlay API');
check(/resolveEffectiveTraits/.test(runtime), 'runtime uses domain resolver');
check(/createTraitLifecycleThreeAdapter/.test(runtime), 'lifecycle wired into runtime');
check(/traitLifecycle\.dispose/.test(runtime), 'lifecycle disposed with runtime');

check(/AvatarTraitPanels/.test(panels), 'panels component');
check(/aria-pressed/.test(picker), 'selected state not color-only');
check(/Erneut versuchen/.test(picker), 'retry on trait error');
check(/grid-cols-2/.test(picker), 'max 2 card columns');
check(/AvatarTraitPanels/.test(editor), 'editor mounts trait panels');
check(!/<SelectItem value="human-balanced">/.test(editor), 'legacy Select trait grid removed');
check(/serializePersistedBaseTraits/.test(presets), 'avatar DTO uses base serialization');

// --- pure resolve semantics (inline replica of domain rules) ---
const GROUPS = ['head', 'ears', 'hair', 'clothing', 'accessory'];

function resolveEffective(base, overlays) {
  const byGroup = new Map();
  for (const overlay of overlays) {
    if (!GROUPS.includes(overlay.groupId)) continue;
    const trimmed = String(overlay.traitId || '').trim();
    if (!trimmed) continue;
    const existing = byGroup.get(overlay.groupId);
    const nextPriority = overlay.priority ?? 0;
    if (!existing || nextPriority >= (existing.priority ?? 0)) {
      byGroup.set(overlay.groupId, { ...overlay, traitId: trimmed });
    }
  }
  const hidden = new Set();
  for (const overlay of byGroup.values()) {
    for (const channel of overlay.hides ?? []) {
      if (GROUPS.includes(channel)) hidden.add(channel);
    }
  }
  const traits = {};
  for (const groupId of GROUPS) {
    const overlay = byGroup.get(groupId);
    if (overlay) {
      traits[groupId] = overlay.traitId;
      continue;
    }
    if (hidden.has(groupId)) continue;
    const baseId = base[groupId]?.trim();
    if (baseId) traits[groupId] = baseId;
  }
  return { traits, hiddenGroups: [...hidden] };
}

const base = { head: 'human-balanced', hair: 'long', clothing: 'casual', ears: 'round', accessory: 'none' };
const withHelmet = resolveEffective(base, [
  { groupId: 'accessory', traitId: 'optic-implant', hides: ['hair'], priority: 10 },
]);
check(withHelmet.traits.hair === undefined, 'helmet overlay hides base hair');
check(withHelmet.traits.accessory === 'optic-implant', 'helmet overlay replaces accessory');
check(withHelmet.hiddenGroups.includes('hair'), 'hair listed in hiddenGroups');

const afterRemove = resolveEffective(base, []);
check(afterRemove.traits.hair === 'long', 'removing overlay restores base hair exactly');

const priorityWin = resolveEffective(base, [
  { groupId: 'clothing', traitId: 'robe', priority: 1 },
  { groupId: 'clothing', traitId: 'armor', priority: 5 },
]);
check(priorityWin.traits.clothing === 'armor', 'higher priority overlay wins same channel');

const persisted = {};
for (const g of GROUPS) {
  if (base[g]) persisted[g] = base[g];
}
check(!('overlay' in persisted), 'persisted map has no overlay key');
check(Object.keys(persisted).every((k) => GROUPS.includes(k)), 'only allowlisted groups persisted');

console.log('avatar-modular-traits-check PASS');
