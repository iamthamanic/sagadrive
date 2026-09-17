/**
 * SagaDrive Avatar Morph Contract v1 — pure domain (no Three / React).
 * Location: src/domains/character/avatar/morph-contract.ts
 *
 * Single source of body/face morph keys, ranges, defaults, DE UI metadata,
 * validation, preset merge, and legacy CharacterAvatarDto migration.
 * Capabilities are derived — never accepted from client claims.
 */

import type { CharacterAvatarDto } from '../domain/character.entity';

export const MORPH_CONTRACT_VERSION = 'SagaDriveAvatarMorphV1' as const;

export const AVATAR_MORPH_BODY_KEYS = [
  'height',
  'headSize',
  'shoulderWidth',
  'chest',
  'waist',
  'hips',
  'armLength',
  'legLength',
  'build',
  'muscularity',
] as const;

export const AVATAR_MORPH_FACE_KEYS = [
  'faceWidth',
  'faceLength',
  'jawWidth',
  'chin',
  'cheekbones',
  'noseWidth',
  'noseLength',
  'eyeSize',
  'eyeSpacing',
  'eyeAngle',
  'mouthWidth',
  'lipFullness',
  'earSize',
] as const;

export type AvatarMorphBodyKey = (typeof AVATAR_MORPH_BODY_KEYS)[number];
export type AvatarMorphFaceKey = (typeof AVATAR_MORPH_FACE_KEYS)[number];
export type AvatarMorphParamKey = AvatarMorphBodyKey | AvatarMorphFaceKey;

export type AvatarMorphCapabilityFlag = 'morph-body-v1' | 'morph-face-v1';

export type AvatarMorphParamGroup = 'body' | 'face';

/** Machine-readable field metadata for #215 body/face editors. */
export interface AvatarMorphParamMeta {
  key: AvatarMorphParamKey;
  group: AvatarMorphParamGroup;
  labelDe: string;
  min: -1;
  max: 1;
  default: 0;
  step: number;
}

export type AvatarMorphBodyValues = Readonly<Record<AvatarMorphBodyKey, number>>;
export type AvatarMorphFaceValues = Readonly<Record<AvatarMorphFaceKey, number>>;

export interface AvatarMorphColorsV1 {
  skin: string;
  eyes: string;
  hair: string;
}

/** Trait-ID slots (catalog IDs from #4) — not free-form strings from untrusted UI. */
export interface AvatarMorphTraitSlotsV1 {
  markings: readonly string[];
  scars: readonly string[];
  cybernetics: readonly string[];
}

export interface SagaDriveAvatarMorphStateV1 {
  contractVersion: typeof MORPH_CONTRACT_VERSION;
  body: AvatarMorphBodyValues;
  face: AvatarMorphFaceValues;
  colors: AvatarMorphColorsV1;
  traits: AvatarMorphTraitSlotsV1;
}

export interface AvatarMorphCapabilities {
  flags: readonly AvatarMorphCapabilityFlag[];
}

export interface AvatarMorphValidationResult {
  ok: boolean;
  state: SagaDriveAvatarMorphStateV1;
  /** Unknown keys that were ignored (fail-safe). */
  ignoredKeys: readonly string[];
  /** Human-readable DE reasons when values were clamped/rejected. */
  warnings: readonly string[];
}

const DEFAULT_SKIN = '#F5E6D3';
const DEFAULT_EYES = '#3A2F28';
const DEFAULT_HAIR = '#000000';
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const MAX_TRAIT_IDS = 16;
const TRAIT_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const BODY_LABELS_DE: Readonly<Record<AvatarMorphBodyKey, string>> = {
  height: 'Körpergröße',
  headSize: 'Kopfgröße',
  shoulderWidth: 'Schulterbreite',
  chest: 'Brust',
  waist: 'Taille',
  hips: 'Hüfte',
  armLength: 'Armlänge',
  legLength: 'Beinlänge',
  build: 'Statur',
  muscularity: 'Muskulatur',
};

const FACE_LABELS_DE: Readonly<Record<AvatarMorphFaceKey, string>> = {
  faceWidth: 'Gesichtsbreite',
  faceLength: 'Gesichtslänge',
  jawWidth: 'Kieferbreite',
  chin: 'Kinn',
  cheekbones: 'Wangenknochen',
  noseWidth: 'Nasenbreite',
  noseLength: 'Nasenlänge',
  eyeSize: 'Augengröße',
  eyeSpacing: 'Augenabstand',
  eyeAngle: 'Augenwinkel',
  mouthWidth: 'Mundbreite',
  lipFullness: 'Lippenfülle',
  earSize: 'Ohrgröße',
};

