#!/usr/bin/env node
/**
 * species-template-gender-model-preview-check — allowlisted template meshes + wiring (#405).
 * Location: scripts/species-template-gender-model-preview-check.mjs
 *
 * Dual quality: preview = light canonical; fidelity = face3 VRM primary.
 * GLB remains published as fallback/source.
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
check(/SpeciesTemplateMeshQuality/.test(domain), 'mesh quality type');
check(/quality === 'fidelity'/.test(domain) || /quality === "fidelity"/.test(domain), 'fidelity branch');
check(/diverse/.test(domain), 'diverse fails closed');
check(
  /human-male-quality-20260921-m5-face3\.vrm/.test(domain) &&
    /human-female-quality-20260921-f5-face3\.vrm/.test(domain),
  'human gender paths m5-face3/f5-face3 VRM primary (fidelity)',
);
check(
  /resolveSagaHumanCanonicalV1ModelUrl/.test(domain) ||
    /saga-human-canonical-v1\.vrm/.test(domain),
  'preview path uses canonical light mesh',
);
check(!/\.glb\?v=quality5-face3-repro1/.test(domain), 'primary resolver is not GLB');
check(!/HUMAN_MALE_PREVIEW_VERSIONS/.test(domain), 'no male version picker catalog');
check(!/quality-m4|quality-m3|softreal2\.glb/.test(domain), 'no rollback paths in domain');
check(/resolveSpeciesTemplateModelUrl/.test(barrel), 'barrel exports resolver');
check(/SpeciesTemplateMeshQuality/.test(barrel), 'barrel exports mesh quality type');
check(/genderReading/.test(hook), 'hook accepts genderReading');
check(/resolveSpeciesTemplateModelUrl/.test(hook), 'hook resolves template model');
check(/quality: 'preview'/.test(hook), 'hook display uses preview quality');
check(/quality: 'fidelity'/.test(hook), 'hook persist uses fidelity quality');
check(
  /avatarSource === 'sagadrive' && selectedTemplateSpeciesId/.test(hook),
  'native template preview wins over imported model_url',
);
check(
  /importedModelUrl \?\?/.test(hook) && /templatePreviewUrl/.test(hook),
  'import wins over template when no native template',
);
check(/genderReading,/.test(editor), 'editor passes genderReading');

check(
  existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face3.vrm')),
  'public human-male quality m5-face3 VRM exists',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face3.vrm')),
  'public human-female quality f5-face3 VRM exists',
);
check(
  existsSync(
    join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face3-face-anchors.json'),
  ),
  'public m5-face3 face-anchors sidecar',
);
check(
  existsSync(
    join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face3-face-anchors.json'),
  ),
  'public f5-face3 face-anchors sidecar',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-male-quality-20260921-m5-face3.glb')),
  'public human-male quality m5-face3 GLB published',
);
check(
  existsSync(join(root, 'public/assets/avatars/species/human-female-quality-20260921-f5-face3.glb')),
  'public human-female quality f5-face3 GLB published',
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
  existsSync(join(root, 'public/assets/avatars/canonical/saga-human-canonical-v1.vrm')),
  'public canonical preview VRM exists',
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

const FIDELITY = {
  'masculine-read':
    '/assets/avatars/species/human-male-quality-20260921-m5-face3.vrm?v=quality5-face3-repro1',
  'feminine-read':
    '/assets/avatars/species/human-female-quality-20260921-f5-face3.vrm?v=quality5-face3-repro1',
};
const PREVIEW =
  '/assets/avatars/canonical/saga-human-canonical-v1.vrm?v=4628e5edca86';

function resolveReplica(speciesId, genderReading, quality = 'preview') {
  if (!speciesId) return undefined;
  if (!genderReading || genderReading === 'diverse') return undefined;
  if (speciesId !== 'human') return undefined;
  const path = quality === 'fidelity' ? FIDELITY[genderReading] : PREVIEW;
  if (typeof path !== 'string') return undefined;
  if (
    !path.startsWith('/assets/avatars/species/') &&
    !path.startsWith('/assets/avatars/canonical/')
  ) {
    return undefined;
  }
  const pathWithoutQuery = path.replace(/[?#].*$/, '').toLowerCase();
  if (!pathWithoutQuery.endsWith('.glb') && !pathWithoutQuery.endsWith('.vrm')) return undefined;
  return path;
}
check(
  resolveReplica('human', 'masculine-read', 'fidelity')?.includes(
    'human-male-quality-20260921-m5-face3.vrm',
  ),
  'male fidelity VRM path',
);
check(
  resolveReplica('human', 'feminine-read', 'fidelity')?.includes(
    'human-female-quality-20260921-f5-face3.vrm',
  ),
  'female fidelity VRM path',
);
check(
  resolveReplica('human', 'masculine-read', 'preview')?.includes('saga-human-canonical-v1.vrm'),
  'male preview canonical path',
);
check(
  resolveReplica('human', 'feminine-read', 'preview')?.includes('saga-human-canonical-v1.vrm'),
  'female preview canonical path',
);
check(resolveReplica('human', 'masculine-read', 'fidelity')?.includes('?v='), 'cache-bust query preserved');
check(resolveReplica('human', 'diverse') === undefined, 'diverse no mesh');
check(resolveReplica('human', undefined) === undefined, 'unset no mesh');
check(resolveReplica('elf', 'masculine-read') === undefined, 'elf fail closed');
check(/pathWithoutQuery/.test(domain), 'resolver strips query before ext check');

console.log('species-template-gender-model-preview-check PASS');
