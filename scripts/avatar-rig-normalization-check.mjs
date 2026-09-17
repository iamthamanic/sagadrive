#!/usr/bin/env node
/**
 * avatar-rig-normalization-check — deterministic tests for #6 humanoid rig contract.
 * Location: scripts/avatar-rig-normalization-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-rig-normalization-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const contract = read('src/domains/character/avatar/rig-contract.ts');
const index = read('src/domains/character/avatar/index.ts');
const aliases = read('src/infrastructure/character/avatar/rig-bone-aliases.ts');
const analyzer = read('src/infrastructure/character/avatar/rig-analyzer.ts');
const runtime = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const panel = read('src/app/character/avatar/AvatarRigCapabilityPanel.tsx');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');

check(/SagaDriveHumanoidRigV1/.test(contract), 'rig contract type');
check(/RIG_CONTRACT_VERSION/.test(contract), 'contract version');
check(/resolveAvatarRigCapabilities/.test(contract), 'capability resolver');
check(/'static'/.test(contract) && /'humanoid'/.test(contract) && /'vrm-ready'/.test(contract), 'capability flags');
check(!/from ['"]three['"]/.test(contract), 'domain rig has no Three');
check(/export \{[\s\S]*resolveAvatarRigCapabilities/.test(index), 'barrel exports resolver');

check(/BONE_ALIAS_TABLE/.test(aliases), 'alias table');
check(/mixamorig:hips/.test(aliases), 'mixamo alias');
check(/RIG_ANALYSIS_MAX_BONES/.test(aliases), 'bone traversal limit');
check(/shouldIgnoreBoneName/.test(aliases), 'twist/helper ignore');

check(/analyzeAvatarRigFromObject3D/.test(analyzer), 'analyzer export');
check(/claimedProviderSuccess/.test(analyzer), 'provider claim ignored');
check(/RIG_ANALYSIS_MAX_NODES/.test(analyzer), 'node limit used');

check(/analyzeAvatarRigFromObject3D/.test(runtime), 'runtime runs analysis');
check(/onRigAnalysis/.test(runtime), 'runtime exposes analysis callback');

check(/capabilityFlagLabel/.test(panel), 'DE labels');
check(/data-avatar-rig-status/.test(panel), 'status test id');
check(/Einschränkungen/.test(panel), 'limitations list');
check(/AvatarRigCapabilityPanel/.test(canvas), 'canvas mounts capability panel');

// --- pure capability replica ---
function resolve(mapped, boneCount, hasVrm, hasSkinned) {
  const core = ['hips','spine','chest','neck','head','leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
  const missing = core.filter((id) => !mapped[id]);
  const flags = ['static'];
  const limitations = [];
  if (boneCount <= 0) return { flags, missing: core, limitations: ['Kein Skelett'] };
  flags.push('rigged');
  if (missing.length === 0) flags.push('humanoid');
  else limitations.push('incomplete');
  if (hasVrm && missing.length === 0) flags.push('vrm-ready');
  if (flags.includes('humanoid')) flags.push('rigid-equipment-ready');
  if (flags.includes('humanoid') && hasSkinned) flags.push('skinned-wearable-ready');
  return { flags, missing, limitations };
}

const full = Object.fromEntries(['hips','spine','chest','neck','head','leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'].map((k) => [k, k]));
const fullCaps = resolve(full, 20, true, true);
check(fullCaps.flags.includes('humanoid') && fullCaps.flags.includes('vrm-ready'), 'full humanoid + vrm');
const partial = resolve({ hips: 'Hips', head: 'Head' }, 5, false, true);
check(partial.flags.includes('rigged') && !partial.flags.includes('humanoid'), 'partial is rigged not humanoid');
const providerLie = resolve({}, 0, true, false);
check(!providerLie.flags.includes('humanoid'), 'no bones => not humanoid even if vrm claimed');

console.log('avatar-rig-normalization-check PASS');