function buildParamMeta(
  keys: readonly AvatarMorphParamKey[],
  group: AvatarMorphParamGroup,
  labels: Readonly<Record<string, string>>,
): readonly AvatarMorphParamMeta[] {
  return keys.map((key) => ({
    key,
    group,
    labelDe: labels[key] ?? key,
    min: -1 as const,
    max: 1 as const,
    default: 0,
    step: 0.05,
  }));
}

export const AVATAR_MORPH_BODY_META: readonly AvatarMorphParamMeta[] = buildParamMeta(
  AVATAR_MORPH_BODY_KEYS,
  'body',
  BODY_LABELS_DE,
);

export const AVATAR_MORPH_FACE_META: readonly AvatarMorphParamMeta[] = buildParamMeta(
  AVATAR_MORPH_FACE_KEYS,
  'face',
  FACE_LABELS_DE,
);

export const AVATAR_MORPH_PARAM_META: readonly AvatarMorphParamMeta[] = [
  ...AVATAR_MORPH_BODY_META,
  ...AVATAR_MORPH_FACE_META,
];

function zeroBody(): AvatarMorphBodyValues {
  const out = {} as Record<AvatarMorphBodyKey, number>;
  for (const key of AVATAR_MORPH_BODY_KEYS) out[key] = 0;
  return out;
}

function zeroFace(): AvatarMorphFaceValues {
  const out = {} as Record<AvatarMorphFaceKey, number>;
  for (const key of AVATAR_MORPH_FACE_KEYS) out[key] = 0;
  return out;
}

export function createDefaultAvatarMorphState(): SagaDriveAvatarMorphStateV1 {
  return {
    contractVersion: MORPH_CONTRACT_VERSION,
    body: zeroBody(),
    face: zeroFace(),
    colors: { skin: DEFAULT_SKIN, eyes: DEFAULT_EYES, hair: DEFAULT_HAIR },
    traits: { markings: [], scars: [], cybernetics: [] },
  };
}

export function isAvatarMorphBodyKey(value: string): value is AvatarMorphBodyKey {
  return (AVATAR_MORPH_BODY_KEYS as readonly string[]).includes(value);
}

export function isAvatarMorphFaceKey(value: string): value is AvatarMorphFaceKey {
  return (AVATAR_MORPH_FACE_KEYS as readonly string[]).includes(value);
}

export function isAvatarMorphParamKey(value: string): value is AvatarMorphParamKey {
  return isAvatarMorphBodyKey(value) || isAvatarMorphFaceKey(value);
}

export function getAvatarMorphParamMeta(key: AvatarMorphParamKey): AvatarMorphParamMeta {
  const found = AVATAR_MORPH_PARAM_META.find((entry) => entry.key === key);
  if (!found) {
    throw new Error(`Unknown morph param: ${key}`);
  }
  return found;
}

function clampMorphValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < -1) return -1;
  if (value > 1) return 1;
  return value;
}

/** Map legacy 0–100 slider to morph [-1,1] with 50 → 0. */
export function legacySliderToMorph(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clampMorphValue((value - 50) / 50);
}

export function morphToLegacySlider(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round((clampMorphValue(value) + 1) * 50)));
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return fallback;
  return trimmed.toUpperCase();
}

function sanitizeTraitIds(value: unknown, warnings: string[], slot: string): readonly string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    warnings.push(`${slot}: ungültige Trait-Liste ignoriert`);
    return [];
  }
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') {
      warnings.push(`${slot}: ungültige Trait-ID ignoriert`);
      continue;
    }
    const id = entry.trim().toLowerCase();
    if (!TRAIT_ID_RE.test(id)) {
      warnings.push(`${slot}: ungültige Trait-ID ignoriert`);
      continue;
    }
    if (out.includes(id)) continue;
    if (out.length >= MAX_TRAIT_IDS) {
      warnings.push(`${slot}: maximale Anzahl Trait-IDs erreicht`);
      break;
    }
    out.push(id);
  }
  return out;
}

function applyBodyPartial(
  base: AvatarMorphBodyValues,
  partial: Record<string, unknown> | undefined,
  ignored: string[],
  warnings: string[],
): AvatarMorphBodyValues {
  const next = { ...base };
  if (!partial || typeof partial !== 'object') return next;
  for (const [key, raw] of Object.entries(partial)) {
    if (!isAvatarMorphBodyKey(key)) {
      ignored.push(`body.${key}`);
      continue;
    }
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      warnings.push(`Körperparameter ${BODY_LABELS_DE[key]} ungültig — Default 0`);
      next[key] = 0;
      continue;
    }
    const clamped = clampMorphValue(raw);
    if (clamped !== raw) {
      warnings.push(`Körperparameter ${BODY_LABELS_DE[key]} auf gültigen Bereich begrenzt`);
    }
    next[key] = clamped;
  }
  return next;
}

