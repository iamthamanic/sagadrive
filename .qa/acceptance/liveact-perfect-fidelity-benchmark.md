# Feature: LiveAct Perfect Fidelity V2 1/8 — Benchmark Contract

<!-- #444 — liveact-perfect-fidelity-benchmark -->

## Intent
Versionierter Fidelity-/Capture-/Report-Contract plus deterministische Motion-V2- und Speech-Time-Series-Harnesses, bevor Solver-Slices starten.

## Preconditions
- [x] Epic #418 / #424 V1 baseline on main
- [x] Design `.qa/design/liveact-perfect-fidelity-benchmark.md` present

## Happy Path
- [x] Versioned Perfect Fidelity contract + stretch targets
- [x] Capture contract: six stages, sequence alignment, monotonic time
- [x] Motion V2: settle / hold / return; isolated face/gaze/head probes
- [x] Speech: genuine time-series + deterministic synthetic fixture
- [x] Metrics: FPS, drops, latency, correlation, lag, amplitude/velocity retention, jitter, saturation, cross-talk, neutral, return-to-neutral, gaze error schema, contour error schema
- [x] Synthetic fixtures with golden expected results (incl. known latency)
- [x] Honest V1 baseline report (PASS/MISS/NOT_MEASURED; no threshold weakening)
- [x] Privacy guard: no real webcam/landmark fixtures committed
- [x] Authoritative check in `npm run test-gate`
- [x] Touched files: zero type escape hatches

## Edge Cases
- [x] Missing stage → recorded, not interpolated
- [x] Degenerate amplitude span → NOT_APPLICABLE (not fake 100%)
- [x] Synthetic timing ≠ claimed camera latency
- [x] Determinism: two runs equal (ignore measuredAt)

## Out of scope
#445–#451 solvers, gain/deadZone tuning, new morphs, landmark arrays on LiveActFrameV1.

## Composition Gate
synthetic/live input → RAW→…→APPLIED → capture → time-series → metrics → target comparison → report
