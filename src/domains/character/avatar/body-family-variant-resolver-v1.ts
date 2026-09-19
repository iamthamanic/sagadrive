/**
 * Body Family Variant Resolver — pure domain (#258 / Epic #248).
 * Location: src/domains/character/avatar/body-family-variant-resolver-v1.ts
 *
 * Selects the correct Standard/Compact/Heavy wearable fit for the active
 * body family. Fail-closed on missing variant or incompatible fit.
 */

import {
  isCanonicalBodyFamilyId,
  type CanonicalBodyFamilyId,
} from './canonical-body-families-v1';
import type { AvatarFitStatus } from './fit-range-contract';
import type { SagaDriveAvatarMorphStateV1 } from './morph-contract';
import {
  isStarterWearableId,
  resolveStarterWearableFit,
  type ResolvedStarterWearableFitV1,
  type StarterWearableId,
} from './starter-wardrobe-manifest-v1';

export const BODY_FAMILY_VARIANT_RESOLVER_VERSION =
  'SagaDriveBodyFamilyVariantResolverV1' as const;

export type BodyFamilyVariantResolveStatus =
  | 'ready'
  | 'needs-review'
  | 'incompatible'
  | 'missing-variant'
  | 'unknown-wearable'
  | 'unknown-family';

export interface BodyFamilyVariantResolveInput {
  wearableId: string;
  bodyFamily: string;
  morph?: SagaDriveAvatarMorphStateV1;
}

export interface BodyFamilyVariantResolveResult {
  contractVersion: typeof BODY_FAMILY_VARIANT_RESOLVER_VERSION;
  status: BodyFamilyVariantResolveStatus;
  messageDe: string | null;
  wearableId: StarterWearableId | null;
  bodyFamily: CanonicalBodyFamilyId | null;
  assetPath: string | null;
  assetVersion: string | null;
  fitStatus: AvatarFitStatus | null;
  /** Pass-through for hide/mask from wardrobe when resolved. */
  hideRegions: readonly string[];
  bodyMaskRegions: readonly string[];
}

function mapFitStatus(
  fit: ResolvedStarterWearableFitV1,
): BodyFamilyVariantResolveStatus {
  if (fit.status === 'missing-variant') return 'missing-variant';
  if (fit.status === 'needs-review') return 'needs-review';
  if (fit.status === 'incompatible') return 'incompatible';
  return 'ready';
}

/**
 * Resolve logical wearable + body family → family fit asset.
 * Never falls back to a different family silently.
 */
export function resolveBodyFamilyWearableVariant(
  input: BodyFamilyVariantResolveInput,
): BodyFamilyVariantResolveResult {
  if (!isStarterWearableId(input.wearableId)) {
    return {
      contractVersion: BODY_FAMILY_VARIANT_RESOLVER_VERSION,
      status: 'unknown-wearable',
      messageDe: 'Unbekanntes Wearable — kein Family-Fit.',
      wearableId: null,
      bodyFamily: null,
      assetPath: null,
      assetVersion: null,
      fitStatus: null,
      hideRegions: [],
      bodyMaskRegions: [],
    };
  }

  if (!isCanonicalBodyFamilyId(input.bodyFamily)) {
    return {
      contractVersion: BODY_FAMILY_VARIANT_RESOLVER_VERSION,
      status: 'unknown-family',
      messageDe:
        'Body Family unbekannt oder custom — kein Starter-Family-Fit (fail-closed).',
      wearableId: input.wearableId,
      bodyFamily: null,
      assetPath: null,
      assetVersion: null,
      fitStatus: null,
      hideRegions: [],
      bodyMaskRegions: [],
    };
  }

  const fit = resolveStarterWearableFit({
    wearableId: input.wearableId,
    bodyFamily: input.bodyFamily,
    morph: input.morph,
  });

  const status = mapFitStatus(fit);
  if (status !== 'ready' || !fit.variant) {
    return {
      contractVersion: BODY_FAMILY_VARIANT_RESOLVER_VERSION,
      status,
      messageDe: fit.messageDe,
      wearableId: input.wearableId,
      bodyFamily: input.bodyFamily,
      assetPath: null,
      assetVersion: null,
      fitStatus: fit.fitStatus,
      hideRegions: fit.hideRule.hideRegions,
      bodyMaskRegions: fit.hideRule.bodyMaskRegions,
    };
  }

  return {
    contractVersion: BODY_FAMILY_VARIANT_RESOLVER_VERSION,
    status: 'ready',
    messageDe: null,
    wearableId: input.wearableId,
    bodyFamily: input.bodyFamily,
    assetPath: fit.variant.assetPath,
    assetVersion: fit.variant.assetVersion,
    fitStatus: 'ready',
    hideRegions: fit.hideRule.hideRegions,
    bodyMaskRegions: fit.hideRule.bodyMaskRegions,
  };
}

export function isBodyFamilyVariantReady(
  result: BodyFamilyVariantResolveResult,
): boolean {
  return result.status === 'ready' && result.assetPath !== null;
}
