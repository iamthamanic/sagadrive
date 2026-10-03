# LiveAct Perfect Fidelity Benchmark (#444)

Feature slug: `liveact-perfect-fidelity-benchmark`

## Status
**READY** — Epic #442 slice 1/8. Measurement foundation only.

## Intent
Define versioned, reproducible Perfect-Fidelity **measurement** before any V2 solver work.
Peak-only / saturation-only fidelity is insufficient for speech and temporal quality.

## Why
V1 (#418/#424) proved functional channels and RAW→APPLIED identity.
Premium fidelity needs time-series evidence: correlation, lag, amplitude/velocity retention,
jitter, saturation, cross-talk, return-to-neutral, FPS/drops, latency — plus schemas for
gaze angular error and lip contour error that later slices (#445–#447) will populate.

## Hard separation

```text
Measurement Contract  ≠  Runtime Solver
V1 Compatibility Baseline  ≠  Perfect Fidelity Target
```

#444 measures. It does **not** retune gains, rewrite retarget, or add dense/iris solvers.
A clean `MISS` against stretch targets is a valid #444 outcome.

## Pipeline stages (fixed)

```text
RAW → MAPPED → SMOOTHED → CALIBRATED → RETARGETED → APPLIED
```

Aligned by `sequence`. Missing stages are recorded as missing — never filled from prior samples.

## Contracts
- Fidelity: `SagaDriveLiveActPerfectFidelityV1`
- Capture: `SagaDriveLiveActFidelityCaptureV1`
- Report: `SagaDriveLiveActFidelityReportV1`
- Targets: versioned stretch set inside PerfectFidelity contract (not industry standards)

## Metric statuses
`PASS` | `MISS` | `NOT_MEASURED` | `NOT_APPLICABLE`

`NOT_MEASURED` is never treated as PASS.

## Motion Test V2
Phases per probe: `SETTLE` → `HOLD` → `RETURN_TO_NEUTRAL` (optional ramp samples tagged separately).
Nominal fixture rate: 30 Hz; timeline by sample index (not `setTimeout` jitter).

## Speech
Genuine time-series (not min/max peaks). Synthetic speech fixture for CI.
Local real webcam capture allowed only as gitignored raw path; committed reports are aggregated metrics only.

## Privacy
Never commit webcam frames, real landmark/iris time-series, or biometric calibration traces.
Persist derived scalars only (e.g. mouthWidth, contour error %).

## Authoritative gate
`scripts/liveact-perfect-fidelity-benchmark-check.mjs` (wired in `test-gate`).
Existing `liveact-facial-fidelity-v2-check.mjs` remains gaze-exclusivity / channel-table (#403) — not the #444 entry point.

## Follow-up ownership
| Symptom class | Issue |
|---------------|-------|
| Dense geometry / contour | #445 |
| Gaze / iris | #446 |
| Mouth / cheek / nasolabial | #447 |
| Temporal dynamics | #448 |
| Actor calibration | #449 |
| Performance Face asset | #450 |
| Premium E2E | #451 |

## Non-goals
Dense solver, iris runtime, hybrid mouth solver, temporal solver, personal cal V2,
new morphs, retarget tuning, neural models, inflating `SagaDriveLiveActFrameV1` with landmarks.
