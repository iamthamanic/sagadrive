/**
 * itemAssetPending — queues one 2D/3D action across auto-draft remount (#140/#141).
 * Location: src/app/items/visuals/itemAssetPending.ts
 */

export type PendingItemAssetAction =
  | { type: 'thumbnail-upload'; file: File }
  | { type: 'thumbnail-generate'; userExtra: string }
  | { type: 'model3d-upload'; file: File }
  | { type: 'model3d-generate' };

let pending: PendingItemAssetAction | null = null;

export function queuePendingItemAsset(action: PendingItemAssetAction): void {
  pending = action;
}

/** Take pending if present; optional type filter so 2D/3D hooks do not steal each other. */
export function takePendingItemAsset(
  types?: PendingItemAssetAction['type'][],
): PendingItemAssetAction | null {
  if (!pending) return null;
  if (types && !types.includes(pending.type)) return null;
  const next = pending;
  pending = null;
  return next;
}
