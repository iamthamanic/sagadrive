# Acceptance: liveact-adaptive-temporal-solver (#448)

## Intent

Replace V1 fixed frame EMA with a time-based, signal-group adaptive temporal
solver that reduces jitter without killing performance dynamics.

## Preconditions

- #446 Iris Gaze CLOSED on main
- #447 Hybrid Face CLOSED on main
- `smoothLiveActFrame` retained as V1 A/B baseline
- Pipeline order remains map → temporal → calibration → retarget

## Happy Path

- [ ] `SagaDriveLiveActTemporalV1` contract + policy version
- [ ] Production path uses adaptive temporal (Diagnostics SMOOTHED = adaptive)
- [ ] V1 fixed EMA unchanged and used for fair A/B
- [ ] Per-group policies: head / gaze / blink / lips / brows / cheeksNose / default
- [ ] Continuous-time one-pole with adaptive tau (no prediction/momentum)
- [ ] Head jitter improved or held vs V1; fast response acceptable
- [ ] Gaze rapid response; #446 regression PASS
- [ ] Blink peak preserved (≥0.95); no cross-talk regression
- [ ] Lips 1–5 Hz: amplitude 90–110%, lag p95 ≤66 ms, return ≤70 ms, sat <5%
- [ ] Speech A/B via #444 metrics reported honestly
- [ ] Lost / reacquire / model-swap / pause-long-gap / dropped frames safe
- [ ] Deterministic; 30/60 Hz comparable
- [ ] Authoritative gate in test-gate; aggregate evidence committed
- [ ] Privacy: no biometric persistence / raw face series

## Edge Cases

- [ ] dt ≤0 / non-finite → safe default dt
- [ ] dt > LONG_GAP → rebase
- [ ] lost during smile → reacquire neutral does not revive smile
- [ ] bindOutput model swap clears temporal state (not calibration)
- [ ] stop/dispose clears temporal state

## Conductor Experience

- [ ] **CE-04 Immediate acknowledgement** — lip lag p95 ≤66 ms; gaze remains fast; runtime delay targets from #444 hold
- [ ] **CE-20 Degraded operation** — lost/reacquire/dropped frames: usable degraded path; no stale performance leakage
- [ ] Other CE gates: `N/A — no user-facing control surface changed`

## Non-goals

- [ ] No #449 personal ranges / noise floors / persistent actor temporal profile
- [ ] No #450 morph/rig changes
- [ ] No #446 / #447 solver changes
- [ ] No LiveActFrameV1 pollution with temporal metadata

## Quality

- [x] `scripts/liveact-adaptive-temporal-solver-check.mjs` PASS
- [x] `npm run test-gate` PASS
- [x] Existing #423 / #424 / #444 / #445 / #446 / #447 gates PASS

## Implementation Notes

- Contract: `SagaDriveLiveActTemporalV1` / policy `liveact-temporal-policy-v1`
- Algorithm: adaptive continuous-time one-pole; production via `stepLiveActCalibratedFrame` default `adaptive`
- V1 baseline: `smoothLiveActFrame(α=0.35)` via `mode: 'v1-fixed'`
- Lifecycle: lost face neutral + head/eyes ease; reacquire rebases; `bindOutput` clears `pipelineStep`
- Gate: `scripts/liveact-adaptive-temporal-solver-check.mjs`
- Evidence: `.qa/evidence/liveact-adaptive-temporal-solver/ab-adaptive-vs-v1.json`
