/**
 * Index morph targets on a loaded avatar for LiveAct GLB output (#332).
 * Location: src/infrastructure/character/liveact/liveact-morph-target-index.ts
 */

import * as THREE from 'three';

export interface LiveActMorphTargetBinding {
  mesh: THREE.Mesh;
  index: number;
}

export type LiveActMorphTargetIndex = ReadonlyMap<string, readonly LiveActMorphTargetBinding[]>;

/** Collect morph target names → all mesh/index bindings (deterministic traversal order). */
export function buildLiveActMorphTargetIndex(root: THREE.Object3D): LiveActMorphTargetIndex {
  const map = new Map<string, LiveActMorphTargetBinding[]>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const dictionary = object.morphTargetDictionary;
    const influences = object.morphTargetInfluences;
    if (!dictionary || !influences) return;
    for (const [name, index] of Object.entries(dictionary)) {
      if (typeof index !== 'number') continue;
      const list = map.get(name) ?? [];
      list.push({ mesh: object, index });
      map.set(name, list);
    }
  });

  return map;
}

export function listLiveActMorphTargetNames(index: LiveActMorphTargetIndex): string[] {
  return [...index.keys()].sort();
}
