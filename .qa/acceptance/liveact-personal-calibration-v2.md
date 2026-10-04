# Acceptance: liveact-personal-calibration-v2 (#449)

## Intent

Ship a guided ~20–40 s local Personal Calibration V2 that produces a versioned
fingerprint-bound profile (neutral, range, noise floor, asymmetry, cross-talk,
N/A) and measurably improves on generic V1 calibration without cloud biometrics
or #448/#450 scope creep.

## Preconditions

- #448 Adaptive Temporal on main
- LiveAct tracking can be active
- Design artifact present

## Happy Path

1. User starts Premium Calibration V2 from LiveAct SETUP UI
2. Six phases complete in ≤40 s guided capture (skip optional)
3. Profile V2 saved local-only with solver fingerprint
4. Runtime: map → temporal → personal apply → retarget
5. A/B evidence shows measurable improvement vs V1 generic

## Edge Cases

- Skip/N/A wink or weak brow → no gain×4 explosion
- Fingerprint mismatch → needsRecalibration / incompatible; V1 fallback
- Character switch / storage cleared → no silent wrong profile
- Lost tracking mid-phase → degraded, no crash
- Classic V1 calibrate still works

## CE Coverage

| Gate | Coverage |
|------|----------|
| CE-04 Immediate acknowledgement | Premium start updates UI immediately; phase prompts within timers |
| CE-20 Degraded operation | Skip/N/A/fingerprint fail → V1 or prompt recalibrate; no stale incompatible apply |
| Other CE | N/A where no unrelated control surface |

## Security Coverage

| Item | How |
|------|-----|
| F/P local-only biometrics | Profile scalars in localStorage; no network upload |
| No raw face persistence | Gate bans media under evidence roots |
| P input | Capability marks are enumerated enums |

## Non-goals

- #448 temporal policy changes / personal taus
- #450 morphs / nasolabial assets
- Server biometrics
- Speech ASR / transcription

## Implementation Notes

- Contract: `SagaDriveLiveActCalibrationProfileV2` + policy `liveact-personal-calibration-policy-v1`
- Domain: capture/finalize/apply/store under `liveact-personal-calibration-*.ts`
- Engine: `calibratePersonalV2()` auto 6-phase (~34.5 s); classic `calibrate()` kept
- Apply seat: after #448 temporal; paired L/R gains from stronger span
- Persistence: `localStorage` key `sagadrive.liveact.calibrationProfile.v2:*`
- UI: Premium button + Überspringen (N/A) + Klassisch kalibrieren
- Gate: `scripts/liveact-personal-calibration-v2-check.mjs`
