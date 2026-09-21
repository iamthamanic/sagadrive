# Feature: LiveAct 6/7 — Editor/Player/Session shared runtime

<!-- issue #334 -->

## Intent

Migrate all local face-tracking consumers onto one `LiveActEngine` with shared camera claim. No second MediaPipe stack in productive paths.

## Happy Path

- [ ] Editor gear, Player panel, and Session (non-sm) use `useLiveActViewport` + shared singleton engine
- [ ] `AvatarCanvas` does not construct `AvatarFaceTrackingRuntime`
- [ ] Camera ownership via `claimLiveActCamera`; surface switch stops prior owner
- [ ] Player/Session keep compact start/stop UI (`LiveActSurfaceControls`)

## Edge Cases

- [ ] Editor + Session mounted: single camera owner
- [ ] Session `size="sm"`: no LiveAct hook / no tracking UI
- [ ] Unmount releases shared engine when last consumer gone

## Regression

- [ ] `npm run test-gate` green including `liveact-surface-migration-check.mjs`
