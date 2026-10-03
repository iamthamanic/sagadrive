# Acceptance: liveact-iris-gaze-solver (#446)

## Contract / Solver

- [x] `SagaDriveLiveActIrisGazeV1` with per-eye yaw/pitch/x/y/confidence/available
- [x] Iris center = centroid of API contour (474–477 / 469–472); no undocumented centers
- [x] No MediaPipe indices in domain solver
- [x] Eyeball-sphere geometric solve (not free degree multipliers)
- [x] Reuses `#445` `buildDenseFaceLocalFrame`
- [x] Head-relative: rigid head transforms do not change neutral/in-head gaze
- [x] Per-eye results (no early average in solver)
- [x] Blendshape fallback retained; unavailable iris → exact V1 equality
- [x] Single exclusive avatar gaze output path (#403) — no second driver
- [x] `LiveActFrameV1` still free of raw iris / landmark arrays

## Calibration scope

- [x] At most minimal gaze-neutral offsets (default zero)
- [x] No `#449` personal face performance profile

## Measurement (fair A/B)

- [x] Frozen V1 blendshape baseline documented
- [x] Fair V1 path: planar aperture → eyeLook encode → V1 source mapper (no gain sabotage)
- [x] Iris path: eyeball-sphere on same fixtures
- [x] Angular error: `acos(dot)` on 3D unit gaze directions (+ `#444` 2D report)
- [x] Meaningful improvement ≥ 0.5° median absolute
- [x] Iris median/p95/neutral meet `#444` stretch targets on synthetic fixtures
- [x] If no gain → issue not successful (`BLOCKED`)

## Quality

- [x] Authoritative gate `scripts/liveact-iris-gaze-solver-check.mjs` in test-gate
- [x] `npm run test-gate` PASS
- [x] Existing `#444` / `#445` / `#423` / `#424` gates still PASS
- [x] Privacy: no committed iris time-series / webcam frames

## Non-goals

- Mouth/cheek solver, temporal solver, personal calib V2, extended rig, premium E2E,
  new morphs, 478→mesh warp, TrueDepth, eyelid-follow fused into gaze
