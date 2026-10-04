# Acceptance: liveact-hybrid-mouth-face-solver (#447)

## Contract / Solver

- [x] `SagaDriveLiveActHybridFaceV1` with semantic controls + confidence + source
- [x] No raw landmarks / mesh indices in contract
- [x] Explicit fusion rules for smile / pucker / funnel / press / lips / cheek / nose / jaw
- [x] Fusion decision order: disagreement before under/over correction
- [x] Exact V1 semantic fallback when dense unavailable / stale sequence
- [x] Frame-local (no temporal state)
- [x] Orientation authority = anatomical; mirror exactly once after hybrid
- [x] Static `chinDrop` not used as jawOpen motion; press/roll gated on compression
- [x] ARKit52 compatibility: only existing face channels written into LiveActFrameV1.face
- [x] #446 iris path unaffected

## Measurement

- [x] Fair A/B: semantic-only V1 vs hybrid on same latent-truth fixtures
- [x] Meaningful motion error improvement ≥ 0.05 on active under-response controls
      (`activeUnderResponseMedianAbs` reported + gated identically)
- [x] Clean active-control non-degradation (≤ +0.02 per active control)
- [x] Neutral leakage: realistic anatomical geometry does not activate jaw/press/roll
- [x] Speech correlation / amplitude / saturation / cross-talk / return-to-neutral via #444 metrics
- [x] Avatar contour fidelity labeled NOT_MEASURED (#450/#451)
- [x] No Gain-4 clipping

## Conductor Experience (`docs/concepts/conductor-experience-contract.md`)

LiveAct during Performance = PERFORMANCE mode.

- [x] **CE-04 Immediate acknowledgement** — hybrid solve is frame-local on the same
      MediaPipe detect tick; no additional interaction/feedback latency beyond the
      existing #444 performance-fidelity latency metrics contract.
- [x] **CE-20 Degraded operation** — dense unavailable / stale / invalid /
      low-confidence → exact V1 semantic fallback; face path remains fully usable
      (no LiveAct collapse).
- [x] **CE-01 / CE-02 / CE-03 / CE-05…CE-19** — `N/A — no UI/control surface changed`
      in this pure runtime fusion slice.

## Quality

- [x] Authoritative gate `scripts/liveact-hybrid-mouth-face-solver-check.mjs` in test-gate
- [x] `npm run test-gate` PASS
- [x] Existing #444 / #445 / #446 / #423 / #424 gates still PASS
- [x] Privacy: no committed biometric time-series / webcam

## Non-goals

- Temporal solver, personal calib V2, extended morphs, gaze, 478→vertex
- #449 neutral-relative chin/jaw geometry
- #450 nasolabial fold / richer cheek / segmented lip contour morphs
