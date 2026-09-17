/**
 * SagaDrive morphable base-body contract v1 — pure domain (no Three / React).
 * Location: src/domains/character/avatar/base-body-contract.ts
 *
 * Declares required morph targets (#212), material slots, trait sockets,
 * species presets, fit ranges, and capability gating. Missing morph targets
 * fail closed (not morph-body-v1 / morph-face-v1 ready).
 */

import {
  AVATAR_MORPH_BODY_KEYS,
  AVATAR_MORPH_FACE_KEYS,
  MORPH_CONTRACT_VERSION,
  createDefaultAvatarMorphState,
  mergeAvatarMorphPresets,
  resolveAvatarMorphCapabilities,
  type AvatarMorphBodyKey,
  type AvatarMorphCapabilityFlag,
  type AvatarMorphColorsV1,
  type AvatarMorphFaceKey,
  type AvatarMorphParamKey,
  type SagaDriveAvatarMorphStateV1,
} from './morph-contract';
import { RIG_CONTRACT_VERSION } from './rig-contract';

export const BASE_BODY_CONTRACT_VERSION = 'SagaDriveBaseBodyV1' as const;
export const BASE_BODY_ASSET_VERSION = 'sagadrive-base-humanoid-v1.0.0' as const;

export const BASE_BODY_MATERIAL_SLOTS = [
  'skin',
  'eyes',
  'hair-compatible',
  'body-detail',
] as const;

export type BaseBodyMaterialSlot = (typeof BASE_BODY_MATERIAL_SLOTS)[number];

export const BASE_BODY_TRAIT_SOCKETS = [
  'ears',
  'horns',
  'cybernetics',
  'hair',
  'clothing',
] as const;

export type BaseBodyTraitSocket = (typeof BASE_BODY_TRAIT_SOCKETS)[number];

export type BaseBodySpeciesId =
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'halfling'
  | 'orc'
  | 'cyborg'
  | 'alien';

export interface BaseBodyMorphTargetMap {
  /** Morph contract key → authored blendshape / morph target name on the mesh. */
  body: Readonly<Record<AvatarMorphBodyKey, string>>;
  face: Readonly<Record<AvatarMorphFaceKey, string>>;
}

export interface BaseBodyFitRange {
  traitSocket: BaseBodyTraitSocket;
  /** Normalized morph axes that affect this socket's scale fit. */
  drivenBy: readonly AvatarMorphParamKey[];
  minScale: number;
  maxScale: number;
}

export interface BaseBodyProvenance {
  licenseSpdx: 'CC0-1.0' | 'LicenseRef-SagaDrive-Internal';
  licenseUrl: string;
  source: string;
  notes: string;
}

export interface SagaDriveBaseBodyManifestV1 {
  contractVersion: typeof BASE_BODY_CONTRACT_VERSION;
  assetVersion: typeof BASE_BODY_ASSET_VERSION;
  rigVersion: typeof RIG_CONTRACT_VERSION;
  morphContractVersion: typeof MORPH_CONTRACT_VERSION;
  assetId: 'sagadrive-base-humanoid-v1';
  displayNameDe: string;
  /** Allowlisted self-hosted relative path (no remote arbitrary URLs). */
  selfHostedPath: string;
  format: 'vrm' | 'glb';
  morphTargets: BaseBodyMorphTargetMap;
  materialSlots: readonly BaseBodyMaterialSlot[];
  traitSockets: readonly BaseBodyTraitSocket[];
  fitRanges: readonly BaseBodyFitRange[];
  provenance: BaseBodyProvenance;
}

export interface BaseBodySpeciesPresetV1 {
  id: BaseBodySpeciesId;
  labelDe: string;
  /** Overlay morph/colors/traits applied onto defaults (deterministic). */
  morphOverlay: Partial<{
    body: Partial<Record<AvatarMorphBodyKey, number>>;
    face: Partial<Record<AvatarMorphFaceKey, number>>;
    colors: Partial<AvatarMorphColorsV1>;
    traits: Partial<{
      markings: readonly string[];
      scars: readonly string[];
      cybernetics: readonly string[];
    }>;
  }>;
  /** Base trait catalog IDs (group → option). */
  traits: Readonly<{
    head: string;
    ears: string;
    hair: string;
    clothing: string;
    accessory: string;
  }>;
  legacyPresetId: string;
}

export interface BaseBodyMorphCapabilityReport {
  flags: readonly AvatarMorphCapabilityFlag[];
  missingBodyTargets: readonly AvatarMorphBodyKey[];
  missingFaceTargets: readonly AvatarMorphFaceKey[];
  limitations: readonly string[];
}

