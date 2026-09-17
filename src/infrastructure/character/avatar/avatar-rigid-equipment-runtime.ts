/**
 * avatar-rigid-equipment-runtime — attach/detach rigid GLBs to #6 anchors (#159).
 * Location: src/infrastructure/character/avatar/avatar-rigid-equipment-runtime.ts
 *
 * Does not mutate Inventory. Fail-soft on missing anchor/asset. Stale loads discarded.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type {
  AvatarEquipmentVisual,
  RigidEquipmentAttachOp,
  SagaDriveHumanoidAnchorId,
} from '../../../domains/character/avatar';
import { planRigidEquipmentAttaches } from '../../../domains/character/avatar';
import type { AvatarRigAnalysisResult } from '../../../domains/character/avatar';
import { parseItemModel3dAssetKey } from '../../../domains/items/model3d-assets';
import { normalizeSafeUrl } from '../../../domains/character/use-cases/avatar-presets';

const MAX_CACHED_GLBS = 8;

export type ResolveRigidEquipmentUrl = (assetKey: string) => string | null | Promise<string | null>;

interface AttachedEntry {
  instanceId: string;
  root: THREE.Object3D;
  hideTargets: THREE.Object3D[];
  generation: number;
}

export class AvatarRigidEquipmentRuntime {
  private readonly group = new THREE.Group();
  private readonly loader = new GLTFLoader();
  private readonly attached = new Map<string, AttachedEntry>();
  private readonly cache = new Map<string, THREE.Object3D>();
  private readonly loadTokens = new Map<string, number>();
  private generation = 0;
  private avatarRoot: THREE.Object3D | null = null;
  private analysis: AvatarRigAnalysisResult | null = null;
  private resolveUrl: ResolveRigidEquipmentUrl;
  private disposed = false;

  constructor(resolveUrl: ResolveRigidEquipmentUrl = () => null) {
    this.group.name = 'saga-rigid-equipment';
    this.resolveUrl = resolveUrl;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  setUrlResolver(resolveUrl: ResolveRigidEquipmentUrl): void {
    this.resolveUrl = resolveUrl;
  }

  bindAvatar(root: THREE.Object3D | null, analysis: AvatarRigAnalysisResult | null): void {
    this.clearAll(true);
    this.avatarRoot = root;
    this.analysis = analysis;
    if (root) {
      root.add(this.group);
    }
  }

  /**
   * Apply #158 visuals — only rigid+ready. Missing/incompatible skip silently.
   */
  async applyVisuals(visuals: readonly AvatarEquipmentVisual[]): Promise<void> {
    if (this.disposed) return;
    this.generation += 1;
    const generation = this.generation;

    const available = this.listAvailableAnchors();
    const previous = [...this.attached.keys()];
    const plan = planRigidEquipmentAttaches({
      visuals,
      previousInstanceIds: previous,
      generation,
      availableAnchors: available,
    });

    for (const instanceId of plan.detachInstanceIds) {
      this.detach(instanceId);
    }

    await Promise.all(plan.attach.map((op) => this.attachOp(op, generation)));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearAll(true);
    this.cache.clear();
    this.group.removeFromParent();
  }

  private listAvailableAnchors(): Set<SagaDriveHumanoidAnchorId> {
    const set = new Set<SagaDriveHumanoidAnchorId>();
    const anchors = this.analysis?.rig.anchors;
    if (!anchors) return set;
    for (const [key, name] of Object.entries(anchors)) {
      if (name) set.add(key as SagaDriveHumanoidAnchorId);
    }
    return set;
  }

  private findAnchorObject(anchor: SagaDriveHumanoidAnchorId): THREE.Object3D | null {
    if (!this.avatarRoot || !this.analysis) return null;
    const sourceName = this.analysis.rig.anchors[anchor];
    if (!sourceName) return null;
    let found: THREE.Object3D | null = null;
    this.avatarRoot.traverse((obj) => {
      if (found) return;
      if (obj.name === sourceName) found = obj;
    });
    return found;
  }

  private async attachOp(op: RigidEquipmentAttachOp, generation: number): Promise<void> {
    if (this.disposed || generation !== this.generation) return;
    if (!parseItemModel3dAssetKey(op.assetKey)) return;

    const token = (this.loadTokens.get(op.instanceId) ?? 0) + 1;
    this.loadTokens.set(op.instanceId, token);

    const anchorObj = this.findAnchorObject(op.anchor);
    if (!anchorObj) return;

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
        template = gltf.scene;
        this.cache.set(op.assetKey, template);
        while (this.cache.size > MAX_CACHED_GLBS) {
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
    clone.name = `rigid-${op.instanceId}`;
    clone.position.set(op.position[0], op.position[1], op.position[2]);
    clone.rotation.set(op.rotationEuler[0], op.rotationEuler[1], op.rotationEuler[2]);
    clone.scale.set(op.scale[0], op.scale[1], op.scale[2]);
    anchorObj.add(clone);

    const hideTargets = this.applyHideRegions(op.hideRegions);
    this.attached.set(op.instanceId, {
      instanceId: op.instanceId,
      root: clone,
      hideTargets,
      generation,
    });
  }

  private applyHideRegions(regions: readonly string[]): THREE.Object3D[] {
    if (!this.avatarRoot) return [];
    const targets: THREE.Object3D[] = [];
    const hints = regions.filter((r) => r !== 'none').map((r) => r.toLowerCase());
    if (hints.length === 0) return targets;

    this.avatarRoot.traverse((obj) => {
      const name = obj.name.toLowerCase();
      if (!hints.some((hint) => name.includes(hint))) return;
      if (!obj.visible) return;
      obj.visible = false;
      targets.push(obj);
    });
    return targets;
  }

  private detach(instanceId: string): void {
    const entry = this.attached.get(instanceId);
    if (!entry) return;
    for (const target of entry.hideTargets) {
      target.visible = true;
    }
    entry.root.removeFromParent();
    entry.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) mat.dispose();
      }
    });
    this.attached.delete(instanceId);
  }

  private clearAll(restoreHide: boolean): void {
    for (const id of [...this.attached.keys()]) {
      if (!restoreHide) {
        const entry = this.attached.get(id);
        if (entry) entry.hideTargets = [];
      }
      this.detach(id);
    }
  }
}
