import type { CharacterAvatarDto, CharacterAvatarFormat } from '../types/character.types';
import { normalizeAvatarModelUrl, normalizeSafeUrl } from '../avatar';

export interface AvatarAssetManifest {
  id: string;
  format: CharacterAvatarFormat;
  selfHostedPath: string;
  fallbackUrl: string;
  displayName: string;
  modelScale: number;
  materialHints: {
    skin: readonly string[];
    hair: readonly string[];
    clothing: readonly string[];
  };
}

const CC0_SOURCE = 'https://raw.githubusercontent.com/MJMoonbow/VRMavatars/main/';

const sharedMaterialHints = {
  skin: ['skin', 'face', 'body', 'arm', 'leg'],
  hair: ['hair', 'eyebrow'],
  clothing: ['cloth', 'clothes', 'outfit', 'top', 'shirt', 'robe', 'armor', 'jacket', 'hoodie', 'pants'],
} as const;

export const avatarAssetManifests: Readonly<Record<string, AvatarAssetManifest>> = {
  'humanoid-neutral': {
    id: 'humanoid-neutral',
    format: 'vrm',
    selfHostedPath: 'neutral.vrm',
    fallbackUrl: `${CC0_SOURCE}skinnie1_5.vrm`,
    displayName: 'Neutral Humanoid',
    modelScale: 1,
    materialHints: sharedMaterialHints,
  },
  'fantasy-human': {
    id: 'fantasy-human',
    format: 'vrm',
    selfHostedPath: 'human.vrm',
    fallbackUrl: `${CC0_SOURCE}skinnie1_5.vrm`,
    displayName: 'Human',
    modelScale: 1,
    materialHints: sharedMaterialHints,
  },
  'fantasy-elf': {
    id: 'fantasy-elf',
    format: 'vrm',
    selfHostedPath: 'elf.vrm',
    fallbackUrl: `${CC0_SOURCE}skinnie3_1.vrm`,
    displayName: 'Elf',
    modelScale: 1.02,
    materialHints: sharedMaterialHints,
  },
  'fantasy-dwarf': {
    id: 'fantasy-dwarf',
    format: 'vrm',
    selfHostedPath: 'dwarf.vrm',
    fallbackUrl: `${CC0_SOURCE}skinnie4.vrm`,
    displayName: 'Dwarf',
    modelScale: 0.94,
    materialHints: sharedMaterialHints,
  },
  'fantasy-halfling': {
    id: 'fantasy-halfling',
    format: 'vrm',
    selfHostedPath: 'halfling.vrm',
    fallbackUrl: `${CC0_SOURCE}skinnie4.vrm`,
    displayName: 'Halfling',
    modelScale: 0.88,
    materialHints: sharedMaterialHints,
  },
  'fantasy-orc': {
    id: 'fantasy-orc',
    format: 'vrm',
    selfHostedPath: 'orc.vrm',
    fallbackUrl: 'https://raw.githubusercontent.com/MJMoonbow/VRMavatars/main/fantasy%C2%B4/orcs/Orc%201.vrm',
    displayName: 'Orc',
    modelScale: 1.04,
    materialHints: sharedMaterialHints,
  },
  'scifi-cyborg': {
    id: 'scifi-cyborg',
    format: 'vrm',
    selfHostedPath: 'cyborg.vrm',
    fallbackUrl: `${CC0_SOURCE}skinnie3_1.vrm`,
    displayName: 'Cyborg',
    modelScale: 1,
    materialHints: sharedMaterialHints,
  },
  'scifi-alien': {
    id: 'scifi-alien',
    format: 'vrm',
    selfHostedPath: 'alien.vrm',
    fallbackUrl: `${CC0_SOURCE}skinnie1_5.vrm`,
    displayName: 'Alien',
    modelScale: 1.03,
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