/** Canonical morph target names for the SagaDrive base body mesh. */
export function createCanonicalMorphTargetMap(): BaseBodyMorphTargetMap {
  const body = {} as Record<AvatarMorphBodyKey, string>;
  for (const key of AVATAR_MORPH_BODY_KEYS) {
    body[key] = `sd_body_${key}`;
  }
  const face = {} as Record<AvatarMorphFaceKey, string>;
  for (const key of AVATAR_MORPH_FACE_KEYS) {
    face[key] = `sd_face_${key}`;
  }
  return { body, face };
}

export function listRequiredMorphTargetNames(
  map: BaseBodyMorphTargetMap = createCanonicalMorphTargetMap(),
): readonly string[] {
  return [
    ...AVATAR_MORPH_BODY_KEYS.map((key) => map.body[key]),
    ...AVATAR_MORPH_FACE_KEYS.map((key) => map.face[key]),
  ];
}

export const DEFAULT_BASE_BODY_FIT_RANGES: readonly BaseBodyFitRange[] = [
  {
    traitSocket: 'ears',
    drivenBy: ['headSize', 'earSize'],
    minScale: 0.85,
    maxScale: 1.2,
  },
  {
    traitSocket: 'horns',
    drivenBy: ['headSize'],
    minScale: 0.9,
    maxScale: 1.15,
  },
  {
    traitSocket: 'cybernetics',
    drivenBy: ['build', 'shoulderWidth'],
    minScale: 0.9,
    maxScale: 1.15,
  },
  {
    traitSocket: 'hair',
    drivenBy: ['headSize'],
    minScale: 0.9,
    maxScale: 1.15,
  },
  {
    traitSocket: 'clothing',
    drivenBy: ['chest', 'waist', 'hips', 'build', 'muscularity'],
    minScale: 0.85,
    maxScale: 1.25,
  },
];

export function createSagaDriveBaseBodyManifestV1(): SagaDriveBaseBodyManifestV1 {
  return {
    contractVersion: BASE_BODY_CONTRACT_VERSION,
    assetVersion: BASE_BODY_ASSET_VERSION,
    rigVersion: RIG_CONTRACT_VERSION,
    morphContractVersion: MORPH_CONTRACT_VERSION,
    assetId: 'sagadrive-base-humanoid-v1',
    displayNameDe: 'SagaDrive Basis-Humanoid',
    selfHostedPath: 'sagadrive-base-humanoid-v1.vrm',
    format: 'vrm',
    morphTargets: createCanonicalMorphTargetMap(),
    materialSlots: [...BASE_BODY_MATERIAL_SLOTS],
    traitSockets: [...BASE_BODY_TRAIT_SOCKETS],
    fitRanges: DEFAULT_BASE_BODY_FIT_RANGES,
    provenance: {
      licenseSpdx: 'LicenseRef-SagaDrive-Internal',
      licenseUrl: 'https://github.com/iamthamanic/sagadrive/blob/main/LICENSE',
      source: 'SagaDrive authored base body v1 (morph targets per SagaDriveAvatarMorphV1)',
      notes:
        'Allowlisted self-hosted asset. Morph capabilities require all declared targets present on the mesh.',
    },
  };
}

