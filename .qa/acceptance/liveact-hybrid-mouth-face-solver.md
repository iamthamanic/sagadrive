# Acceptance: liveact-hybrid-mouth-face-solver (#447)

## Contract / Solver

- [x] `SagaDriveLiveActHybridFaceV1` with semantic controls + confidence + source
- [x] No raw landmarks / mesh indices in contract
- [x] Explicit fusion rules for smile / pucker / funnel / press / lips / cheek / nose / jaw
- [x] Exact V1 semantic fallback when dense unavailable / stale sequence
- [x] Frame-local (no temporal state)
- [x] ARKit52 compatibility: only existing face channels written into LiveActFrameV1.face
- [x] #446 iris path unaffected

## Measurement

- [x] Fair A/B: semantic-only V1 vs hybrid on same latent-truth fixtures
- [x] Meaningful motion error improvement ≥ 0.05 on known-limitation scenarios
- [x] Clean baseline non-degradation (≤ +0.02)
- [x] Speech correlation / amplitude / saturation / cross-talk / return-to-neutral via #444 metrics
- [x] Avatar contour fidelity labeled NOT_MEASURED (#450/#451)
- [x] No Gain-4 clipping

## Quality

- [x] Authoritative gate `scripts/liveact-hybrid-mouth-face-solver-check.mjs` in test-gate
- [ ] `npm run test-gate` PASS
- [ ] Existing #444 / #445 / #446 / #423 / #424 gates still PASS
- [x] Privacy: no committed biometric time-series / webcam

## Non-goals

- Temporal solver, personal calib V2, extended morphs, gaze, 478→vertex
