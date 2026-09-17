/**
 * Rigid equipment attach plan — pure domain from #158 visuals (#159).
 * Location: src/domains/character/avatar/rigid-equipment-plan.ts
 */

import type { AvatarEquipmentVisual } from './equipment-visual-contract';
import type { EquipmentHideRegion } from './equipment-visual-contract';
import type { SagaDriveHumanoidAnchorId } from './rig-contract';

export const RIGID_EQUIPMENT_PLAN_VERSION = 'SagaDriveRigidEquipmentPlanV1' as const;

export interface RigidEquipmentAttachOp {
  instanceId: string;
  assetKey: string;
  anchor: SagaDriveHumanoidAnchorId;
  position: readonly [number, number, number];
  rotationEuler: readonly [number, number, number];
  scale: readonly [number, number, number];
  hideRegions: readonly EquipmentHideRegion[];
  replaceSocket?: string;
  generation: number;
}

export interface RigidEquipmentPlan {
  contractVersion: typeof RIGID_EQUIPMENT_PLAN_VERSION;
  attach: readonly RigidEquipmentAttachOp[];
  /** instanceIds that must be detached. */
  detachInstanceIds: readonly string[];
}

/**
 * Build attach plan from ready rigid visuals only. Fail-soft: skip missing/incompatible.
 * Two-handed already collapsed in #158 projection.
 */
export function planRigidEquipmentAttaches(input: {
  visuals: readonly AvatarEquipmentVisual[];
  previousInstanceIds?: readonly string[];
  generation: number;
  /** Anchors present on current #6 rig. */
  availableAnchors: ReadonlySet<SagaDriveHumanoidAnchorId> | readonly SagaDriveHumanoidAnchorId[];
}): RigidEquipmentPlan {
  const available =
    input.availableAnchors instanceof Set
      ? input.availableAnchors
      : new Set(input.availableAnchors);

  const attach: RigidEquipmentAttachOp[] = [];
  const keep = new Set<string>();

  for (const visual of input.visuals) {
    if (visual.status !== 'ready') continue;
    if (visual.attachment !== 'rigid') continue;
    if (!visual.assetKey || !visual.anchor || !visual.transform) continue;
    if (!available.has(visual.anchor)) continue;

    keep.add(visual.instanceId);
    attach.push({
      instanceId: visual.instanceId,
      assetKey: visual.assetKey,
      anchor: visual.anchor,
      position: visual.transform.position,
      rotationEuler: visual.transform.rotationEuler,
      scale: visual.transform.scale,
      hideRegions: visual.hideRegions,
      replaceSocket: visual.replaceSocket,
      generation: input.generation,
    });
  }

  const previous = input.previousInstanceIds ?? [];
  const detachInstanceIds = previous.filter((id) => !keep.has(id));

  return {
    contractVersion: RIGID_EQUIPMENT_PLAN_VERSION,
    attach,
    detachInstanceIds,
  };
}
