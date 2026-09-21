/**
 * LiveAct runtime policy — FPS/UI throttle and inference backpressure (#335).
 * Location: src/domains/character/liveact/liveact-runtime-policy.ts
 *
 * Pure domain constants/helpers; no React/DOM/MediaPipe.
 */

/** React-facing status/metrics must not update faster than this rate. */
export const LIVEACT_UI_STATUS_MAX_HZ = 5;

/** Face inference must never queue — at most one detect in flight. */
export const LIVEACT_INFERENCE_MAX_IN_FLIGHT = 1;

export function liveActUiStatusMinIntervalMs(
  maxHz: number = LIVEACT_UI_STATUS_MAX_HZ,
): number {
  return 1000 / Math.max(1, maxHz);
}

/** True when another UI status emit should be skipped (coalesce to maxHz). */
export function shouldThrottleLiveActUiStatus(
  lastEmitMs: number,
  nowMs: number,
  maxHz: number = LIVEACT_UI_STATUS_MAX_HZ,
): boolean {
  if (lastEmitMs <= 0) return false;
  return nowMs - lastEmitMs < liveActUiStatusMinIntervalMs(maxHz);
}

/** True when a new inference tick should be dropped (prior still running). */
export function shouldDropLiveActInferenceTick(
  inFlightCount: number,
  maxInFlight: number = LIVEACT_INFERENCE_MAX_IN_FLIGHT,
): boolean {
  return inFlightCount >= Math.max(1, maxInFlight);
}
