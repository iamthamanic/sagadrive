# Feature: LiveAct 7/7 — Hardening + E2E

<!-- issue #335 -->

## Intent

Harden LiveAct for production: inference backpressure, UI throttle, start/stop races, camera switch, privacy/cleanup invariants, and reproducible browser acceptance.

## Happy Path

- [ ] Desktop ≤30 FPS / mobile ≤15 FPS caps unchanged; at most one synchronous inference tick in flight (drops instead of queue)
- [ ] React status/metrics via `subscribeStatus` throttled to ≤5 Hz; avatar output still per processed frame
- [ ] `startGeneration` invalidates late async camera/detector setup; stop/dispose bump generation
- [ ] Camera `deviceId` selection + `switchCameraDevice`; `devicechange` reopens stream
- [ ] Portrait capture uses `runWithoutHelper` (no bones overlay in GL snapshot)
- [ ] Diagnostics/landmarks never touch storage or analytics paths
- [ ] `scripts/liveact-hardening-check.mjs` + `npm run test-gate` green
- [ ] `e2e/liveact-viewport-smoke.spec.ts` with fake camera green when run locally/CI

## Edge Cases

- [ ] Start→stop→start: no duplicate tracks; claim released
- [ ] Permission denied → typed `denied` status
- [ ] Face lost → `lost` status + neutral ease
- [ ] Tab hidden → `paused`
- [ ] Model revision swaps output bind without second engine

## Inference transport

- [ ] Main-thread `detectForVideo` retained with in-flight gate (see `.qa/evidence/liveact-hardening-inference-path.md`)
- [ ] Worker + `ImageBitmap` deferred until trace shows render-blocking regression

## Regression

- [ ] LiveAct slices #329–#334 checks unchanged
