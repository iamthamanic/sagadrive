/**
 * avatar-skinned-wearable-runtime — attach prepared skinned wearables (#162).
 * Location: src/infrastructure/character/avatar/avatar-skinned-wearable-runtime.ts
 *
 * Provider-agnostic: only authorized logical assets. No Meshy/SkinTokens here.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type {
  AvatarEquipmentVisual,
  AvatarRigAnalysisResult,
  SkinnedWearableAttachOp,
} from '../../../domains/character/avatar';
import { planSkinnedWearableAttaches } from '../../../domains/character/avatar';
import { parseItemModel3dAssetKey } from '../../../domains/items/model3d-assets';
import { normalizeSafeUrl } from '../../../domains/character/use-cases/avatar-presets';

const MAX_CACHED = 6;

export type ResolveSkinnedWearableUrl = (assetKey: string) => string | null | Promise<string | null>;

interface Attached {
  instanceId: string;
  root: THREE.Object3D;
  hideTargets: THREE.Object3D[];
  generation: number;
}

export class AvatarSkinnedWearableRuntime {
  private readonly group = new THREE.Group();
  private readonly loader = new GLTFLoader();
  private readonly attached = new Map<string, Attached>();
  private readonly cache = new Map<string, THREE.Object3D>();
  private readonly loadTokens = new Map<string, number>();
  private generation = 0;
  private avatarRoot: THREE.Object3D | null = null;
  private analysis: AvatarRigAnalysisResult | null = null;
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
    if (!parseItemModel3dAssetKey(op.assetKey) || !this.avatarRoot) return;

    const token = (this.loadTokens.get(op.instanceId) ?? 0) + 1;
    this.loadTokens.set(op.instanceId, token);

    let template = this.cache.get(op.assetKey);
    if (!template) {
      const url = await this.resolveUrl(op.assetKey);
      const safe = url ? normalizeSafeUrl(url) : undefined;
      if (!safe) return;
      try {
        const gltf = await this.loader.loadAsync(safe);
        if (this.disposed || generation !== this.generation || this.loadTokens.get(op.instanceId) !== token) {
          return;
        }
        // Fail closed if no SkinnedMesh present
        let hasSkin = false;
        gltf.scene.traverse((obj) => {
          if (obj instanceof THREE.SkinnedMesh) hasSkin = true;
        });
        if (!hasSkin) return;
        template = gltf.scene;
        this.cache.set(op.assetKey, template);
        while (this.cache.size > MAX_CACHED) {
          const first = this.cache.keys().next().value;
          if (!first) break;
          this.cache.delete(first);
        }
      } catch {
        return;
      }
    }

    if (this.disposed || generation !== this.generation || this.loadTokens.get(op.instanceId) !== token) {
      return;
    }

    this.detach(op.instanceId);
    const clone = template.clone(true);
    clone.name = `skinned-${op.instanceId}`;
    this.avatarRoot.add(clone);
    const hideTargets = this.applyHide(op.hideRegions);
    this.attached.set(op.instanceId, { instanceId: op.instanceId, root: clone, hideTargets, generation });
  }

  private applyHide(regions: readonly string[]): THREE.Object3D[] {
    if (!this.avatarRoot) return [];
    const hints = regions.filter((r) => r !== 'none').map((r) => r.toLowerCase());
    if (hints.length === 0) return [];
    const targets: THREE.Object3D[] = [];
    this.avatarRoot.traverse((obj) => {
      const name = obj.name.toLowerCase();
      if (!hints.some((h) => name.includes(h)) || !obj.visible) return;
      obj.visible = false;
      targets.push(obj);
    });
    return targets;
  }

  private detach(instanceId: string): void {
    const entry = this.attached.get(instanceId);
    if (!entry) return;
    for (const t of entry.hideTargets) t.visible = true;
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
  }
}