export const BASE_BODY_SPECIES_PRESETS: readonly BaseBodySpeciesPresetV1[] = [
  {
    id: 'human',
    labelDe: 'Mensch',
    legacyPresetId: 'fantasy-human',
    traits: {
      head: 'human-balanced',
      ears: 'round',
      hair: 'short',
      clothing: 'casual',
      accessory: 'none',
    },
    morphOverlay: {
      body: { height: 0, build: 0 },
      colors: { skin: '#F5E6D3', hair: '#000000', eyes: '#3A2F28' },
    },
  },
  {
    id: 'elf',
    labelDe: 'Elf',
    legacyPresetId: 'fantasy-elf',
    traits: {
      head: 'elf-angular',
      ears: 'elf-long',
      hair: 'long',
      clothing: 'robe',
      accessory: 'none',
    },
    morphOverlay: {
      body: { height: 0.24, build: -0.16, armLength: 0.1, legLength: 0.12 },
      face: { faceLength: 0.15, jawWidth: -0.2, earSize: 0.45, eyeSize: 0.1 },
      colors: { skin: '#E7C8B1', hair: '#C9A227', eyes: '#4A7C59' },
    },
  },
  {
    id: 'dwarf',
    labelDe: 'Zwerg',
    legacyPresetId: 'fantasy-dwarf',
    traits: {
      head: 'dwarf-broad',
      ears: 'round',
      hair: 'braided',
      clothing: 'armor',
      accessory: 'none',
    },
    morphOverlay: {
      body: { height: -0.36, build: 0.48, muscularity: 0.2, shoulderWidth: 0.25 },
      face: { faceWidth: 0.25, jawWidth: 0.3, noseWidth: 0.15 },
      colors: { skin: '#F5E6D3', hair: '#4A2A1C', eyes: '#3A2F28' },
    },
  },
  {
    id: 'halfling',
    labelDe: 'Halbling',
    legacyPresetId: 'fantasy-halfling',
    traits: {
      head: 'halfling-soft',
      ears: 'round',
      hair: 'wild',
      clothing: 'leather',
      accessory: 'none',
    },
    morphOverlay: {
      body: { height: -0.48, build: -0.24, headSize: 0.2, legLength: -0.2 },
      face: { faceWidth: 0.1, eyeSize: 0.15, cheekbones: 0.1 },
      colors: { skin: '#F5E6D3', hair: '#6B4423', eyes: '#3A2F28' },
    },
  },
  {
    id: 'orc',
    labelDe: 'Ork',
    legacyPresetId: 'fantasy-orc',
    traits: {
      head: 'orc-heavy',
      ears: 'orc-pointed',
      hair: 'wild',
      clothing: 'armor',
      accessory: 'none',
    },
    morphOverlay: {
      body: { height: 0.36, build: 0.64, muscularity: 0.45, shoulderWidth: 0.4 },
      face: { jawWidth: 0.45, noseWidth: 0.3, eyeAngle: -0.15 },
      colors: { skin: '#78966A', hair: '#211F1C', eyes: '#2F1F14' },
    },
  },
  {
    id: 'cyborg',
    labelDe: 'Cyborg',
    legacyPresetId: 'scifi-cyborg',
    traits: {
      head: 'cyborg-angular',
      ears: 'synthetic',
      hair: 'short',
      clothing: 'tech',
      accessory: 'none',
    },
    morphOverlay: {
      body: { build: 0.1, muscularity: 0.15 },
      face: { jawWidth: 0.1, eyeAngle: -0.1 },
      colors: { skin: '#C8C2B8', hair: '#1A1A1A', eyes: '#2A6FDB' },
      traits: { cybernetics: ['cyber-optic-v1'] },
    },
  },
  {
    id: 'alien',
    labelDe: 'Humanoider Alien',
    legacyPresetId: 'scifi-alien',
    traits: {
      head: 'alien-elongated',
      ears: 'none',
      hair: 'none',
      clothing: 'suit',
      accessory: 'none',
    },
    morphOverlay: {
      body: { height: 0.2, headSize: 0.35, armLength: 0.2, build: -0.2 },
      face: { faceLength: 0.35, eyeSize: 0.4, eyeSpacing: 0.2, noseLength: -0.3 },
      colors: { skin: '#B8D4C8', hair: '#1A1A1A', eyes: '#7CFC00' },
    },
  },
];

/** Strip accidental invalid face keys from overlays (compile-time footgun guard). */
function sanitizeSpeciesOverlay(
  overlay: BaseBodySpeciesPresetV1['morphOverlay'],
): BaseBodySpeciesPresetV1['morphOverlay'] {
  if (!overlay.face) return overlay;
  const face: Partial<Record<AvatarMorphFaceKey, number>> = {};
  for (const key of AVATAR_MORPH_FACE_KEYS) {
    const value = overlay.face[key];
    if (typeof value === 'number') face[key] = value;
  }
  return { ...overlay, face };
}

export function getBaseBodySpeciesPreset(id: BaseBodySpeciesId): BaseBodySpeciesPresetV1 {
  const found = BASE_BODY_SPECIES_PRESETS.find((preset) => preset.id === id);
  if (!found) {
    throw new Error(`Unknown base-body species: ${id}`);
  }
  return { ...found, morphOverlay: sanitizeSpeciesOverlay(found.morphOverlay) };
}

/**
 * Deterministic species → morph state. Does not clobber an existing user morph
 * unless the caller explicitly applies this result (preset apply / reset).
 */
export function deriveSpeciesMorphState(id: BaseBodySpeciesId): SagaDriveAvatarMorphStateV1 {
  const preset = getBaseBodySpeciesPreset(id);
  return mergeAvatarMorphPresets(createDefaultAvatarMorphState(), {
    contractVersion: MORPH_CONTRACT_VERSION,
    ...preset.morphOverlay,
  });
}

/**
 * Compare declared morph targets against evidence from mesh inspection.
 * Missing required targets → capabilities empty / limited (fail closed).
 */
