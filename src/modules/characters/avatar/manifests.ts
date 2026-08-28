import type { CharacterAvatarDto, CharacterAvatarFormat } from '../types/character.types';
import { normalizeAvatarModelUrl, normalizeSafeUrl } from '../avatar';

export type AvatarAssetRepresentation =
  | { kind: 'species-specific' }
  | { kind: 'neutral-fallback'; reason: string };

export interface AvatarAssetProvenance {
  sourceRepository: string;
  sourceOwner: string;
  sourceCommit: string;
  assetPath: string;
  licenseSpdx: 'CC0-1.0';
  licenseUrl: string;
  allowedUse: 'commercial-and-noncommercial';
}

export interface AvatarAssetManifest {
  id: string;
  format: CharacterAvatarFormat;
  selfHostedPath: string;
  fallbackUrl: string;
  displayName: string;
  modelScale: number;
  representation: AvatarAssetRepresentation;
  provenance: AvatarAssetProvenance;
  materialHints: {
    skin: readonly string[];
    hair: readonly string[];
    clothing: readonly string[];
  };
}

const VRM_AVATARS_SOURCE = {
  owner: 'MJMoonbow',
  repository: 'https://github.com/MJMoonbow/VRMavatars',
  commit: '6af59479c61ab13b6caa96a9b915498489f2b9cd',
  licenseSpdx: 'CC0-1.0' as const,
  allowedUse: 'commercial-and-noncommercial' as const,
};

const VRM_AVATARS_RAW_BASE = `https://raw.githubusercontent.com/MJMoonbow/VRMavatars/${VRM_AVATARS_SOURCE.commit}/`;
const VRM_AVATARS_LICENSE_URL = `${VRM_AVATARS_SOURCE.repository}/blob/${VRM_AVATARS_SOURCE.commit}/LICENSE`;

const sharedMaterialHints = {
  skin: ['skin', 'face', 'body', 'arm', 'leg'],
  hair: ['hair', 'eyebrow'],
  clothing: ['cloth', 'clothes', 'outfit', 'top', 'shirt', 'robe', 'armor', 'jacket', 'hoodie', 'pants'],
} as const;

