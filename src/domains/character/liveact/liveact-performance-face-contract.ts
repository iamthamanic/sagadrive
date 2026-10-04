/**
 * SagaDrive Performance Face V2 — character-side Premium face capability (#450).
 * Location: src/domains/character/liveact/liveact-performance-face-contract.ts
 *
 * Parallel to LiveAct Caps V1 / Face Asset V1. Never stores owner, calib, or landmarks.
 * Pure domain: no React / Three / MediaPipe.
 */

import type { LiveActGazeDrivePath } from './liveact-gaze-path';

export const SAGADRIVE_PERFORMANCE_FACE_CONTRACT = 'SagaDrivePerformanceFaceV2' as const;
export const PERFORMANCE_FACE_VALIDATOR_VERSION = 'performance-face-validator-v1' as const;
export const PERFORMANCE_FACE_MANIFEST_VERSION = 'SagaDrivePerformanceFaceManifestV1' as const;
export const PERFORMANCE_FACE_AUTHORING_SPEC = 'sagadrive-performance-face-authoring-v1' as const;
export const LIVEACT_ACTIVE_CAPABILITY_CONTRACT = 'SagaDriveLiveActActiveCapabilityV2' as const;

/** Display → Animated Humanoid → LiveAct Standard → LiveAct Premium. */
export const PERFORMANCE_FACE_CAPABILITY_LEVELS = [0, 1, 2, 3] as const;
export type PerformanceFaceCapabilityLevel =
  (typeof PERFORMANCE_FACE_CAPABILITY_LEVELS)[number];

export const PERFORMANCE_FACE_LEVEL_LABELS = {
  0: 'Display',
  1: 'Animated Humanoid',
  2: 'LiveAct Standard',
  3: 'LiveAct Premium',
} as const satisfies Record<PerformanceFaceCapabilityLevel, string>;

/**
 * Required Premium extended controls (locked in design).
 * Standard ARKit floor is Face Asset core-v1 / Caps V1 — not redefined here.
 */
export const PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS = [
  'nasolabialFoldLeft',
  'nasolabialFoldRight',
  'cheekVolumeLeft',
  'cheekVolumeRight',
  'lipContourUpperLeft',
  'lipContourUpperRight',
  'lipContourLowerLeft',
  'lipContourLowerRight',
] as const;

/** Optional Premium extensions — missing → warning; Premium may still pass. */
export const PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS = [
  'lidTightenLeft',
  'lidTightenRight',
] as const;

export type PerformanceFaceRequiredControlId =
  (typeof PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS)[number];
export type PerformanceFaceOptionalControlId =
  (typeof PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS)[number];
export type PerformanceFaceControlId =
  | PerformanceFaceRequiredControlId
  | PerformanceFaceOptionalControlId;

export const PERFORMANCE_FACE_ALL_CONTROLS: readonly PerformanceFaceControlId[] = [
  ...PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS,
  ...PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS,
];

export type PerformanceFaceCorrectiveWeightRule = 'min' | 'multiply';

/**
 * Character-side corrective: activates from declared drivers.
 * Not actor calibration (#449).
 */
export interface PerformanceFaceCorrectiveDeclarationV1 {
  id: string;
  /** PerformanceFace and/or LiveActFaceV1 control ids. */
  drivers: readonly string[];
  weightRule: PerformanceFaceCorrectiveWeightRule;
  /** When true, missing corrective → Premium NOT AVAILABLE. */
  required?: boolean;
}

/** Optional metadata — never sole authority for Premium eligibility. */
export interface PerformanceFaceManifestV1 {
  contractVersion: typeof PERFORMANCE_FACE_MANIFEST_VERSION;
  claimedLevel?: PerformanceFaceCapabilityLevel;
  correctives?: readonly PerformanceFaceCorrectiveDeclarationV1[];
}

export interface PerformanceFaceCorrectiveCapabilityV1 {
  present: readonly string[];
  missingRequired: readonly string[];
  missingOptional: readonly string[];
}

