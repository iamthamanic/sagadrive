# LiveAct inference path — QA evidence (#335)

## Decision

Keep synchronous MediaPipe `detectForVideo` on the main thread with:

- FPS cap (30 desktop / 15 mobile) via `requestAnimationFrame` + min delta
- **At most one inference in flight** — additional ticks increment `droppedInferenceFrames` instead of queueing

## Rationale

- Shared render + tracking thread already bounded by FPS cap and drop policy.
- No CI trace showing >8ms systematic blocking of Three.js `render()` attributable solely to face landmarker at capped rates.
- Worker transport (`liveact-face.worker.ts` + transferable `ImageBitmap`) remains the escalation path if future profiling on target hardware proves main-thread contention.

## Escalation criteria

- Median `detectForVideo` duration × capped FPS consumes >25% of a 16.6ms frame budget **and** dropped-frame rate stays elevated under desktop profile.

## Privacy

Worker messages (if added) must carry only frame inputs/results; no persistence; same `assertLiveActFrameLocalOnly` / diagnostics local-only asserts apply.
