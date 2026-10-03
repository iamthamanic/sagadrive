# Acceptance: liveact-iris-gaze-solver (#446)

## Contract / Solver

- [ ] `SagaDriveLiveActIrisGazeV1` (or repo-equivalent) with per-eye yaw/pitch/confidence/available
- [ ] Iris center = centroid of API contour (474–477 / 469–472); no undocumented centers
- [ ] No MediaPipe indices in domain solver
- [ ] Reuses `#445` `buildDenseFaceLocalFrame`
- [ ] Head-relative: rigid head transforms do not change neutral/in-head gaze
- [ ] Per-eye results (no early average in solver)
- [ ] Blendshape fallback retained
- [ ] Single exclusive avatar gaze output path (#403) — no second driver
- [ ] `LiveActFrameV1` still free of raw iris / landmark arrays

## Calibration scope

- [ ] At most minimal gaze-neutral offsets
- [ ] No `#449` personal face performance profile

## Measurement

- [ ] Frozen V1 blendshape baseline documented
- [ ] A/B vs iris on synthetic fixtures using `#444` angular metrics
- [ ] Iris median/p95 meet stretch targets on synthetic geometric fixtures
- [ ] **Measurable gain** vs blendshape-only baseline documented
- [ ] If no gain → issue not successful (`BLOCKED`)

## Quality

- [ ] Authoritative gate `scripts/liveact-iris-gaze-solver-check.mjs` in test-gate
- [ ] `npm run test-gate` PASS
- [ ] Existing `#444` / `#445` / `#423` / `#424` gates still PASS
- [ ] Privacy: no committed iris time-series / webcam frames

## Non-goals

- Mouth/cheek solver, temporal solver, personal calib V2, extended rig, premium E2E,
  new morphs, 478→mesh warp, TrueDepth, eyelid-follow fused into gaze
