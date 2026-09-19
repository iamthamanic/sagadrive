/**
 * Skinned wearable plan — ready+skinned visuals vs #6/#216 (#162, #258).
 * Location: src/domains/character/avatar/skinned-wearable-plan.ts
 */

import type { AvatarEquipmentVisual } from './equipment-visual-contract';
import type { AvatarFitStatus } from './fit-range-contract';
import type { AvatarRigCapabilityFlag } from './rig-contract';
import {
  isBodyFamilyVariantReady,
  resolveBodyFamilyWearableVariant,
  type BodyFamilyVariantResolveStatus,
} from './body-family-variant-resolver-v1';
import type { CanonicalBodyFamilyId } from './canonical-body-families-v1';

export const SKINNED_WEARABLE_PLAN_VERSION = 'SagaDriveSkinnedWearablePlanV1' as const;

export type SkinnedWearableUiStatus = 'passt' | 'muss geprüft werden' | 'nicht kompatibel';

export interface SkinnedWearableAttachOp {
  instanceId: string;
  assetKey: string;
  hideRegions: readonly string[];
  bodyMaskRegions: readonly string[];
  replaceSocket?: string;
  generation: number;
  uiStatus: SkinnedWearableUiStatus;
  bodyFamily: CanonicalBodyFamilyId | null;
  familyResolveStatus: BodyFamilyVariantResolveStatus | null;
  /** Family-fit relative path when wardrobe id is known; else null. */
  familyAssetPath: string | null;
}

export interface SkinnedWearablePlan {
  contractVersion: typeof SKINNED_WEARABLE_PLAN_VERSION;
  attach: readonly SkinnedWearableAttachOp[];
  detachInstanceIds: readonly string[];
}

export function mapFitToSkinnedUiStatus(
  status: AvatarEquipmentVisual['status'],
  fitStatus?: AvatarFitStatus,
): SkinnedWearableUiStatus {
  if (status === 'ready' && (fitStatus === undefined || fitStatus === 'ready')) return 'passt';
  if (status === 'needs-review' || fitStatus === 'needs-review') return 'muss geprüft werden';
  return 'nicht kompatibel';
}

/**
 * Extract optional wardrobe wearable id from logical asset key.
 * Accepts `wearable:<id>` or bare starter ids; otherwise null (legacy key).
 */
export function extractStarterWearableIdFromAssetKey(
  assetKey: string,
): string | null {
  if (assetKey.startsWith('wearable:')) {
    return assetKey.slice('wearable:'.length).split(':')[0] ?? null;
  }
  const known = [
    'underwear',
    'basic-shirt',
    'basic-pants',
    'basic-boots',
    'basic-robe',
    'leather-armor',
  ];
  if (known.includes(assetKey)) return assetKey;
  return null;
}

/**
 * Only attach when avatar has skinned-wearable-ready and visual is ready+skinned.
 * When bodyFamily + wardrobe id present, family variant must resolve ready.
 * Fail-soft: incompatible/missing skipped (no render).
 */
export function planSkinnedWearableAttaches(input: {
  visuals: readonly AvatarEquipmentVisual[];
  capabilityFlags: readonly AvatarRigCapabilityFlag[];
  previousInstanceIds?: readonly string[];
  generation: number;
  bodyFamily?: CanonicalBodyFamilyId | null;
}): SkinnedWearablePlan {
  const canSkin = input.capabilityFlags.includes('skinned-wearable-ready');
  const keep = new Set<string>();
  const attach: SkinnedWearableAttachOp[] = [];
  const bodyFamily = input.bodyFamily ?? null;

  for (const visual of input.visuals) {
    if (visual.attachment !== 'skinned') continue;
    if (!visual.assetKey) continue;

    const uiStatus = mapFitToSkinnedUiStatus(visual.status, visual.fitStatus);
    if (!canSkin || visual.status !== 'ready' || uiStatus !== 'passt') {
      continue;
    }

    const wearableId = extractStarterWearableIdFromAssetKey(visual.assetKey);
    let familyResolveStatus: BodyFamilyVariantResolveStatus | null = null;
    let familyAssetPath: string | null = null;
    let hideRegions: readonly string[] = visual.hideRegions;
    let bodyMaskRegions: readonly string[] = [...visual.hideRegions];

    if (wearableId && bodyFamily) {
      const resolved = resolveBodyFamilyWearableVariant({
        wearableId,
        bodyFamily,
      });
      familyResolveStatus = resolved.status;
      if (!isBodyFamilyVariantReady(resolved)) {
        continue;
      }
      familyAssetPath = resolved.assetPath;
      hideRegions = resolved.hideRegions;
      bodyMaskRegions = resolved.bodyMaskRegions;
    }
    // Without bodyFamily: legacy model3d attach still allowed (no silent wrong family fit).

    keep.add(visual.instanceId);
    attach.push({
      instanceId: visual.instanceId,
      assetKey: visual.assetKey,
      hideRegions,
      bodyMaskRegions,
      replaceSocket: visual.replaceSocket,
      generation: input.generation,
      uiStatus,
      bodyFamily,
      familyResolveStatus,
      familyAssetPath,
    });
  }

  const previous = input.previousInstanceIds ?? [];
  return {
    contractVersion: SKINNED_WEARABLE_PLAN_VERSION,
    attach,
    detachInstanceIds: previous.filter((id) => !keep.has(id)),
  };
}