function encodeRepositoryPath(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function catalogAsset(assetPath: string): Pick<AvatarAssetManifest, 'fallbackUrl' | 'provenance'> {
  return {
    fallbackUrl: `${VRM_AVATARS_RAW_BASE}${encodeRepositoryPath(assetPath)}`,
    provenance: {
      sourceRepository: VRM_AVATARS_SOURCE.repository,
      sourceOwner: VRM_AVATARS_SOURCE.owner,
      sourceCommit: VRM_AVATARS_SOURCE.commit,
      assetPath,
      licenseSpdx: VRM_AVATARS_SOURCE.licenseSpdx,
      licenseUrl: VRM_AVATARS_LICENSE_URL,
      allowedUse: VRM_AVATARS_SOURCE.allowedUse,
    },
  };
}

export const avatarAssetManifests: Readonly<Record<string, AvatarAssetManifest>> = {
  'humanoid-neutral': {
    id: 'humanoid-neutral',
    format: 'vrm',
    selfHostedPath: 'neutral.vrm',
    ...catalogAsset('skinnie1_5.vrm'),
    displayName: 'Neutral Humanoid',
    modelScale: 1,
    representation: {
      kind: 'neutral-fallback',
      reason: 'Allgemeiner CC0-Humanoid als sicherer Fallback für unbekannte oder noch nicht spezialisierte Spezies.',
    },
    materialHints: sharedMaterialHints,
  },
  'fantasy-human': {
    id: 'fantasy-human',
    format: 'vrm',
    selfHostedPath: 'human.vrm',
    ...catalogAsset('skinnie1_5.vrm'),
    displayName: 'Human',
    modelScale: 1,
    representation: {
      kind: 'neutral-fallback',
      reason: 'Der geprüfte Quellkatalog weist dieses Modell als Humanoid, nicht ausdrücklich als Mensch aus.',
    },
    materialHints: sharedMaterialHints,
  },
  'fantasy-elf': {
    id: 'fantasy-elf',
    format: 'vrm',
    selfHostedPath: 'elf.vrm',
    ...catalogAsset('skinnie3_1.vrm'),
    displayName: 'Elf',
    modelScale: 1.02,
    representation: {
      kind: 'neutral-fallback',
      reason: 'Noch kein lizenzgeprüftes Elf-Spezialasset im kuratierten Katalog; verwendet einen CC0-Humanoid.',
    },
    materialHints: sharedMaterialHints,
  },
  'fantasy-dwarf': {
    id: 'fantasy-dwarf',
    format: 'vrm',
    selfHostedPath: 'dwarf.vrm',
    ...catalogAsset('skinnie4.vrm'),
    displayName: 'Dwarf',
    modelScale: 0.94,
    representation: {
      kind: 'neutral-fallback',
      reason: 'Noch kein lizenzgeprüftes Zwerg-Spezialasset im kuratierten Katalog; verwendet einen CC0-Humanoid.',
    },
    materialHints: sharedMaterialHints,
  },
  'fantasy-halfling': {
    id: 'fantasy-halfling',
    format: 'vrm',
    selfHostedPath: 'halfling.vrm',
    ...catalogAsset('skinnie4.vrm'),
    displayName: 'Halfling',
    modelScale: 0.88,
    representation: {
      kind: 'neutral-fallback',
      reason: 'Noch kein lizenzgeprüftes Halbling-Spezialasset im kuratierten Katalog; verwendet einen CC0-Humanoid.',
    },
    materialHints: sharedMaterialHints,
  },
  'fantasy-orc': {
    id: 'fantasy-orc',
    format: 'vrm',
    selfHostedPath: 'orc.vrm',
    ...catalogAsset('fantasy´/orcs/Orc 1.vrm'),
    displayName: 'Orc',
    modelScale: 1.04,
    representation: { kind: 'species-specific' },
    materialHints: sharedMaterialHints,
  },
  'scifi-cyborg': {
    id: 'scifi-cyborg',
    format: 'vrm',
    selfHostedPath: 'cyborg.vrm',
    ...catalogAsset('skinnie3_1.vrm'),
    displayName: 'Cyborg',
    modelScale: 1,
    representation: {
      kind: 'neutral-fallback',
      reason: 'Noch kein lizenzgeprüftes Cyborg-Spezialasset mit direkter .vrm/.glb-Quelle; verwendet einen CC0-Humanoid.',
    },
    materialHints: sharedMaterialHints,
  },
  'scifi-alien': {
    id: 'scifi-alien',
    format: 'vrm',
    selfHostedPath: 'alien.vrm',
    ...catalogAsset('skinnie1_5.vrm'),
    displayName: 'Alien',
    modelScale: 1.03,
    representation: {
      kind: 'neutral-fallback',
      reason: 'Noch kein lizenzgeprüftes Alien-Spezialasset mit direkter .vrm/.glb-Quelle; verwendet einen CC0-Humanoid.',
    },
    materialHints: sharedMaterialHints,
  },
};

function joinAssetUrl(baseUrl: string, path: string): string | undefined {
  const normalizedBase = normalizeSafeUrl(baseUrl);
  if (!normalizedBase) return undefined;

  if (normalizedBase.startsWith('/')) {
    return `${normalizedBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  try {
    return new URL(path.replace(/^\//, ''), normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`).toString();
  } catch {
    return undefined;
  }
}

export function getAvatarAssetManifest(preset: string): AvatarAssetManifest {
  return avatarAssetManifests[preset] ?? avatarAssetManifests['humanoid-neutral'];
}

export function resolveAvatarModelUrl(avatar: CharacterAvatarDto): string | undefined {
  const explicitModelUrl = normalizeAvatarModelUrl(avatar.model_url ?? '');
  if (explicitModelUrl) return explicitModelUrl;

  const manifest = getAvatarAssetManifest(avatar.preset);
  const selfHostedBase = import.meta.env.VITE_AVATAR_ASSET_BASE_URL as string | undefined;
  if (selfHostedBase) {
    const selfHostedUrl = joinAssetUrl(selfHostedBase, manifest.selfHostedPath);
    const normalizedSelfHostedUrl = normalizeAvatarModelUrl(selfHostedUrl ?? '');
    if (normalizedSelfHostedUrl) return normalizedSelfHostedUrl;
  }

  return normalizeAvatarModelUrl(manifest.fallbackUrl);
}
