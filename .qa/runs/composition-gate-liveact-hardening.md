# Composition Gate — liveact-hardening (#335)

## Flow

User toggles tracking → `LiveActEngine.start(deviceId?)` → generation token → getUserMedia (capped FPS) → capped rAF loop → backpressure drop → throttled status → frame output to avatar / diagnostics ref.

## Hop chain

1. `useLiveActViewport` acquires shared engine; explicit tracking toggle only
2. Engine `startGeneration` guards async camera + detector setup
3. Loop: FPS cap → `shouldDropLiveActInferenceTick` → single `detect` → `processSample`
4. `emitStatus(force)` — immediate on status change; ≤5 Hz on steady active/lost ticks
5. `switchCameraDevice` / `devicechange` → stream reopen, tracks stopped on cleanup
6. Portrait: `capturePortraitDataUrl` → `runWithoutHelper` (no rig bones in GL)

## Simulations

| Case | Expected | Result |
|------|----------|--------|
| Inference backlog | drop tick, no queue | pass (inFlight + shouldDrop) |
| UI flood on active | ≤5 Hz status | pass (shouldThrottle + coalesce) |
| Stop during start | generation mismatch → cleanup | pass (startGeneration) |
| Denied camera | typed denied | pass (NotAllowedError path) |
| Face lost | lost status | pass (existing map/smooth) |
| Privacy | no storage/analytics in liveact stack | pass (hardening-check grep) |

## Flags

- Worker transport: deferred (documented evidence)
