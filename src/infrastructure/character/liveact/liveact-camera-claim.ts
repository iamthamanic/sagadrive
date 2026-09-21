/**
 * Shared camera claim — at most one LiveAct or legacy Face Tracking owner (#329 / #244).
 * Location: src/infrastructure/character/liveact/liveact-camera-claim.ts
 *
 * Tiny coordination module to avoid circular imports between engines.
 */

export type LiveActCameraClaimStoppable = {
  stop(): void;
};

let activeClaim: LiveActCameraClaimStoppable | null = null;

export function claimLiveActCamera(owner: LiveActCameraClaimStoppable): void {
  if (activeClaim && activeClaim !== owner) {
    activeClaim.stop();
  }
  activeClaim = owner;
}

export function releaseLiveActCamera(owner: LiveActCameraClaimStoppable): void {
  if (activeClaim === owner) {
    activeClaim = null;
  }
}

export function getActiveLiveActCameraClaim(): LiveActCameraClaimStoppable | null {
  return activeClaim;
}
