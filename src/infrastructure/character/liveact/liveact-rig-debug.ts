/**
 * liveact-rig-debug — SkeletonHelper debug layer for loaded avatar (#333).
 * Location: src/infrastructure/character/liveact/liveact-rig-debug.ts
 *
 * Uses the model's real SkinnedMesh skeleton only — no invented bones or rig rescan.
 */

import * as THREE from 'three';
import { SkeletonHelper } from 'three';

export interface LiveActRigDebugController {
  /** Rebind after model load/swap; pass null when model removed. */
  bindModelRoot(root: THREE.Object3D | null): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  hasSkeleton(): boolean;
  /** Hide helper during portrait capture (restores prior visibility after). */
  runWithoutHelper<T>(fn: () => T): T;
  dispose(): void;
}

function findPrimarySkinnedMesh(root: THREE.Object3D): THREE.SkinnedMesh | null {
  let best: THREE.SkinnedMesh | null = null;
  let bestBoneCount = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    const count = object.skeleton?.bones?.length ?? 0;
    if (count > bestBoneCount) {
      best = object;
      bestBoneCount = count;
    }
  });
  return best;
}

export function createLiveActRigDebugController(scene: THREE.Scene): LiveActRigDebugController {
  let modelRoot: THREE.Object3D | null = null;
  let helper: SkeletonHelper | null = null;
  let enabled = false;

  const removeHelper = (): void => {
    if (!helper) return;
    scene.remove(helper);
    helper.geometry.dispose();
    if (helper.material instanceof THREE.Material) {
      helper.material.dispose();
    }
    helper = null;
  };

  const rebuildHelper = (): void => {
    removeHelper();
    if (!modelRoot) return;
    const skinned = findPrimarySkinnedMesh(modelRoot);
    if (!skinned || !skinned.skeleton?.bones?.length) return;
    helper = new SkeletonHelper(skinned);
    helper.userData.sagadriveLiveActRigDebug = true;
    // Draw through the mesh so the debug overlay is actually visible.
    const materials = Array.isArray(helper.material) ? helper.material : [helper.material];
    for (const mat of materials) {
      if (mat && 'depthTest' in mat) {
        mat.depthTest = false;
        mat.depthWrite = false;
      }
    }
    helper.renderOrder = 10;
    helper.visible = enabled;
    scene.add(helper);
  };

  return {
    bindModelRoot(root) {
      modelRoot = root;
      rebuildHelper();
    },
    setEnabled(next) {
      enabled = next;
      if (helper) {
        helper.visible = next;
        return;
      }
      if (next && modelRoot) rebuildHelper();
    },
    isEnabled() {
      return enabled;
    },
    hasSkeleton() {
      if (!modelRoot) return false;
      return Boolean(findPrimarySkinnedMesh(modelRoot));
    },
    runWithoutHelper(fn) {
      if (helper) helper.visible = false;
      try {
        return fn();
      } finally {
        if (helper) helper.visible = enabled;
      }
    },
    dispose() {
      enabled = false;
      modelRoot = null;
      removeHelper();
    },
  };
}
