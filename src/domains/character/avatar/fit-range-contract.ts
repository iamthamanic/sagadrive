/**
 * Avatar Fit Range V1 — pure domain compatibility for traits/wearables vs morphs.
 * Location: src/domains/character/avatar/fit-range-contract.ts
 *
 * No universal auto-fitting. Assets are ready / needs-review / incompatible
 * based on documented morph ranges + version bindings.
 */

import {
  MORPH_CONTRACT_VERSION,
  type AvatarMorphBodyKey,
  type AvatarMorphParamKey,
  type SagaDriveAvatarMorphStateV1,
} from './morph-contract';
import { RIG_CONTRACT_VERSION } from './rig-contract';
import {
  BASE_BODY_ASSET_VERSION,
  type BaseBodyTraitSocket,
} from './base-body-contract';

export const FIT_RANGE_CONTRACT_VERSION = 'AvatarFitRangeV1' as const;

export type AvatarFitStatus = 'ready' | 'needs-review' | 'incompatible';

export interface AvatarFitMorphBound {
  key: AvatarMorphParamKey;
  min: number;
  max: number;
}

export interface AvatarFitRangeV1 {
  contractVersion: typeof FIT_RANGE_CONTRACT_VERSION;
  assetId: string;
  /** Trait socket or wearable slot this range applies to. */
  socket: BaseBodyTraitSocket | 'wearable';
  assetVersion: string;
  rigVersion: typeof RIG_CONTRACT_VERSION;
  morphContractVersion: typeof MORPH_CONTRACT_VERSION;
  /** Supported morph windows; missing keys are unconstrained. */
  bounds: readonly AvatarFitMorphBound[];
  /** When true, UI may clamp morph into bounds; default false (warn/disable only). */
  allowClamp: boolean;
  reviewNotesDe?: string;
}

export interface AvatarFitCompatibilityResult {
  status: AvatarFitStatus;
  /** DE message for UI warning / disable reason. */
  messageDe: string | null;
  /** Bounds that currently fail. */
  violatedBounds: readonly AvatarFitMorphBound[];
  versionMismatch: boolean;
}

const PRIMARY_FIT_KEYS: readonly AvatarMorphBodyKey[] = [
  'height',
  'shoulderWidth',
  'chest',
  'waist',
  'hips',
  'build',
];

function morphValue(
  morph: SagaDriveAvatarMorphStateV1,
  key: AvatarMorphParamKey,
): number {
  if (key in morph.body) {
    return morph.body[key as AvatarMorphBodyKey];
  }
  return morph.face[key as keyof typeof morph.face] ?? 0;
}

export function createDefaultTraitFitRange(input: {
  assetId: string;
  socket: BaseBodyTraitSocket;
  bounds?: readonly AvatarFitMorphBound[];
  allowClamp?: boolean;
}): AvatarFitRangeV1 {
  return {
    contractVersion: FIT_RANGE_CONTRACT_VERSION,
    assetId: input.assetId,
    socket: input.socket,
    assetVersion: BASE_BODY_ASSET_VERSION,
    rigVersion: RIG_CONTRACT_VERSION,
    morphContractVersion: MORPH_CONTRACT_VERSION,
    bounds:
      input.bounds ??
      PRIMARY_FIT_KEYS.map((key) => ({ key, min: -0.85, max: 0.85 })),
    allowClamp: input.allowClamp === true,
  };
}

/**
 * Resolve morph + fit range → compatibility.
 * Version mismatch → incompatible (fail closed).
 * Out-of-range with allowClamp → needs-review (caller may clamp).
 * Out-of-range without clamp → incompatible.
 */
export function resolveAvatarFitCompatibility(input: {
  morph: SagaDriveAvatarMorphStateV1;
  fit: AvatarFitRangeV1;
  expectedAssetVersion?: string;
  expectedRigVersion?: string;
  expectedMorphContractVersion?: string;
}): AvatarFitCompatibilityResult {
  const expectedAsset = input.expectedAssetVersion ?? BASE_BODY_ASSET_VERSION;
  const expectedRig = input.expectedRigVersion ?? RIG_CONTRACT_VERSION;
  const expectedMorph = input.expectedMorphContractVersion ?? MORPH_CONTRACT_VERSION;

  const versionMismatch =
    input.fit.assetVersion !== expectedAsset ||
    input.fit.rigVersion !== expectedRig ||
    input.fit.morphContractVersion !== expectedMorph ||
    input.fit.contractVersion !== FIT_RANGE_CONTRACT_VERSION;

  if (versionMismatch) {
    return {
      status: 'incompatible',
      messageDe:
        'Fit-Range-Version passt nicht zum aktuellen Avatar-Vertrag — Asset deaktiviert.',
      violatedBounds: [],
      versionMismatch: true,
    };
  }

  const violated: AvatarFitMorphBound[] = [];
  for (const bound of input.fit.bounds) {
    const value = morphValue(input.morph, bound.key);
    if (value < bound.min || value > bound.max) violated.push(bound);
  }

  if (violated.length === 0) {
    return {
      status: 'ready',
      messageDe: null,
      violatedBounds: [],
      versionMismatch: false,
    };
  }

  if (input.fit.allowClamp) {
    return {
      status: 'needs-review',
      messageDe:
        'Morph liegt außerhalb der dokumentierten Fit-Range — Clamp nur nach expliziter Bestätigung.',
      violatedBounds: violated,
      versionMismatch: false,
    };
  }

  return {
    status: 'incompatible',
    messageDe:
      'Morph liegt außerhalb der Fit-Range — Asset wird nicht still falsch gerendert.',
    violatedBounds: violated,
    versionMismatch: false,
  };
}

/** Clamp morph into fit bounds only when allowClamp is true. */
export function clampMorphToFitRange(
  morph: SagaDriveAvatarMorphStateV1,
  fit: AvatarFitRangeV1,
): SagaDriveAvatarMorphStateV1 {
  if (!fit.allowClamp) return morph;
  const body = { ...morph.body };
  const face = { ...morph.face };
  for (const bound of fit.bounds) {
    const value = morphValue(morph, bound.key);
    const clamped = Math.max(bound.min, Math.min(bound.max, value));
    if (bound.key in body) {
      body[bound.key as AvatarMorphBodyKey] = clamped;
    } else if (bound.key in face) {
      (face as Record<string, number>)[bound.key] = clamped;
    }
  }
  return { ...morph, body, face };
}

export function listPrimaryFitMorphKeys(): readonly AvatarMorphBodyKey[] {
  return PRIMARY_FIT_KEYS;
}
