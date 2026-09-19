/**
 * avatar-skinned-wearable-runtime — family-fit attach + skeleton rebind (#162/#258).
 * Location: src/infrastructure/character/avatar/avatar-skinned-wearable-runtime.ts
 *
 * Provider-agnostic: only authorized logical assets. Uses SkeletonUtils.clone and
 * rebinds SkinnedMesh bones onto the active SagaDrive humanoid skeleton.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import type {
  AvatarEquipmentVisual,
  AvatarRigAnalysisResult,
  CanonicalBodyFamilyId,
  SkinnedWearableAttachOp,
} from '../../../domains/character/avatar';
import {
  BodyRegionMaskRegistry,
  planSkinnedWearableAttaches,
} from '../../../domains/character/avatar';
import { parseItemModel3dAssetKey } from '../../../domains/items/model3d-assets';
import { normalizeSafeUrl } from '../../../domains/character/use-cases/avatar-presets';

const MAX_CACHED = 6;

export type ResolveSkinnedWearableUrl = (assetKey: string) => string | null | Promise<string | null>;

interface Attached {
  instanceId: string;
  root: THREE.Object3D;
  maskRegions: readonly string[];
  generation: number;
}

export class AvatarSkinnedWearableRuntime {
  private readonly group = new THREE.Group();
  private readonly loader = new GLTFLoader();
  private readonly attached = new Map<string, Attached>();
  private readonly cache = new Map<string, THREE.Object3D>();
  private readonly loadTokens = new Map<string, number>();
  private readonly regionMask = new BodyRegionMaskRegistry();
  private generation = 0;
  private avatarRoot: THREE.Object3D | null = null;
  private analysis: AvatarRigAnalysisResult | null = null;
  private bodyFamily: CanonicalBodyFamilyId | null = null;
  private resolveUrl: ResolveSkinnedWearableUrl;
  private disposed = false;

  constructor(resolveUrl: ResolveSkinnedWearableUrl = () => null) {
    this.group.name = 'saga-skinned-wearables';
    this.resolveUrl = resolveUrl;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  setUrlResolver(resolveUrl: ResolveSkinnedWearableUrl): void {
    this.resolveUrl = resolveUrl;
  }

  setBodyFamily(bodyFamily: CanonicalBodyFamilyId | null): void {
    this.bodyFamily = bodyFamily;
  }

  getRegionMaskSnapshot() {
    return this.regionMask.snapshot();
  }

  bindAvatar(root: THREE.Object3D | null, analysis: AvatarRigAnalysisResult | null): void {
    this.clearAll();
    this.avatarRoot = root;
    this.analysis = analysis;
    if (root) root.add(this.group);
  }

  async applyVisuals(visuals: readonly AvatarEquipmentVisual[]): Promise<void> {
    if (this.disposed) return;
    this.generation += 1;
    const generation = this.generation;
    const flags = this.analysis?.capabilities.flags ?? [];
    const plan = planSkinnedWearableAttaches({
      visuals,
      capabilityFlags: flags,
      previousInstanceIds: [...this.attached.keys()],
      generation,
      bodyFamily: this.bodyFamily,
    });

    for (const id of plan.detachInstanceIds) this.detach(id);
    await Promise.all(plan.attach.map((op) => this.attachOp(op, generation)));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearAll();
    this.cache.clear();
    this.group.removeFromParent();
  }

  private async attachOp(op: SkinnedWearableAttachOp, generation: number): Promise<void> {
    if (this.disposed || generation !== this.generation) return;
    // Legacy model3d keys still allowed; wardrobe keys may omit model3d: prefix.
    const hasModelKey = Boolean(parseItemModel3dAssetKey(op.assetKey));
    const hasFamilyPath = Boolean(op.familyAssetPath);
    if ((!hasModelKey && !hasFamilyPath) || !this.avatarRoot) return;

    const token = (this.loadTokens.get(op.instanceId) ?? 0) + 1;
    this.loadTokens.set(op.instanceId, token);

    const cacheKey = op.familyAssetPath
      ? `family:${op.familyAssetPath}`
      : op.assetKey;

    let template = this.cache.get(cacheKey);
    if (!template) {
      const url = await this.resolveUrl(
        op.familyAssetPath ? `wearable-path:${op.familyAssetPath}` : op.assetKey,
      );
      const safe = url ? normalizeSafeUrl(url) : undefined;
      if (!safe) return;
      try {
        const gltf = await this.loader.loadAsync(safe);
        if (
          this.disposed ||
          generation !== this.generation ||
          this.loadTokens.get(op.instanceId) !== token
        ) {
          return;
        }
        let hasSkin = false;
        gltf.scene.traverse((obj) => {
          if (obj instanceof THREE.SkinnedMesh) hasSkin = true;
        });
        if (!hasSkin) return;
        template = gltf.scene;
        this.cache.set(cacheKey, template);
        while (this.cache.size > MAX_CACHED) {
          const first = this.cache.keys().next().value;
          if (!first) break;
          this.cache.delete(first);
        }
      } catch {
        return;
      }
    }

    if (
      this.disposed ||
      generation !== this.generation ||
      this.loadTokens.get(op.instanceId) !== token
    ) {
      return;
    }

    this.detach(op.instanceId);

    // SkeletonUtils.clone preserves skinning graph; then rebind to host skeleton.
    const clone = SkeletonUtils.clone(template) as THREE.Object3D;
    clone.name = `skinned-${op.instanceId}`;

    const rebound = this.rebindToAvatarSkeleton(clone);
    if (!rebound) {
      // Rig/family mismatch — fail closed, do not attach orphan skeleton.
      return;
    }

    this.avatarRoot.add(clone);
    this.applyMask(op.bodyMaskRegions.length > 0 ? op.bodyMaskRegions : op.hideRegions);
    this.attached.set(op.instanceId, {
      instanceId: op.instanceId,
      root: clone,
      maskRegions: op.bodyMaskRegions.length > 0 ? op.bodyMaskRegions : op.hideRegions,
      generation,
    });
  }

  /**
   * Rebind wearable SkinnedMeshes onto the avatar host skeleton by bone name.
   * Returns false when host skeleton or required bones are missing.
   */
  private rebindToAvatarSkeleton(wearableRoot: THREE.Object3D): boolean {
    if (!this.avatarRoot) return false;

    const hostSkeleton = this.findHostSkeleton(this.avatarRoot);
    if (!hostSkeleton) return false;

    const hostByName = new Map<string, THREE.Bone>();
    for (const bone of hostSkeleton.bones) {
      hostByName.set(bone.name, bone);
    }

    // Also index analysis-mapped canonical → source names.
    const mapped = this.analysis?.rig.bones ?? {};
    for (const sourceName of Object.values(mapped)) {
      if (!sourceName || hostByName.has(sourceName)) continue;
      this.avatarRoot.traverse((obj) => {
        if (obj instanceof THREE.Bone && obj.name === sourceName) {
          hostByName.set(sourceName, obj);
        }
      });
    }

    let reboundAny = false;
    let failed = false;
    wearableRoot.traverse((obj) => {
      if (!(obj instanceof THREE.SkinnedMesh)) return;
      const nextBones: THREE.Bone[] = [];
      for (const bone of obj.skeleton.bones) {
        const hostBone = hostByName.get(bone.name);
        if (!hostBone) {
          failed = true;
          return;
        }
        nextBones.push(hostBone);
      }
      const skeleton = new THREE.Skeleton(nextBones, obj.skeleton.boneInverses.slice());
      obj.bind(skeleton, obj.bindMatrix);
      obj.skeleton = skeleton;
      reboundAny = true;
    });

    return reboundAny && !failed;
  }

  private findHostSkeleton(root: THREE.Object3D): THREE.Skeleton | null {
    let found: THREE.Skeleton | null = null;
    root.traverse((obj) => {
      if (found) return;
      if (obj instanceof THREE.SkinnedMesh && obj.skeleton?.bones?.length) {
        found = obj.skeleton;
      }
    });
    return found;
  }

  private applyMask(regions: readonly string[]): void {
    const delta = this.regionMask.apply(regions);
    this.setRegionVisibility(delta.newlyHidden, false);
  }

  private releaseMask(regions: readonly string[]): void {
    const delta = this.regionMask.release(regions);
    this.setRegionVisibility(delta.newlyRestored, true);
  }

  /**
   * Apply visibility by V2 region contract: prefer userData.sdBodyRegion,
   * fallback to name substring (legacy meshes without region tags).
   */
  private setRegionVisibility(
    regions: readonly string[],
    visible: boolean,
  ): void {
    if (!this.avatarRoot || regions.length === 0) return;
    const wanted = new Set(regions.map((r) => r.toLowerCase()));
    this.avatarRoot.traverse((obj) => {
      if (obj === this.group || obj.parent === this.group) return;
      if (obj.name.startsWith('skinned-') || obj.name === 'saga-skinned-wearables') return;

      const tagged =
        typeof obj.userData.sdBodyRegion === 'string'
          ? String(obj.userData.sdBodyRegion).toLowerCase()
          : null;
      const name = obj.name.toLowerCase();
      const match =
        (tagged && wanted.has(tagged)) ||
        [...wanted].some((h) => h !== 'none' && name.includes(h));
      if (!match) return;
      obj.visible = visible;
    });
  }

  private detach(instanceId: string): void {
    const entry = this.attached.get(instanceId);
    if (!entry) return;
    this.releaseMask(entry.maskRegions);
    entry.root.removeFromParent();
    entry.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    });
    this.attached.delete(instanceId);
  }

  private clearAll(): void {
    for (const id of [...this.attached.keys()]) this.detach(id);
    const leftover = this.regionMask.clear();
    this.setRegionVisibility(leftover.newlyRestored, true);
  }
}