export interface PerformanceFaceValidationReportV1 {
  contractVersion: typeof SAGADRIVE_PERFORMANCE_FACE_CONTRACT;
  validatorVersion: typeof PERFORMANCE_FACE_VALIDATOR_VERSION;
  capabilityLevel: PerformanceFaceCapabilityLevel;
  standardEligible: boolean;
  premiumEligible: boolean;
  supportedControls: readonly PerformanceFaceControlId[];
  missingRequired: readonly PerformanceFaceControlId[];
  missingOptional: readonly PerformanceFaceControlId[];
  warnings: readonly string[];
  gazeCapability: LiveActGazeDrivePath;
  correctiveCapability: PerformanceFaceCorrectiveCapabilityV1;
  /** True when import must remain allowed (always for Premium-only gaps). */
  importAllowed: true;
  resolvedTargetNames: Readonly<Partial<Record<PerformanceFaceControlId, string>>>;
}

export function isPerformanceFaceControlId(id: string): id is PerformanceFaceControlId {
  return (PERFORMANCE_FACE_ALL_CONTROLS as readonly string[]).includes(id);
}

export function isPerformanceFaceCapabilityLevel(
  value: unknown,
): value is PerformanceFaceCapabilityLevel {
  return (
    typeof value === 'number' &&
    (PERFORMANCE_FACE_CAPABILITY_LEVELS as readonly number[]).includes(value)
  );
}

export function clampPerformanceFaceWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function computeCorrectiveWeight(
  driverWeights: readonly number[],
  rule: PerformanceFaceCorrectiveWeightRule,
): number {
  if (driverWeights.length === 0) return 0;
  const clamped = driverWeights.map(clampPerformanceFaceWeight);
  if (rule === 'min') {
    let min = clamped[0] ?? 0;
    for (let i = 1; i < clamped.length; i += 1) {
      const w = clamped[i] ?? 0;
      if (w < min) min = w;
    }
    return min;
  }
  let product = 1;
  for (const w of clamped) product *= w;
  return clampPerformanceFaceWeight(product);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCorrectiveDeclaration(
  entry: unknown,
): PerformanceFaceCorrectiveDeclarationV1 | null {
  if (!isPlainObject(entry)) return null;
  if (typeof entry.id !== 'string' || entry.id.length === 0) return null;
  if (!Array.isArray(entry.drivers) || entry.drivers.length === 0) return null;
  const drivers: string[] = [];
  for (const d of entry.drivers) {
    if (typeof d !== 'string' || d.length === 0) return null;
    drivers.push(d);
  }
  if (entry.weightRule !== 'min' && entry.weightRule !== 'multiply') return null;
  if (entry.required !== undefined && typeof entry.required !== 'boolean') return null;
  return {
    id: entry.id,
    drivers,
    weightRule: entry.weightRule,
    required: entry.required === true ? true : undefined,
  };
}

/**
 * Parse optional PerformanceFace manifest from unknown JSON extras.
 * Invalid shape → null (fail closed for claims; morph evidence still wins).
 */
export function parsePerformanceFaceManifestV1(
  raw: unknown,
): PerformanceFaceManifestV1 | null {
  if (!isPlainObject(raw)) return null;
  if (raw.contractVersion !== PERFORMANCE_FACE_MANIFEST_VERSION) return null;

  let claimedLevel: PerformanceFaceCapabilityLevel | undefined;
  if (raw.claimedLevel !== undefined) {
    if (!isPerformanceFaceCapabilityLevel(raw.claimedLevel)) return null;
    claimedLevel = raw.claimedLevel;
  }

  let correctives: PerformanceFaceCorrectiveDeclarationV1[] | undefined;
  if (raw.correctives !== undefined) {
    if (!Array.isArray(raw.correctives)) return null;
    correctives = [];
    for (const entry of raw.correctives) {
      const decl = parseCorrectiveDeclaration(entry);
      if (!decl) return null;
      correctives.push(decl);
    }
  }

  return {
    contractVersion: PERFORMANCE_FACE_MANIFEST_VERSION,
    claimedLevel,
    correctives,
  };
}
