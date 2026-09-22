#!/usr/bin/env node
/**
 * species-template-gender-model-preview-check — allowlisted template meshes + wiring (#405).
 * Location: scripts/species-template-gender-model-preview-check.mjs
 *
 * First-party Human M/W resolve to VRM 1.0 primary; GLB remains published as fallback/source.
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
const output = read('src/infrastructure/character/liveact/liveact-avatar-output.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');

check(/resolveSpeciesTemplateModelUrl/.test(domain), 'resolver export');
check(/SPECIES_TEMPLATE_MODEL_PUBLIC_BASE/.test(domain), 'public base constant');
check(/diverse/.test(domain), 'diverse fails closed');
check(
  /human-male-quality-20260921-m5-face1\.vrm/.test(domain) &&
    /human-female-quality-20260921-f5-face1\.vrm/.test(domain),
  'human gender paths m5-face1/f5-face1 VRM primary',
);
check(!/\.glb\?v=quality5-face2-vrm2/.test(domain), 'primary resolver is not GLB');
check(!/HUMAN_MALE_PREVIEW_VERSIONS/.test(domain), 'no male version picker catalog');
check(!/quality-m4|quality-m3|softreal2\.glb/.test(domain), 'no rollback paths in domain');
check(/resolveSpeciesTemplateModelUrl/.test(barrel), 'barrel exports resolver');
check(/genderReading/.test(hook), 'hook accepts genderReading');
check(/resolveSpeciesTemplateModelUrl/.test(hook), 'hook resolves template model');
check(/importedModelUrl \?\? templatePreviewUrl/.test(hook), 'import wins over template');
check(/genderReading,/.test(editor), 'editor passes genderReading');

check(
  existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face1.vrm')),
  'public human-male quality m5-face1 VRM exists',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face1.vrm')),
  'public human-female quality f5-face1 VRM exists',
);
check(
  existsSync(
    join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face1-face-anchors.json'),
  ),
  'public m5 face-anchors sidecar',
);
check(
  existsSync(
    join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face1-face-anchors.json'),
  ),
  'public f5 face-anchors sidecar',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face1.glb')),
  'public human-male quality m5-face1 GLB fallback retained',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face1.glb')),
  'public human-female quality f5-face1 GLB fallback retained',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5.glb')),
  'baseline human-male quality m5 GLB retained',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5.glb')),
  'baseline human-female quality f5 GLB retained',
);
check(
  !existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m4.glb')),
  'rollback m4 removed',
);
check(
  !existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260920-m1.glb')),
  'rollback m1 removed',
);

check(/if \(input\.vrm\)/.test(output), 'LiveAct factory prefers VrmLiveActAvatarOutput');
check(/GltfLiveActAvatarOutput/.test(output), 'GLB adapter remains as fallback');
check(/VRMLoaderPlugin/.test(studio), 'studio uses existing VRMLoaderPlugin');

const MESH = {
  'masculine-read':
    '/assets/avatars/species/human-male-quality-20260921-m5-face1.vrm?v=quality5-face2-vrm2',
  'feminine-read':
    '/assets/avatars/species/human-female-quality-20260921-f5-face1.vrm?v=quality5-face2-vrm2',
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
check(
  resolveReplica('human', 'masculine-read')?.includes('human-male-quality-20260921-m5-face1.vrm'),
  'male VRM path',
);
check(
  resolveReplica('human', 'feminine-read')?.includes('human-female-quality-20260921-f5-face1.vrm'),
  'female VRM path',
);
check(resolveReplica('human', 'masculine-read')?.includes('?v='), 'cache-bust query preserved');
check(resolveReplica('human', 'diverse') === undefined, 'diverse no mesh');
check(resolveReplica('human', undefined) === undefined, 'unset no mesh');
check(resolveReplica('elf', 'masculine-read') === undefined, 'elf fail closed');
check(/pathWithoutQuery/.test(domain), 'resolver strips query before ext check');

console.log('species-template-gender-model-preview-check PASS');
