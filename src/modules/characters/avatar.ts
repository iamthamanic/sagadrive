import type {
  CharacterAppearanceDto,
  CharacterAvatarDto,
  CharacterAvatarFormat,
} from './types/character.types';

const DEFAULT_HAIR_COLOR = '#000000';
const DEFAULT_SKIN_TONE = '#F5E6D3';

const racePresets: Readonly<Record<string, string>> = {
  human: 'fantasy-human',
  elf: 'fantasy-elf',
  dwarf: 'fantasy-dwarf',
  halfling: 'fantasy-halfling',
  orc: 'fantasy-orc',
  cyborg: 'scifi-cyborg',
  alien: 'scifi-alien',
};

export const CHARACTER_STUDIO_DEMO_URL = 'https://m3-org.github.io/CharacterStudio/';

export function getAvatarPresetForRace(race: string): string {
  return racePresets[race.trim().toLowerCase()] ?? 'humanoid-neutral';
}

export function normalizeHexColor(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : fallback;
}

export function normalizeAvatarModelUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('/')) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function inferAvatarFormat(modelUrl?: string): CharacterAvatarFormat {
  if (!modelUrl) return 'vrm';
  return modelUrl.toLowerCase().split(/[?#]/, 1)[0].endsWith('.glb') ? 'glb' : 'vrm';
}

export function createCharacterStudioAvatar(input: {
  race: string;
  hairStyle: string;
  clothing: string;
  hairColor: string;
  skinTone: string;
  modelUrl?: string;
}): CharacterAvatarDto {
  const modelUrl = normalizeAvatarModelUrl(input.modelUrl ?? '');

  return {
    schema_version: 1,
    provider: 'm3-character-studio',
    preset: getAvatarPresetForRace(input.race),
    model_format: inferAvatarFormat(modelUrl),
    model_url: modelUrl,
    traits: {
      ...(input.hairStyle ? { hair: input.hairStyle } : {}),
      ...(input.clothing ? { clothing: input.clothing } : {}),
    },
    colors: {
      hair: normalizeHexColor(input.hairColor, DEFAULT_HAIR_COLOR),
      skin: normalizeHexColor(input.skinTone, DEFAULT_SKIN_TONE),
    },
  };
}

export function normalizeCharacterAppearance(
  appearance?: Partial<CharacterAppearanceDto> | null,
): CharacterAppearanceDto {
  return {
    body_size: appearance?.body_size ?? 50,
    height: appearance?.height ?? 50,
    face_features: appearance?.face_features ?? 'default',
    hair_style: appearance?.hair_style ?? 'short',
    hair_color: normalizeHexColor(appearance?.hair_color ?? DEFAULT_HAIR_COLOR, DEFAULT_HAIR_COLOR),
    skin_tone: normalizeHexColor(appearance?.skin_tone ?? DEFAULT_SKIN_TONE, DEFAULT_SKIN_TONE),
    clothing: appearance?.clothing ?? 'casual',
    avatar: appearance?.avatar,
  };
}
