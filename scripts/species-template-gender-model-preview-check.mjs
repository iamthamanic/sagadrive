#!/usr/bin/env node
/**
 * species-template-gender-model-preview-check — allowlisted template meshes + wiring.
 * Location: scripts/species-template-gender-model-preview-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`species-template-gender-model-preview-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/species-template-models-v1.ts');
const barrel = read('src/domains/character/avatar/index.ts');
const hook = read('src/app/character/edit/useCharacterAvatarEditor.ts');
const editor = read('src/app/character/edit/CharacterEditor.tsx');

check(/resolveSpeciesTemplateModelUrl/.test(domain), 'resolver export');
check(/SPECIES_TEMPLATE_MODEL_PUBLIC_BASE/.test(domain), 'public base constant');
check(/diverse/.test(domain), 'diverse fails closed');
check(/human-male\.glb/.test(domain) && /human-female\.glb/.test(domain), 'human gender paths');
check(/resolveSpeciesTemplateModelUrl/.test(barrel), 'barrel exports resolver');
check(/genderReading/.test(hook), 'hook accepts genderReading');
check(/resolveSpeciesTemplateModelUrl/.test(hook), 'hook resolves template model');
check(/importedModelUrl \?\? templatePreviewUrl/.test(hook), 'import wins over template');
check(/genderReading,/.test(editor), 'editor passes genderReading');
check(
  existsSync(join(root, 'public/assets/avatars/species/human-male.glb')),
  'public human-male.glb exists',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-female.glb')),
  'public human-female.glb exists',
);

// Pure replica of fail-closed rules (incl. cache-bust query)
const MESH = {
  'masculine-read': '/assets/avatars/species/human-male.glb?v=softreal2',
  'feminine-read': '/assets/avatars/species/human-female.glb?v=softreal2',
};
function resolveReplica(speciesId, genderReading) {
  if (!speciesId) return undefined;
  if (!genderReading || genderReading === 'diverse') return undefined;
  if (speciesId !== 'human') return undefined;
  const path = MESH[genderReading];
  if (typeof path !== 'string') return undefined;
  if (!path.startsWith('/assets/avatars/species/')) return undefined;
  const pathWithoutQuery = path.replace(/[?#].*$/, '').toLowerCase();
  if (!pathWithoutQuery.endsWith('.glb') && !pathWithoutQuery.endsWith('.vrm')) return undefined;
  return path;
}
check(resolveReplica('human', 'masculine-read')?.includes('human-male.glb'), 'male path');
check(resolveReplica('human', 'feminine-read')?.includes('human-female.glb'), 'female path');
check(
  resolveReplica('human', 'masculine-read')?.includes('?v='),
  'cache-bust query preserved',
);
check(resolveReplica('human', 'diverse') === undefined, 'diverse no mesh');
check(resolveReplica('human', undefined) === undefined, 'unset no mesh');
check(resolveReplica('elf', 'masculine-read') === undefined, 'elf fail closed');
check(/pathWithoutQuery/.test(domain), 'resolver strips query before ext check');

console.log('species-template-gender-model-preview-check PASS');
