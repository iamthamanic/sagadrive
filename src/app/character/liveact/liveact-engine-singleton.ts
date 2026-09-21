/**
 * liveact-engine-singleton — one shared LiveActEngine for all surfaces (#334).
 * Location: src/app/character/liveact/liveact-engine-singleton.ts
 *
 * Editor, Player, and Session hooks acquire the same engine instance; ref-count
 * disposes only when no surface consumer remains mounted.
 */

import { LiveActEngine } from '../../../infrastructure/character/liveact';

let sharedEngine: LiveActEngine | null = null;
let consumerCount = 0;
let trackingConsumerCount = 0;

export function acquireSharedLiveActEngine(): LiveActEngine {
  if (!sharedEngine) {
    sharedEngine = new LiveActEngine();
  }
  consumerCount += 1;
  return sharedEngine;
}

export function releaseSharedLiveActEngine(): void {
  consumerCount = Math.max(0, consumerCount - 1);
  if (consumerCount === 0 && sharedEngine) {
    trackingConsumerCount = 0;
    sharedEngine.dispose();
    sharedEngine = null;
  }
}

/** Surface requested LiveAct tracking — stop camera only when no surface still wants it. */
export function acquireSharedLiveActTracking(): void {
  trackingConsumerCount += 1;
}

export function releaseSharedLiveActTracking(): void {
  trackingConsumerCount = Math.max(0, trackingConsumerCount - 1);
  if (trackingConsumerCount === 0) {
    sharedEngine?.stop();
  }
}

export function getSharedLiveActEngine(): LiveActEngine | null {
  return sharedEngine;
}
