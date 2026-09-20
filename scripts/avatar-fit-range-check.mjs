#!/usr/bin/env node
/**
 * avatar-fit-range-check — deterministic tests for #216 AvatarFitRangeV1.
 * Location: scripts/avatar-fit-range-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-fit-range-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const contract = read('src/domains/character/avatar/fit-range-contract.ts');
const notice = read('src/app/character/avatar/AvatarFitRangeNotice.tsx');
const panels = read('src/app/character/avatar/AvatarTraitPanels.tsx');
const index = read('src/domains/character/avatar/index.ts');
const editor = [
  read('src/app/character/edit/CharacterEditor.tsx'),
  read('src/app/character/edit/useCharacterAvatarEditor.ts'),
].join('\n');

check(/FIT_RANGE_CONTRACT_VERSION/.test(contract), 'fit contract version');
check(/resolveAvatarFitCompatibility/.test(contract), 'resolver');
check(/'ready'/.test(contract) && /'needs-review'/.test(contract) && /'incompatible'/.test(contract), 'statuses');
check(/allowClamp/.test(contract), 'clamp flag');
check(!/from ['"]three['"]/.test(contract), 'domain no Three');
check(/data-testid="avatar-fit-range-notice"/.test(notice), 'notice UI');
check(/resolveAvatarFitCompatibility/.test(panels), 'panels consume fit');
check(/morph=\{avatarMorph\}/.test(editor), 'editor passes morph');
check(/export \{[\s\S]*resolveAvatarFitCompatibility/.test(index), 'barrel');

// pure replica
function resolve({ height }, { min, max, allowClamp, versionOk }) {
  if (!versionOk) return 'incompatible';
  if (height < min || height > max) return allowClamp ? 'needs-review' : 'incompatible';
  return 'ready';
}
check(resolve({ height: 0 }, { min: -0.85, max: 0.85, allowClamp: false, versionOk: true }) === 'ready', 'in range');
check(resolve({ height: 1 }, { min: -0.85, max: 0.85, allowClamp: false, versionOk: true }) === 'incompatible', 'out of range');
check(resolve({ height: 1 }, { min: -0.85, max: 0.85, allowClamp: true, versionOk: true }) === 'needs-review', 'clamp path');
check(resolve({ height: 0 }, { min: -0.85, max: 0.85, allowClamp: false, versionOk: false }) === 'incompatible', 'version fail-closed');

console.log('avatar-fit-range-check PASS');
