import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function fail(message) {
  console.error(`Avatar asset catalog regression check failed: ${message}.`);
  process.exit(1);
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) fail(`missing ${label}`);
}

function rejectMatch(content, pattern, label) {
  if (pattern.test(content)) fail(label);
}

const manifests = read('src/modules/characters/avatar/manifests.ts');
const avatarPresets = read('src/modules/characters/avatar.ts');
const assetDocs = read('docs/avatar assets.md');

const raceMappings = [
  ['human', 'fantasy-human'],
  ['elf', 'fantasy-elf'],
  ['dwarf', 'fantasy-dwarf'],
  ['halfling', 'fantasy-halfling'],
  ['orc', 'fantasy-orc'],
  ['cyborg', 'scifi-cyborg'],
  ['alien', 'scifi-alien'],
];

const manifestOrder = [
  'humanoid-neutral',
  ...raceMappings.map(([, manifestId]) => manifestId),
];

function manifestBlock(manifestId, index) {
  const marker = `'${manifestId}': {`;
  const start = manifests.indexOf(marker);
  if (start < 0) fail(`manifest ${manifestId}`);

  const nextId = manifestOrder[index + 1];
  const end = nextId ? manifests.indexOf(`'${nextId}': {`, start + marker.length) : manifests.indexOf('\n};', start);
  if (end < 0) fail(`manifest boundary ${manifestId}`);
  return manifests.slice(start, end);
}

for (const [race, manifestId] of raceMappings) {
  requireMatch(
    avatarPresets,
    new RegExp(`${race}:\\s*\\{[\\s\\S]*?id:\\s*'${manifestId}'`),
    `${race} -> ${manifestId} preset mapping`,
  );
}

requireMatch(
  avatarPresets,
  /return avatarRacePresets\[race\.trim\(\)\.toLowerCase\(\)\] \?\? neutralPreset/,
  'unknown-race neutral fallback',
);
requireMatch(manifests, /commit: '6af59479c61ab13b6caa96a9b915498489f2b9cd'/, 'pinned VRM source commit');
requireMatch(manifests, /licenseSpdx: 'CC0-1\.0' as const/, 'CC0 SPDX license metadata');
requireMatch(manifests, /allowedUse: 'commercial-and-noncommercial' as const/, 'allowed-use metadata');
requireMatch(manifests, /sourceRepository: VRM_AVATARS_SOURCE\.repository/, 'source repository provenance');
requireMatch(manifests, /sourceCommit: VRM_AVATARS_SOURCE\.commit/, 'source commit provenance');
requireMatch(manifests, /assetPath,/, 'asset-path provenance');
requireMatch(manifests, /licenseUrl: VRM_AVATARS_LICENSE_URL/, 'license URL provenance');
requireMatch(manifests, /VRM_AVATARS_RAW_BASE.*VRM_AVATARS_SOURCE\.commit/, 'commit-pinned remote URL base');
rejectMatch(manifests, /raw\.githubusercontent\.com\/MJMoonbow\/VRMavatars\/main\//, 'mutable main-branch asset URL remains');

for (const [index, manifestId] of manifestOrder.entries()) {
  const block = manifestBlock(manifestId, index);
  requireMatch(block, /format: 'vrm'/, `${manifestId} VRM format`);
  requireMatch(block, /\.\.\.catalogAsset\('[^']+\.vrm'\)/, `${manifestId} catalog asset`);
  requireMatch(block, /representation:/, `${manifestId} representation classification`);
  if (!assetDocs.includes(`\`${manifestId}\``)) fail(`documentation row for ${manifestId}`);
}

const orcBlock = manifestBlock('fantasy-orc', manifestOrder.indexOf('fantasy-orc'));
requireMatch(orcBlock, /catalogAsset\('fantasy´\/orcs\/Orc 1\.vrm'\)/, 'curated Orc asset path');
requireMatch(orcBlock, /representation: \{ kind: 'species-specific' \}/, 'Orc species-specific classification');

for (const manifestId of manifestOrder.filter((id) => id !== 'fantasy-orc')) {
  const block = manifestBlock(manifestId, manifestOrder.indexOf(manifestId));
  requireMatch(block, /kind: 'neutral-fallback'/, `${manifestId} neutral fallback classification`);
  requireMatch(block, /reason: '[^']+'/s, `${manifestId} neutral fallback reason`);
}

requireMatch(
  manifests,
  /return avatarAssetManifests\[preset\] \?\? avatarAssetManifests\['humanoid-neutral'\]/,
  'unknown-preset neutral manifest fallback',
);
requireMatch(manifests, /VITE_AVATAR_ASSET_BASE_URL/, 'self-hosted asset override');
requireMatch(manifests, /return normalizeAvatarModelUrl\(manifest\.fallbackUrl\)/, 'normalized curated remote fallback');
requireMatch(assetDocs, /CC0-1\.0/, 'documented asset license');
requireMatch(assetDocs, /6af59479c61ab13b6caa96a9b915498489f2b9cd/, 'documented source commit');
requireMatch(assetDocs, /Unklare Urheber-, Lizenz- oder Nutzungsrechte.*nicht aufgenommen/s, 'fail-closed catalog admission rule');

console.log('Avatar asset catalog regression check passed.');