function applyFacePartial(
  base: AvatarMorphFaceValues,
  partial: Record<string, unknown> | undefined,
  ignored: string[],
  warnings: string[],
): AvatarMorphFaceValues {
  const next = { ...base };
  if (!partial || typeof partial !== 'object') return next;
  for (const [key, raw] of Object.entries(partial)) {
    if (!isAvatarMorphFaceKey(key)) {
      ignored.push(`face.${key}`);
      continue;
    }
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      warnings.push(`Gesichtsparameter ${FACE_LABELS_DE[key]} ungültig — Default 0`);
      next[key] = 0;
      continue;
    }
    const clamped = clampMorphValue(raw);
    if (clamped !== raw) {
      warnings.push(`Gesichtsparameter ${FACE_LABELS_DE[key]} auf gültigen Bereich begrenzt`);
    }
    next[key] = clamped;
  }
  return next;
}

/**
 * Validate/normalize untrusted morph input. Unknown keys are ignored (fail-safe).
 * Client-supplied capability flags are never accepted.
 */
export function validateAvatarMorphInput(input: unknown): AvatarMorphValidationResult {
  const warnings: string[] = [];
  const ignoredKeys: string[] = [];
  const base = createDefaultAvatarMorphState();

  if (input == null || typeof input !== 'object') {
    return { ok: true, state: base, ignoredKeys, warnings: ['Kein Morph-Zustand — Defaults'] };
  }

  const record = input as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (
      key === 'contractVersion' ||
      key === 'body' ||
      key === 'face' ||
      key === 'colors' ||
      key === 'traits'
    ) {
      continue;
    }
    // Capabilities must never come from client — ignore silently as security boundary.
    if (key === 'capabilities' || key === 'flags' || key === 'morphCapabilities') {
      ignoredKeys.push(key);
      continue;
    }
    ignoredKeys.push(key);
  }

  if (
    record.contractVersion != null &&
    record.contractVersion !== MORPH_CONTRACT_VERSION
  ) {
    warnings.push('Unbekannte Morph-Vertragsversion — Defaults für fehlende Felder');
  }

  const body = applyBodyPartial(
    base.body,
    record.body as Record<string, unknown> | undefined,
    ignoredKeys,
    warnings,
  );
  const face = applyFacePartial(
    base.face,
    record.face as Record<string, unknown> | undefined,
    ignoredKeys,
    warnings,
  );

  const colorsRaw =
    record.colors && typeof record.colors === 'object'
      ? (record.colors as Record<string, unknown>)
      : {};
  const colors: AvatarMorphColorsV1 = {
    skin: normalizeHexColor(colorsRaw.skin, DEFAULT_SKIN),
    eyes: normalizeHexColor(colorsRaw.eyes, DEFAULT_EYES),
    hair: normalizeHexColor(colorsRaw.hair, DEFAULT_HAIR),
  };

  const traitsRaw =
    record.traits && typeof record.traits === 'object'
      ? (record.traits as Record<string, unknown>)
      : {};
  const traits: AvatarMorphTraitSlotsV1 = {
    markings: sanitizeTraitIds(traitsRaw.markings, warnings, 'Markierungen'),
    scars: sanitizeTraitIds(traitsRaw.scars, warnings, 'Narben'),
    cybernetics: sanitizeTraitIds(traitsRaw.cybernetics, warnings, 'Cybernetics'),
  };

  return {
    ok: true,
    state: {
      contractVersion: MORPH_CONTRACT_VERSION,
      body,
      face,
      colors,
      traits,
    },
    ignoredKeys,
    warnings,
  };
}

/**
 * Deterministic preset merge: base state, then overlay known keys only.
 * Overlay unknown keys ignored; never invents alternate destinations.
 */
