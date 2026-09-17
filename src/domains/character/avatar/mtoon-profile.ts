/**
 * SagaDrive MToon visual style profile v1 — pure domain (no Three / React).
 * Location: src/domains/character/avatar/mtoon-profile.ts
 *
 * Central allowlisted render contract for lighting, materials, outline, and
 * performance presets. Runtime applies this profile; screens must not fork style.
 */

export const MTOON_PROFILE_VERSION = 'SagaDriveMToonProfileV1' as const;

export const MTOON_MATERIAL_CLASSES = [
  'skin',
  'hair',
  'cloth',
  'leather',
  'metal',
  'eyes',
  'cybernetic',
] as const;

export type MtoonMaterialClass = (typeof MTOON_MATERIAL_CLASSES)[number];

export type MtoonPerformancePreset = 'desktop' | 'mobile';

export type MtoonRenderPath = 'mtoon' | 'pbr-fallback';

export interface MtoonLightRig {
  hemisphereSky: string;
  hemisphereGround: string;
  hemisphereIntensity: number;
  keyColor: string;
  keyIntensity: number;
  keyPosition: readonly [number, number, number];
  fillColor: string;
  fillIntensity: number;
  fillPosition: readonly [number, number, number];
  rimColor: string;
  rimIntensity: number;
  rimPosition: readonly [number, number, number];
  exposure: number;
  shadowMapSize: number;
  /** Soft shadow band bias hint for toon readability (documentation / applier). */
  shadowBias: number;
}

export interface MtoonMaterialClassProfile {
  classId: MtoonMaterialClass;
  labelDe: string;
  /** Name/hint tokens used to classify materials (allowlisted). */
  nameHints: readonly string[];
  shadingToonyFactor: number;
  shadingShiftFactor: number;
  shadeColorMultiply: number;
  parametricRimStrength: number;
  outlineEnabled: boolean;
  outlineWidthFactor: number;
  /** PBR fallback when MToon is unavailable. */
  pbrRoughness: number;
  pbrMetalness: number;
}

export interface MtoonOutlinePolicy {
  mode: 'screenCoordinates';
  defaultWidthFactor: number;
  color: string;
  /** Classes that never receive outline (sorting / artifact avoidance). */
  disabledClasses: readonly MtoonMaterialClass[];
}

export interface MtoonPerformanceProfile {
  preset: MtoonPerformancePreset;
  maxPixelRatio: number;
  shadowMapSize: number;
  antialias: boolean;
  rimIntensityScale: number;
  outlineWidthScale: number;
}

export interface SagaDriveMToonProfileV1 {
  contractVersion: typeof MTOON_PROFILE_VERSION;
  preferredPath: 'mtoon';
  fallbackPath: 'pbr-fallback';
  background: string;
  fogNear: number;
  fogFar: number;
  light: MtoonLightRig;
  outline: MtoonOutlinePolicy;
  materials: Readonly<Record<MtoonMaterialClass, MtoonMaterialClassProfile>>;
  performance: Readonly<Record<MtoonPerformancePreset, MtoonPerformanceProfile>>;
}

export interface MtoonStyleCompatibility {
  path: MtoonRenderPath;
  /** Non-blocking DE hint for imports with limited style support. */
  noticeDe: string | null;
}

const MATERIAL_PROFILES: Record<MtoonMaterialClass, MtoonMaterialClassProfile> = {
  skin: {
    classId: 'skin',
    labelDe: 'Haut',
    nameHints: ['skin', 'face', 'body', 'arm', 'leg', 'flesh'],
    shadingToonyFactor: 0.85,
    shadingShiftFactor: -0.12,
    shadeColorMultiply: 0.55,
    parametricRimStrength: 0.18,
    outlineEnabled: true,
    outlineWidthFactor: 0.0025,
    pbrRoughness: 0.72,
    pbrMetalness: 0.02,
  },
  hair: {
    classId: 'hair',
    labelDe: 'Haare',
    nameHints: ['hair', 'eyebrow', 'brow', 'lash'],
    shadingToonyFactor: 0.9,
    shadingShiftFactor: -0.08,
    shadeColorMultiply: 0.4,
    parametricRimStrength: 0.22,
    outlineEnabled: true,
    outlineWidthFactor: 0.0018,
    pbrRoughness: 0.55,
    pbrMetalness: 0.05,
  },
  cloth: {
    classId: 'cloth',
    labelDe: 'Stoff',
    nameHints: ['cloth', 'clothes', 'outfit', 'top', 'shirt', 'robe', 'jacket', 'hoodie', 'pants', 'dress'],
    shadingToonyFactor: 0.8,
    shadingShiftFactor: -0.05,
    shadeColorMultiply: 0.5,
    parametricRimStrength: 0.12,
    outlineEnabled: true,
    outlineWidthFactor: 0.0022,
    pbrRoughness: 0.78,
    pbrMetalness: 0.04,
  },
  leather: {
    classId: 'leather',
    labelDe: 'Leder',
    nameHints: ['leather', 'belt', 'boot', 'strap'],
    shadingToonyFactor: 0.75,
    shadingShiftFactor: -0.02,
    shadeColorMultiply: 0.45,
    parametricRimStrength: 0.15,
    outlineEnabled: true,
    outlineWidthFactor: 0.002,
    pbrRoughness: 0.62,
    pbrMetalness: 0.08,
  },
  metal: {
    classId: 'metal',
    labelDe: 'Metall',
    nameHints: ['metal', 'armor', 'steel', 'iron', 'plate', 'chain'],
    shadingToonyFactor: 0.55,
    shadingShiftFactor: 0.05,
    shadeColorMultiply: 0.35,
    parametricRimStrength: 0.35,
    outlineEnabled: true,
    outlineWidthFactor: 0.0015,
    pbrRoughness: 0.35,
    pbrMetalness: 0.85,
  },
  eyes: {
    classId: 'eyes',
    labelDe: 'Augen',
    nameHints: ['eye', 'eyes', 'iris', 'sclera', 'pupil'],
    shadingToonyFactor: 0.95,
    shadingShiftFactor: -0.2,
    shadeColorMultiply: 0.7,
    parametricRimStrength: 0.08,
    outlineEnabled: false,
    outlineWidthFactor: 0,
    pbrRoughness: 0.25,
    pbrMetalness: 0.05,
  },
  cybernetic: {
    classId: 'cybernetic',
    labelDe: 'Cybernetics',
    nameHints: ['cyber', 'synth', 'robot', 'chrome', 'implant', 'visior'],
    shadingToonyFactor: 0.5,
    shadingShiftFactor: 0.08,
    shadeColorMultiply: 0.3,
    parametricRimStrength: 0.45,
    outlineEnabled: true,
    outlineWidthFactor: 0.0012,
    pbrRoughness: 0.28,
    pbrMetalness: 0.92,
  },
};

