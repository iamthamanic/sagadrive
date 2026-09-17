/**
 * trait-lifecycle-three-adapter — Three.js Mesh/SkinnedMesh attach + one-shot dispose.
 * Location: src/infrastructure/character/avatar/trait-lifecycle-three-adapter.ts
 *
 * Infrastructure only: resolves GPU objects. Domain registry owns identity/lifecycle.
 * Adapted from M3 CharacterStudio cleanup ideas (MIT); no Wallet/NFT/Web3.
 */

import * as THREE from 'three';
import {
  createTraitLifecycleRegistry,
  type CharacterTraitInstance,
  type TraitLifecyclePort,
} from '../../../domains/character/avatar';

export interface TraitGpuHandle {
  root: THREE.Object3D;
}

export interface TraitLifecycleThreeAdapter {
  port: TraitLifecyclePort;
  /** Attach a freshly loaded root for an instance; no-op when generation is stale. */
  attachLoadedRoot(
    instanceId: string,
    generation: number,
    root: THREE.Object3D,
  ): boolean;
  getAttachedRoot(instanceId: string): THREE.Object3D | undefined;
  dispose(): void;
}

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/** Dispose geometry/materials/skeleton exactly once per object tree. */
export function disposeObject3DTreeOnce(
  root: THREE.Object3D,
  disposedRoots: WeakSet<THREE.Object3D>,
): void {
  if (disposedRoots.has(root)) return;
  disposedRoots.add(root);

  root.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) {
      object.skeleton?.boneInverses?.splice(0);
      // Skeleton bone arrays are owned by the skinned mesh graph; geometry/materials below.
    }
    if (object instanceof THREE.Mesh) {
      object.geometry?.dispose();
      for (const material of materialsOf(object)) {
        material.dispose();
      }
    }
  });

  if (root.parent) root.parent.remove(root);
}

/**
 * Bind a domain TraitLifecyclePort to a Three.js overlay container.
 * Parent is typically CharacterStudioRuntime's modelContainer (or a dedicated overlays group).
 */
export function createTraitLifecycleThreeAdapter(
  overlayParent: THREE.Object3D,
): TraitLifecycleThreeAdapter {
  const gpuByInstance = new Map<string, TraitGpuHandle>();
  const disposedRoots = new WeakSet<THREE.Object3D>();

  const port = createTraitLifecycleRegistry({
    onDisposeInstance(instance: CharacterTraitInstance) {
      const handle = gpuByInstance.get(instance.instanceId);
      if (!handle) return;
      disposeObject3DTreeOnce(handle.root, disposedRoots);
      gpuByInstance.delete(instance.instanceId);
    },
  });

  return {
    port,
    attachLoadedRoot(instanceId, generation, root) {
      if (!port.commitAsyncLoad(instanceId, generation)) {
        disposeObject3DTreeOnce(root, disposedRoots);
        return false;
      }
      const previous = gpuByInstance.get(instanceId);
      if (previous) {
        disposeObject3DTreeOnce(previous.root, disposedRoots);
      }
      overlayParent.add(root);
      gpuByInstance.set(instanceId, { root });
      return true;
    },
    getAttachedRoot(instanceId) {
      return gpuByInstance.get(instanceId)?.root;
    },
    dispose() {
      for (const groupId of port.listOverlays().map((o) => o.groupId)) {
        port.removeOverlay(groupId);
      }
      for (const [instanceId, handle] of [...gpuByInstance.entries()]) {
        disposeObject3DTreeOnce(handle.root, disposedRoots);
        gpuByInstance.delete(instanceId);
      }
    },
  };
}

/**
 * Map Infrastructure CharacterStudio manifest groups into domain CharacterTraitManifest shape.
 * Keeps domain free of fetch/URL resolution; assetKey stays the validated model URL string key.
 */
export function toCharacterTraitManifest(input: {
  format: 'vrm' | 'glb';
  groups: readonly {
    id: string;
    name: string;
    required: boolean;
    initial: boolean;
    assets: readonly { id: string; name: string; modelUrl: string }[];
  }[];
}): import('../../../domains/character/avatar').CharacterTraitManifest {
  return {
    format: input.format,
    groups: input.groups.map((group) => ({
      id: group.id,
      name: group.name,
      required: group.required,
      initial: group.initial,
      assets: group.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        assetKey: asset.modelUrl,
      })),
    })),
  };
}