export function mergeAvatarMorphPresets(
  baseInput: unknown,
  overlayInput: unknown,
): SagaDriveAvatarMorphStateV1 {
  const base = validateAvatarMorphInput(baseInput).state;
  const overlayResult = validateAvatarMorphInput(overlayInput);
  const overlay = overlayResult.state;

  const body = { ...base.body };
  const face = { ...base.face };

  // Overlay only keys that were explicitly present in the raw overlay object.
  const overlayRecord =
    overlayInput && typeof overlayInput === 'object'
      ? (overlayInput as Record<string, unknown>)
      : {};
  const overlayBody =
    overlayRecord.body && typeof overlayRecord.body === 'object'
      ? (overlayRecord.body as Record<string, unknown>)
      : {};
  const overlayFace =
    overlayRecord.face && typeof overlayRecord.face === 'object'
      ? (overlayRecord.face as Record<string, unknown>)
      : {};

  for (const key of AVATAR_MORPH_BODY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(overlayBody, key)) {
      body[key] = overlay.body[key];
    }
  }
  for (const key of AVATAR_MORPH_FACE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(overlayFace, key)) {
      face[key] = overlay.face[key];
    }
  }

  const colorsRaw =
    overlayRecord.colors && typeof overlayRecord.colors === 'object'
      ? (overlayRecord.colors as Record<string, unknown>)
      : null;
  const colors: AvatarMorphColorsV1 = {
    skin: colorsRaw && 'skin' in colorsRaw ? overlay.colors.skin : base.colors.skin,
    eyes: colorsRaw && 'eyes' in colorsRaw ? overlay.colors.eyes : base.colors.eyes,
    hair: colorsRaw && 'hair' in colorsRaw ? overlay.colors.hair : base.colors.hair,
  };

  const traitsRaw =
    overlayRecord.traits && typeof overlayRecord.traits === 'object'
      ? (overlayRecord.traits as Record<string, unknown>)
      : null;
  const traits: AvatarMorphTraitSlotsV1 = {
    markings:
      traitsRaw && 'markings' in traitsRaw ? overlay.traits.markings : base.traits.markings,
    scars: traitsRaw && 'scars' in traitsRaw ? overlay.traits.scars : base.traits.scars,
    cybernetics:
      traitsRaw && 'cybernetics' in traitsRaw
        ? overlay.traits.cybernetics
        : base.traits.cybernetics,
  };

  return {
    contractVersion: MORPH_CONTRACT_VERSION,
    body,
    face,
    colors,
    traits,
  };
}

/**
 * Migrate legacy CharacterAvatarDto (0–100 body sliders, hair/skin only) into Morph V1.
 * Missing morph → defaults; height/size map into height/build.
 */
export function migrateCharacterAvatarDtoToMorph(
  avatar: CharacterAvatarDto | null | undefined,
): SagaDriveAvatarMorphStateV1 {
  const state = createDefaultAvatarMorphState();
  if (!avatar) return state;

  const height = legacySliderToMorph(avatar.body?.height ?? 50);
  const build = legacySliderToMorph(avatar.body?.size ?? 50);

  return {
    ...state,
    body: {
      ...state.body,
      height,
      build,
    },
    colors: {
      skin: normalizeHexColor(avatar.colors?.skin, DEFAULT_SKIN),
      eyes: DEFAULT_EYES,
      hair: normalizeHexColor(avatar.colors?.hair, DEFAULT_HAIR),
    },
  };
}

/**
 * Attach morph onto a CharacterAvatarDto without dropping legacy body/colors.
 * Morph capabilities are never written onto the DTO from the client.
 */
export function withAvatarMorphState(
  avatar: CharacterAvatarDto,
  morphInput: unknown,
): CharacterAvatarDto {
  const { state } = validateAvatarMorphInput(morphInput);
  return {
    ...avatar,
    colors: {
      hair: state.colors.hair,
      skin: state.colors.skin,
      eyes: state.colors.eyes,
    },
    body: {
      height: morphToLegacySlider(state.body.height),
      size: morphToLegacySlider(state.body.build),
    },
    morph_contract_version: MORPH_CONTRACT_VERSION,
    morph: state,
  };
}

/**
 * Resolve morph capabilities for SagaDrive-owned avatars.
 * Import/Meshy may lack morph targets — callers pass evidence flags, not client claims.
 */
export function resolveAvatarMorphCapabilities(input: {
  hasBodyMorphTargets: boolean;
  hasFaceMorphTargets: boolean;
}): AvatarMorphCapabilities {
  const flags: AvatarMorphCapabilityFlag[] = [];
  if (input.hasBodyMorphTargets) flags.push('morph-body-v1');
  if (input.hasFaceMorphTargets) flags.push('morph-face-v1');
  return { flags };
}

export function morphCapabilityFlagLabel(flag: AvatarMorphCapabilityFlag): string {
  switch (flag) {
    case 'morph-body-v1':
      return 'Körper-Morphs';
    case 'morph-face-v1':
      return 'Gesichts-Morphs';
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}