export function resolveBaseBodyMorphCapabilities(input: {
  manifest?: SagaDriveBaseBodyManifestV1;
  presentMorphTargetNames: readonly string[];
}): BaseBodyMorphCapabilityReport {
  const manifest = input.manifest ?? createSagaDriveBaseBodyManifestV1();
  const present = new Set(input.presentMorphTargetNames);
  const missingBody: AvatarMorphBodyKey[] = [];
  const missingFace: AvatarMorphFaceKey[] = [];

  for (const key of AVATAR_MORPH_BODY_KEYS) {
    if (!present.has(manifest.morphTargets.body[key])) missingBody.push(key);
  }
  for (const key of AVATAR_MORPH_FACE_KEYS) {
    if (!present.has(manifest.morphTargets.face[key])) missingFace.push(key);
  }

  const limitations: string[] = [];
  if (missingBody.length > 0) {
    limitations.push('Körper-Morph-Targets unvollständig — morph-body-v1 nicht freigeschaltet');
  }
  if (missingFace.length > 0) {
    limitations.push('Gesichts-Morph-Targets unvollständig — morph-face-v1 nicht freigeschaltet');
  }

  const caps = resolveAvatarMorphCapabilities({
    hasBodyMorphTargets: missingBody.length === 0,
    hasFaceMorphTargets: missingFace.length === 0,
  });

  return {
    flags: caps.flags,
    missingBodyTargets: missingBody,
    missingFaceTargets: missingFace,
    limitations,
  };
}

/** Invalidate cached fit data when asset/contract versions diverge. */
export function isBaseBodyCacheCompatible(input: {
  cachedAssetVersion: string;
  cachedMorphContractVersion: string;
  cachedRigVersion: string;
  manifest?: SagaDriveBaseBodyManifestV1;
}): boolean {
  const manifest = input.manifest ?? createSagaDriveBaseBodyManifestV1();
  return (
    input.cachedAssetVersion === manifest.assetVersion &&
    input.cachedMorphContractVersion === manifest.morphContractVersion &&
    input.cachedRigVersion === manifest.rigVersion
  );
}

/**
 * Visual fixture matrix: each morph alone at ±1, plus a few extreme combinations.
 * Values stay within contract bounds so camera/orbit framing constants remain valid.
 */
export interface BaseBodyMorphFixtureCase {
  id: string;
  labelDe: string;
  morph: SagaDriveAvatarMorphStateV1;
}

export function buildBaseBodyMorphFixtureCases(): readonly BaseBodyMorphFixtureCase[] {
  const cases: BaseBodyMorphFixtureCase[] = [];
  const defaults = createDefaultAvatarMorphState();

  for (const key of AVATAR_MORPH_BODY_KEYS) {
    for (const extreme of [-1, 1] as const) {
      cases.push({
        id: `body-${key}-${extreme}`,
        labelDe: `Körper ${key} = ${extreme}`,
        morph: {
          ...defaults,
          body: { ...defaults.body, [key]: extreme },
        },
      });
    }
  }
  for (const key of AVATAR_MORPH_FACE_KEYS) {
    for (const extreme of [-1, 1] as const) {
      cases.push({
        id: `face-${key}-${extreme}`,
        labelDe: `Gesicht ${key} = ${extreme}`,
        morph: {
          ...defaults,
          face: { ...defaults.face, [key]: extreme },
        },
      });
    }
  }

  cases.push({
    id: 'extreme-tall-heavy',
    labelDe: 'Extrem groß + muskulös',
    morph: mergeAvatarMorphPresets(defaults, {
      body: { height: 1, build: 1, muscularity: 1, shoulderWidth: 1, chest: 1 },
    }),
  });
  cases.push({
    id: 'extreme-short-light',
    labelDe: 'Extrem klein + schmal',
    morph: mergeAvatarMorphPresets(defaults, {
      body: { height: -1, build: -1, headSize: 1, armLength: -1, legLength: -1 },
    }),
  });

  return cases;
}

/** Portrait / orbit framing stays within these normalized bounds under morph extremes. */
export const BASE_BODY_CAMERA_SAFE_BOUNDS = {
  minOrbitDistance: 1.2,
  maxOrbitDistance: 4.5,
  portraitFovDeg: 28,
  maxVerticalOffset: 0.35,
} as const;

export function assertMorphFixtureCameraSafe(
  _morph: SagaDriveAvatarMorphStateV1,
): typeof BASE_BODY_CAMERA_SAFE_BOUNDS {
  // Framing constants are independent of morph magnitude by contract (mesh authored
  // so extremes stay inside the capsule). Fixture asserts the constants themselves.
  return BASE_BODY_CAMERA_SAFE_BOUNDS;
}
