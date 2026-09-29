/**
 * face-mapping-base-face-capture-visibility — scoped visibility for MediaPipe Auto capture (#421).
 * Location: src/infrastructure/character/avatar/face-mapping-base-face-capture-visibility.ts
 *
 * MediaPipe IMAGE capture must see the uncovered base face. Face-mapping raycast already
 * excludes equipment; this helper temporarily hides the same runtime equipment ownership
 * and reveals bases that equipment had masked — then restores exact prior .visible state.
 *
 * No trait/inventory/persist mutation. Callers MUST invoke restore() in finally.
 */

import type * as THREE from 'three';

export interface FaceMappingVisibilitySnapshotEntry {
  readonly object: THREE.Object3D;
  readonly visible: boolean;
}

/**
 * Hide equipment roots and reveal temporarily masked base surfaces for one capture.
 * Returns restore() that reapplies the exact prior visibility (including already-hidden).
 */
export function beginFaceMappingBaseFaceCaptureVisibility(params: {
  readonly hide: readonly THREE.Object3D[];
  readonly reveal: readonly THREE.Object3D[];
}): () => void {
  const saved: FaceMappingVisibilitySnapshotEntry[] = [];
  const seen = new Set<THREE.Object3D>();

  const remember = (object: THREE.Object3D): void => {
    if (seen.has(object)) return;
    seen.add(object);
    saved.push({ object, visible: object.visible });
  };

  for (const object of params.hide) {
    remember(object);
    object.visible = false;
  }
  for (const object of params.reveal) {
    remember(object);
    object.visible = true;
  }

  return () => {
    for (let i = saved.length - 1; i >= 0; i -= 1) {
      const entry = saved[i];
      if (!entry) continue;
      entry.object.visible = entry.visible;
    }
  };
}

/**
 * Run fn while capture visibility is active; always restores, including on throw.
 */
export function withFaceMappingBaseFaceCaptureVisibility<T>(
  params: {
    readonly hide: readonly THREE.Object3D[];
    readonly reveal: readonly THREE.Object3D[];
  },
  fn: () => T,
): T {
  const restore = beginFaceMappingBaseFaceCaptureVisibility(params);
  try {
    return fn();
  } finally {
    restore();
  }
}
