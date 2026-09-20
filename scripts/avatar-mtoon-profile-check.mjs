#!/usr/bin/env node
/**
 * avatar-mtoon-profile-check — deterministic tests for #214 SagaDriveMToonProfileV1.
 * Location: scripts/avatar-mtoon-profile-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-mtoon-profile-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const profile = read('src/domains/character/avatar/mtoon-profile.ts');
const applier = read('src/infrastructure/character/avatar/mtoon-style-applier.ts');
const runtime = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');
const toggleUi = read('src/app/character/avatar/AvatarMtoonStyleToggle.tsx');
const index = read('src/domains/character/avatar/index.ts');

check(/MTOON_PROFILE_VERSION/.test(profile), 'profile version');
check(/SagaDriveMToonProfileV1/.test(profile), 'profile type');
check(/createSagaDriveMToonProfileV1/.test(profile), 'factory');
check(/MTOON_MATERIAL_CLASSES/.test(profile), 'seven classes list');
check(!/from ['"]three['"]/.test(profile), 'domain has no Three');
check(!/ShaderMaterial|RawShaderMaterial|onBeforeCompile/.test(profile), 'no custom shader in domain');
check(!/ShaderMaterial|RawShaderMaterial|onBeforeCompile/.test(applier), 'no custom shader injection');

const classes = ['skin', 'hair', 'cloth', 'leather', 'metal', 'eyes', 'cybernetic'];
for (const id of classes) {
  check(new RegExp(`classId: '${id}'`).test(profile), `material class ${id}`);
}

check(/resolveMtoonRenderPath/.test(profile), 'path resolver');
check(/desktop/.test(profile) && /mobile/.test(profile), 'performance presets');
check(/applyMtoonProfileToModel/.test(applier), 'model applier');
check(/materialHasBaseMap/.test(applier), 'preserves albedo maps from flat tint');
check(/preserveMap/.test(applier), 'preserveMap branch');
check(/capturePortraitFromRenderer/.test(applier), 'portrait same path');
check(/createMtoonStyleLights/.test(applier), 'light rig');
check(/applyMtoonProfileToRenderer/.test(runtime), 'runtime uses profile renderer');
check(/applyMtoonProfileToModel/.test(runtime), 'runtime applies model style');
check(/capturePortraitDataUrl/.test(runtime), 'runtime portrait API');
check(/getStyleCompatibility/.test(runtime), 'runtime exposes compatibility');
check(/setMtoonStyleEnabled/.test(runtime), 'runtime mtoon preview toggle');
check(/captureMaterialStyleSnapshots/.test(runtime), 'runtime snapshots materials for toggle');
check(/applyNeutralPreviewLights/.test(runtime), 'runtime neutral lights when off');
check(/data-testid="avatar-mtoon-style-notice"/.test(canvas), 'non-blocking notice UI');
check(/data-testid="avatar-mtoon-toggle"/.test(toggleUi), 'mtoon toggle button');
check(/AvatarMtoonStyleToggle/.test(canvas), 'mtoon toggle component imported');
check(/setMtoonStyleEnabled/.test(canvas), 'canvas wires runtime toggle');
check(/export \{[\s\S]*createSagaDriveMToonProfileV1/.test(index), 'barrel export');

const applierToggle = applier;
check(/captureMaterialStyleSnapshots/.test(applierToggle), 'snapshot helper');
check(/restoreMaterialStyleSnapshots/.test(applierToggle), 'restore helper');
check(/applyNeutralPreviewLights/.test(applierToggle), 'neutral lights helper');

// --- pure replicas ---
function resolvePath({ hasMtoonMaterials, isImportModel }) {
  if (hasMtoonMaterials) return { path: 'mtoon', noticeDe: null };
  return {
    path: 'pbr-fallback',
    noticeDe: isImportModel
      ? 'Dieses Import-Modell unterstützt MToon nur eingeschränkt — SagaDrive nutzt den kontrollierten PBR-Fallback.'
      : 'MToon-Materialien fehlen — SagaDrive nutzt den kontrollierten PBR-Fallback.',
  };
}

check(resolvePath({ hasMtoonMaterials: true }).path === 'mtoon', 'mtoon preferred');
check(resolvePath({ hasMtoonMaterials: false, isImportModel: true }).path === 'pbr-fallback', 'glb fallback');
check(Boolean(resolvePath({ hasMtoonMaterials: false, isImportModel: true }).noticeDe), 'import notice');
check(resolvePath({ hasMtoonMaterials: true, isImportModel: true }).noticeDe === null, 'mtoon import silent');

function classify(name) {
  const n = name.toLowerCase();
  const order = [
    ['eyes', ['eye', 'iris']],
    ['cybernetic', ['cyber', 'chrome']],
    ['metal', ['metal', 'armor']],
    ['leather', ['leather']],
    ['hair', ['hair']],
    ['cloth', ['cloth', 'shirt']],
    ['skin', ['skin', 'face']],
  ];
  for (const [id, hints] of order) {
    if (hints.some((h) => n.includes(h))) return id;
  }
  return 'cloth';
}

check(classify('Face_Skin') === 'skin', 'classify skin');
check(classify('Armor_Metal') === 'metal', 'classify metal before cloth');
check(classify('LeftEye') === 'eyes', 'classify eyes');
check(classify('CyberArm') === 'cybernetic', 'classify cyber');

console.log('avatar-mtoon-profile-check PASS');
