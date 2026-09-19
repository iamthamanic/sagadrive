/**
 * Body Region Mask V1 — pure domain ref-counted hide overlays (#258).
 * Location: src/domains/character/avatar/body-region-mask-v1.ts
 *
 * Multiple wearables may hide the same region; unequip must not restore a
 * region while another wearer still requires it. No Three.js.
 */

import {
  EQUIPMENT_HIDE_REGIONS,
  type EquipmentHideRegion,
} from './equipment-visual-contract';

export const BODY_REGION_MASK_CONTRACT_VERSION =
  'SagaDriveBodyRegionMaskV1' as const;

export interface BodyRegionMaskSnapshot {
  contractVersion: typeof BODY_REGION_MASK_CONTRACT_VERSION;
  /** Region → active overlay count. */
  counts: Readonly<Partial<Record<EquipmentHideRegion, number>>>;
}

export interface BodyRegionMaskDelta {
  /** Regions whose visibility should become hidden (count 0→1). */
  newlyHidden: readonly EquipmentHideRegion[];
  /** Regions whose visibility should become visible (count 1→0). */
  newlyRestored: readonly EquipmentHideRegion[];
}

function isRegion(value: string): value is EquipmentHideRegion {
  return (EQUIPMENT_HIDE_REGIONS as readonly string[]).includes(value);
}

function normalizeRegions(
  regions: readonly string[],
): readonly EquipmentHideRegion[] {
  const out: EquipmentHideRegion[] = [];
  const seen = new Set<string>();
  for (const raw of regions) {
    if (raw === 'none' || !isRegion(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

/** Mutable ref-count registry — domain pure (no scene graph). */
export class BodyRegionMaskRegistry {
  private readonly counts = new Map<EquipmentHideRegion, number>();

  snapshot(): BodyRegionMaskSnapshot {
    const counts: Partial<Record<EquipmentHideRegion, number>> = {};
    for (const [k, v] of this.counts) {
      if (v > 0) counts[k] = v;
    }
    return {
      contractVersion: BODY_REGION_MASK_CONTRACT_VERSION,
      counts,
    };
  }

  /** Apply overlay for one wearer; returns visibility deltas. */
  apply(regions: readonly string[]): BodyRegionMaskDelta {
    const newlyHidden: EquipmentHideRegion[] = [];
    for (const region of normalizeRegions(regions)) {
      const prev = this.counts.get(region) ?? 0;
      this.counts.set(region, prev + 1);
      if (prev === 0) newlyHidden.push(region);
    }
    return { newlyHidden, newlyRestored: [] };
  }

  /** Release overlay for one wearer; restore only when count hits 0. */
  release(regions: readonly string[]): BodyRegionMaskDelta {
    const newlyRestored: EquipmentHideRegion[] = [];
    for (const region of normalizeRegions(regions)) {
      const prev = this.counts.get(region) ?? 0;
      if (prev <= 0) continue;
      const next = prev - 1;
      if (next === 0) {
        this.counts.delete(region);
        newlyRestored.push(region);
      } else {
        this.counts.set(region, next);
      }
    }
    return { newlyHidden: [], newlyRestored };
  }

  clear(): BodyRegionMaskDelta {
    const newlyRestored = [...this.counts.keys()];
    this.counts.clear();
    return { newlyHidden: [], newlyRestored };
  }

  isHidden(region: EquipmentHideRegion): boolean {
    return (this.counts.get(region) ?? 0) > 0;
  }
}
