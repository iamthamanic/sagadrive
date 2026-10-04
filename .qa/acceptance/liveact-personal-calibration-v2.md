# Acceptance: liveact-personal-calibration-v2 (#449)

## Intent

Ship a guided ~20–40 s local Personal Calibration V2 that produces a versioned
fingerprint-bound profile (neutral, range, noise floor, asymmetry, cross-talk,
N/A) and measurably improves on generic V1 calibration without cloud biometrics
or #448/#450 scope creep.

## Surface classification

| Surface | Class |
|---------|-------|
| Character Studio LiveAct Settings | Workstation / SETUP |
| Premium capture phase | SETUP flow with live capture |

Not a pure Performance HUD.

## Preconditions

- #448 Adaptive Temporal on main
- LiveAct tracking can be active
- Design artifact present

## Happy Path

1. User starts Premium Calibration V2 from LiveAct SETUP UI
2. Six phases complete via **valid capture duration** (≤40 s guided when tracking is good; dropouts may extend wall clock)
3. Profile V2 saved local-only under owner+character scope with solver fingerprint
4. Runtime: map → temporal → personal apply → retarget
5. A/B evidence shows measurable improvement vs V1 generic

## Edge Cases

- Skip/N/A wink or weak brow → no gain×4 explosion
- Fingerprint mismatch → needsRecalibration / incompatible; V1 fallback
- Character / owner switch → scoped reload; no silent wrong profile
- Missing owner or character → no `_default` persistent profile
- Lost tracking mid-phase → capture clock + countdown pause; clear degraded copy
- Classic V1 calibrate still works and **overrides Personal for the session**
- localStorage failure → session-active profile + truthful session-only copy

## Scope isolation

- Profiles are **owner + character** scoped
- No `_default` cross-user / cross-character leakage
- Shared engine detaches prior profile on scope switch

## Capture validity

- Phase advances on **valid capture time**, not wall time
- Tracking lost does not accumulate capture ms across large gaps
- Insufficient samples cannot finalize a valid profile
- Countdown shows remaining valid capture duration (pauses when lost)

## Classic fallback

- Explicit Classic selection clears runtime Personal for the session
- Classic baseline/range actually apply in the calibration stage
- Persisted Premium entry is not deleted by Classic
- Reload / new engine with scope may load Premium again

## Persistence degraded mode

- Failed local save → `persisted: false` + session-only German copy
- Capture may still apply for the running session
- No crash; no false „gespeichert“

## CE Coverage

| Gate | Coverage |
|------|----------|
| CE-04 Immediate acknowledgement | Premium start updates UI immediately; phase prompts within capture timers |
| CE-11 Touch targets | Premium + Skip critical actions ≥44×44 px (Phone/Tablet) |
| CE-20 Degraded operation | Skip/N/A/fingerprint/lost tracking/storage fail → usable degraded; no false success |

## AU Coverage

| Gate | Coverage |
|------|----------|
| AU-01 Overflow | Calibration controls remain usable at 320px; German labels wrap without horizontal overflow |
| AU-02 Touch targets | Premium Kalibrierung + Überspringen (N/A) ≥44×44 px on Phone/Tablet (`min-h-11`) |
| AU-03 Safe Areas | N/A — no new fixed edge chrome |
| AU-04 Keyboard | Premium + Skip keyboard reachable with visible focus |
| AU-05 Hover-only | N/A for these actions — primary path is click/tap |
| AU-06 Recomposition | Workstation SETUP remains intentionally usable on Phone (reduced composition) |
| AU-07 Touch parity | No calibration action hover-only |
| AU-08 Accessibility | Focus / accessible names / phase + paused state clarity |
| AU-09 Motion | N/A — no new decorative motion for #449 |
| AU-10 Token fidelity | Existing Button / theme primitives |
| AU-11 Contrast | Existing slate/amber status tokens on dark SETUP panel |
| AU-12 RTL | N/A — DE product surface |
| AU-13 Reduced motion | N/A — no new motion dependency |
| AU-14 Density | N/A — SETUP density follows existing LiveAct panel |
| AU-15 German labels | `Premium Kalibrierung (20–40s)` and `Überspringen (N/A)` must not break layout |

## Security Coverage

| Item | How |
|------|-----|
| F/P local-only biometrics | Profile scalars in localStorage; no network upload |
| No raw face persistence | Gate bans media under evidence roots |
| Owner/character scoping | Storage key includes both ids; fail closed without scope |
| P input | Capability marks are enumerated enums |

## Non-goals

- #448 temporal policy changes / personal taus
- #450 morphs / nasolabial assets
- Server biometrics
- Speech ASR / transcription

## Implementation Notes

- Contract: `SagaDriveLiveActCalibrationProfileV2` + policy `liveact-personal-calibration-policy-v1`
- Scope: `LiveActPersonalCalibrationScopeV1 { ownerLocalId, characterLocalId }`
- Domain: capture/finalize/apply/store under `liveact-personal-calibration-*.ts`
- Engine: `setPersonalCalibrationScope` + `calibratePersonalV2()`; classic `calibrate()` session-overrides Personal
- Apply seat: after #448 temporal; paired L/R gains from stronger span
- Persistence: `localStorage` key `sagadrive.liveact.calibrationProfile.v2:<owner>:<character>`
- UI: Premium + Skip ≥44px; verify-ui required (Phone/Tablet/Desktop)
- Gate: `scripts/liveact-personal-calibration-v2-check.mjs`