export function createSagaDriveMToonProfileV1(): SagaDriveMToonProfileV1 {
  return {
    contractVersion: MTOON_PROFILE_VERSION,
    preferredPath: 'mtoon',
    fallbackPath: 'pbr-fallback',
    background: '#09111F',
    fogNear: 8,
    fogFar: 18,
    light: {
      hemisphereSky: '#DDEBFF',
      hemisphereGround: '#101828',
      hemisphereIntensity: 1.85,
      keyColor: '#FFF4DE',
      keyIntensity: 3.6,
      keyPosition: [2.5, 4.5, 4],
      fillColor: '#B8C7E0',
      fillIntensity: 1.1,
      fillPosition: [-2.2, 2.0, 2.5],
      rimColor: '#5EA7FF',
      rimIntensity: 2.0,
      rimPosition: [-3, 2.5, -4],
      exposure: 1.02,
      shadowMapSize: 1024,
      shadowBias: -0.0002,
    },
    outline: {
      mode: 'screenCoordinates',
      defaultWidthFactor: 0.0025,
      color: '#1A1520',
      disabledClasses: ['eyes'],
    },
    materials: MATERIAL_PROFILES,
    performance: {
      desktop: {
        preset: 'desktop',
        maxPixelRatio: 2,
        shadowMapSize: 1024,
        antialias: true,
        rimIntensityScale: 1,
        outlineWidthScale: 1,
      },
      mobile: {
        preset: 'mobile',
        maxPixelRatio: 1.5,
        shadowMapSize: 512,
        antialias: false,
        rimIntensityScale: 0.75,
        outlineWidthScale: 0.85,
      },
    },
  };
}

export function classifyMtoonMaterialClass(
  materialOrMeshName: string,
  profile: SagaDriveMToonProfileV1 = createSagaDriveMToonProfileV1(),
): MtoonMaterialClass {
  const normalized = materialOrMeshName.toLowerCase();
  // Prefer more specific classes before broad ones (metal/cyber before cloth/skin).
  const order: MtoonMaterialClass[] = [
    'eyes',
    'cybernetic',
    'metal',
    'leather',
    'hair',
    'cloth',
    'skin',
  ];
  for (const classId of order) {
    if (profile.materials[classId].nameHints.some((hint) => normalized.includes(hint))) {
      return classId;
    }
  }
  return 'cloth';
}

export function resolveMtoonPerformancePreset(
  hint?: { isMobile?: boolean; maxTouchPoints?: number },
): MtoonPerformancePreset {
  if (hint?.isMobile === true) return 'mobile';
  if (typeof hint?.maxTouchPoints === 'number' && hint.maxTouchPoints > 1) return 'mobile';
  return 'desktop';
}

/**
 * Deterministic path selection: MToon when evidence says so, else PBR fallback.
 * Client cannot force MToon without evidence.
 */
export function resolveMtoonRenderPath(input: {
  hasMtoonMaterials: boolean;
  isImportModel?: boolean;
}): MtoonStyleCompatibility {
  if (input.hasMtoonMaterials) {
    return { path: 'mtoon', noticeDe: null };
  }
  return {
    path: 'pbr-fallback',
    noticeDe: input.isImportModel
      ? 'Dieses Import-Modell unterstützt MToon nur eingeschränkt — SagaDrive nutzt den kontrollierten PBR-Fallback.'
      : 'MToon-Materialien fehlen — SagaDrive nutzt den kontrollierten PBR-Fallback.',
  };
}

export function listMtoonMaterialClassIds(): readonly MtoonMaterialClass[] {
  return MTOON_MATERIAL_CLASSES;
}
