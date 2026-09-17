/**
 * Skinned wearable plan — ready+skinned visuals vs #6/#216 (#162).
 * Location: src/domains/character/avatar/skinned-wearable-plan.ts
 */

import type { AvatarEquipmentVisual } from './equipment-visual-contract';
import type { AvatarFitStatus } from './fit-range-contract';
import type { AvatarRigCapabilityFlag } from './rig-contract';

export const SKINNED_WEARABLE_PLAN_VERSION = 'SagaDriveSkinnedWearablePlanV1' as const;

export type SkinnedWearableUiStatus = 'passt' | 'muss geprüft werden' | 'nicht kompatibel';

export interface SkinnedWearableAttachOp {
  instanceId: string;
  assetKey: string;
  hideRegions: readonly string[];
  replaceSocket?: string;
  generation: number;
  uiStatus: SkinnedWearableUiStatus;
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
 * Only attach when avatar has skinned-wearable-ready and visual is ready+skinned.
 * Fail-soft: incompatible/missing skipped (no render).
 */
export function planSkinnedWearableAttaches(input: {
  visuals: readonly AvatarEquipmentVisual[];
  capabilityFlags: readonly AvatarRigCapabilityFlag[];
  previousInstanceIds?: readonly string[];
  generation: number;
}): SkinnedWearablePlan {
  const canSkin = input.capabilityFlags.includes('skinned-wearable-ready');
  const keep = new Set<string>();
  const attach: SkinnedWearableAttachOp[] = [];

  for (const visual of input.visuals) {
    if (visual.attachment !== 'skinned') continue;
    if (!visual.assetKey) continue;

    const uiStatus = mapFitToSkinnedUiStatus(visual.status, visual.fitStatus);
    if (!canSkin || visual.status !== 'ready' || uiStatus !== 'passt') {
      continue;
    }

    keep.add(visual.instanceId);
    attach.push({
      instanceId: visual.instanceId,
      assetKey: visual.assetKey,
      hideRegions: visual.hideRegions,
      replaceSocket: visual.replaceSocket,
      generation: input.generation,
      uiStatus,
    });
  }

  const previous = input.previousInstanceIds ?? [];
  return {
    contractVersion: SKINNED_WEARABLE_PLAN_VERSION,
    attach,
    detachInstanceIds: previous.filter((id) => !keep.has(id)),
  };
}
