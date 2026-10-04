# Design: liveact-personal-calibration-v2 (#449)

## Why

V1 calibration is a long max-pass script (~81 s holds, 16 steps) that builds
ephemeral `neutral + gain=min(4,1/span)` only. It over-amplifies weak incidental
channels, ignores noise floor / asymmetry / cross-talk, and is not persisted.
#449 adds a **20–40 s** actor-specific Premium Calibration V2 with a versioned
local profile.

## Boundaries (hard)

```text
Personal Calibration V2
≠
Temporal Solver (#448 policies)
≠
Retarget Gain
≠
#447 Hybrid fusion
≠
#446 Iris gaze solve
≠
#450 Morph / contour assets
```

```text
map → adaptive temporal → personal/V1 calibration → retarget → avatar
```

Do **not** reorder calibration before temporal. Do **not** retune #448 taus.

## Pipeline seat

Capture samples from oriented hybrid source (same as V1 `tickCalibration`).
Runtime apply uses post-temporal frames (unchanged seat).

V1 guided flow remains available as **fallback / classic**.

## Profile contract

`SagaDriveLiveActCalibrationProfileV2`

- `solverFingerprint` over dense / iris / hybrid / temporal+policy / profile version
- per-channel: capability, neutral, usableMin/Max, noiseFloor, confidence, asymmetry, crossTalk
- gaze + head ranges
- speech aggregate evidence only (no audio/transcript stack)
- status: `valid | needsMigration | needsRecalibration | incompatible`

## Capture choreography (~34.5 s)

| Phase | ~ms | Focus |
|-------|-----|-------|
| neutral | 4500 | noise floor + neutral |
| headGaze | 6500 | yaw/pitch/roll + gaze L/R/U/D |
| eyesBrows | 5500 | blink, wink L/R (N/A ok), brows |
| jawSmile | 5500 | jawOpen, smile L/R (no forced symmetry) |
| lips | 7000 | pucker/funnel/press/roll/upper/lower |
| speech | 5500 | short fixed phrase proxy |

Skip/N/A marks capability without huge gains.

## Finalize rules

- Noise floor: robust deviation from neutral phase (MAD-style)
- Range: intentional quantile span; min usable span; weak → capability `weak`, gain 1
- No artificial L/R averaging
- Cross-talk: counterpart peak during intended unilateral actions (evidence)
- Convert to apply: neutral subtract + deadzone + sparse gains (cap retained)

## Persistence Scope

```text
ownerLocalId (authenticated account)
+
characterLocalId (stable character domain id)
```

Storage key (semantic):

```text
sagadrive.liveact.calibrationProfile.v2:<owner>:<character>
```

No shared `_default` key. Incomplete scope ⇒ **no persistent load/save**
(session-only capture allowed; fail closed).

Draft characters (`draft`) are not persistable.

## Missing Scope

```text
session-only / no persistent profile
```

Engine must not load or write a fallback profile when owner or character is unknown.

## Capture Clock

```text
valid capture duration (validCaptureMs)
not wall time
```

- Only bounded gaps between consecutive valid samples accumulate (`≤ maxSampleGapMs`)
- Tracking lost pauses progress and countdown
- Phase completion requires `validCaptureMs ≥ phase.durationMs` **and** min valid frames
- One recovered frame after a long dropout cannot finish a phase

## Calibration Mode

```text
Personal V2  — fingerprint-bound local profile; preferred path
Classic V1   — session-only override when explicitly started
```

When the user starts **Klassisch kalibrieren**:

- Runtime `personalProfile` is cleared for the session so Classic baseline/range actually apply
- Persisted Premium profile is **not** deleted
- New engine / reload with scope may load Premium again

## Persistence Failure

```text
profile remains session-active
but not persisted
```

UI must not claim „gespeichert“ when `localStorage` write fails.
Copy: session-only / Speichern nicht verfügbar.

## Privacy

Persists only derived calibration scalars, ranges, noise floor, capability/N/A, fingerprint.
Never: raw landmarks, iris points, webcam frames, face time-series, audio/video.
No network/cloud.

## A/B

A = V1 generic finalize · B = Profile V2 · #444 measurement authority.
Must improve ≥1 of: neutral bias, weak-channel false amp, asymmetry, cross-talk,
gaze offset — without regressing speech/lip fidelity targets.

## CE

- CE-04: guided flow acknowledges immediately; capture latency within phase timers
- CE-20: skip/N/A/fingerprint mismatch → usable degraded (V1 or recalibrate prompt)
- Adaptive UI: SETUP + live capture substate; phone/tablet/desktop
