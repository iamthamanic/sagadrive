# #449 Intake — Personal Performance Calibration V2

- Date: 2026-10-04
- Branch: `agent/liveact-personal-calibration-v2`
- Base/main: `c6a629fa9ebce038d92713f79989a9a9e1d8a171` (#448 squash via #507)
- Dependency: **#448 CLOSED** + Adaptive Temporal on main — satisfied
- Scope this run: **intake only** — no implementation

Feature slug (issue): `liveact-personal-calibration-v2`

---

## 1. Current pipeline (confirmed on main)

```text
MediaPipe detect
→ #445 dense + #446 iris → eyes
→ #447 hybrid (anatomical) → mirror once
→ mapLiveActSourceSample
→ stepAdaptiveTemporal (#448)
→ applyLiveActCalibration (neutral → range)
→ applyLiveActRetargetProfile
→ avatar
```

Key files:

| Role | Path |
|------|------|
| Engine | `src/infrastructure/character/liveact/liveact-engine.ts` |
| Calib domain | `src/domains/character/liveact/liveact-calibration.ts` |
| Temporal | `src/domains/character/liveact/liveact-temporal-solve.ts` |
| Retarget | `src/domains/character/liveact/liveact-retarget-profile.ts` |

**Order hard constraint:** #449 must **not** move calibration before temporal. Do not retune #448 policies.

Calibration sampling today uses **oriented** hybrid source samples in `tickCalibration()`; runtime apply uses **mapped + temporal** frames. V2 must document capture vs apply consistency.

---

## 2. Current V1 calibration architecture

### Contracts / types

- `LiveActNeutralBaselineV1` — averaged head / gaze / face channels
- `LiveActRangeCalibrationV1` — sparse `{ gain: Partial<Record<channel, number>> }`
- `LiveActCalibrationSetV1` — `{ neutral, range }`
- Apply: `applyLiveActCalibration` = range(gain) ∘ neutral(subtract)

### Behavior

- Neutral: accumulate `LIVEACT_CALIBRATION_FRAME_TARGET` (30) frames; timeout 2 s
- Range: per-step q95 peak − neutral; span `< LIVEACT_RANGE_MIN_SPAN` (0.1) → skip (1:1)
- Gain: `min(LIVEACT_RANGE_MAX_GAIN=4, 1/span)`
- Session-only in `LiveActEngine` — cleared on `dispose()`; **not** persisted
- UI copy: “nur diese Sitzung” / ephemeral

### Reuse vs replace

| Keep / reuse | Replace for V2 | V1 fallback |
|--------------|----------------|-------------|
| Pipeline seat after temporal | 15-step max-pass choreography (~81 s holds) | Keep guided ephemeral flow |
| Accumulator / apply math as seed | Naive gain=`1/span` as sole range model | Identity calib if no profile |
| Engine hooks + PiP shell | Session-only memory storage | `LiveActCalibrationSetV1` path |
| Privacy local-only asserts | Missing noise floor / N/A / asymmetry / speech | |

---

## 3. Current UI / flow

| Item | Detail |
|------|--------|
| Surface | Character Editor → Avatar settings (`AvatarPreviewSettings.tsx`) + PiP (`LiveActCameraPreview.tsx`) |
| Hook | `useLiveActViewport.ts` |
| Steps | 1 neutral + **15** range (`LIVEACT_RANGE_CALIBRATION_STEPS`) = **16** total |
| UX phase | `armed` → Start → `holding` → `review` → Weiter/Wiederholen |
| Hold sum | **81_000 ms** (+ ≤2 s neutral) — realistic **2–5+ min** with pacing |
| Classification | **SETUP** primary + live capture substate (camera + cues) |
| Responsive | Same Character Editor / PiP path — must stay phone/tablet/desktop capable (AU-* later) |

**#449 must not** extend this long max-pass list. Compact 20–40 s choreography required.

---

## 4. Local persistence

| Finding | Detail |
|---------|--------|
| Face calib today | Engine memory only; clipboard audit JSON export |
| Existing pattern | `localStorage` for UI prefs (`EntityBrowser`, `Layout`, item library) |
| IndexedDB | Not used under `src/` |
| Server/DB | No face-calib columns / Supabase biometrics |
| V2 recommendation | Device-local `localStorage` (or small wrapper) keyed by character/device + fingerprint; **no** network/cloud |

Forbidden persistence: webcam frames, mesh/iris time-series, raw landmark traces, speech/video recordings.

Allowed: derived scalars (neutral / range / noise / crosstalk / capability / confidence).

---

## 5. Proposed Profile V2 boundary (not implemented)

**Name:** `SagaDriveLiveActCalibrationProfileV2`

```text
contractVersion
solverFingerprint {
  denseFaceFeatures
  irisGaze
  hybridFace
  temporalContract
  temporalPolicy
  calibrationProfile
}
createdAtLocal
characterLocalId? (non-biometric handle)
neutral { head, gaze, face… }
channels[id] {
  capability: available | weak | skipped | unsupported | na
  neutral
  usableMin / usableMax
  noiseFloor
  confidence
  asymmetry?
  counterpartCrossTalk?
}
gaze { neutral, range L/R/U/D }
head { yaw/pitch/roll ranges }
speechEvidence { amplitude/velocity/saturation aggregates only }
status: valid | needsMigration | needsRecalibration | incompatible
```

### Solver fingerprint inputs (no asset filenames)

- `LIVEACT_DENSE_FACE_FEATURES_CONTRACT` / geometry contract (#445)
- `LIVEACT_IRIS_GAZE_CONTRACT` (#446)
- `LIVEACT_HYBRID_FACE_CONTRACT` (#447)
- `LIVEACT_TEMPORAL_CONTRACT` + `LIVEACT_TEMPORAL_POLICY_VERSION` (#448)
- Profile contract version (#449)

### Invalidation

| Event | Result |
|-------|--------|
| Fingerprint mismatch (solver/policy) | `needsRecalibration` or `incompatible` — never silent apply |
| Face contract change | `incompatible` |
| Character switch | load character-scoped profile or empty → V1 fallback |
| Storage cleared | empty → V1 fallback / prompt recalibrate |
| Old profile schema | `needsMigration` if migratable; else recalibrate |

---

## 6. Compact 20–40 s choreography (concept)

Replace 16 sequential review screens with **6 phases**, multi-action per phase, auto-advance where safe:

| # | Phase | ~s | Coverage |
|---|-------|----|----------|
| 1 | Neutral hold | 4–5 | head/eyes/face noise floor + neutral |
| 2 | Head + Gaze | 6–7 | yaw/pitch/roll; gaze L/R/U/D |
| 3 | Eyes + Brows | 5–6 | blink both; wink L/R (N/A ok); brows |
| 4 | Jaw + Smile | 5–6 | jawOpen; smile L/R (no forced symmetry) |
| 5 | Lips pack | 6–8 | pucker, funnel, upper/lower, press, roll |
| 6 | Short speech | 5–6 | fixed phrase; lip/jaw natural range + velocity |

**Estimated total:** ~31–38 s guided capture (+ brief N/A taps).  
Skip/N/A per capability without huge gain amplification.

---

## 7. Measurement plan (A/B)

| Arm | Definition |
|-----|------------|
| A | Generic / V1 `LiveActCalibrationSetV1` (current finalize) |
| B | Personal Profile V2 |

Same fixtures; **#444 Perfect Fidelity** remains measurement authority (plus targeted person-proxy fixtures).

Candidate metrics (must improve ≥1 without regressing others):

- neutral bias (head/gaze/face)
- usable amplitude / saturation
- weak-channel false amplification (gain-cap abuse)
- L/R asymmetry representation (no forced mean)
- counterpart cross-talk evidence
- gaze neutral offset
- speech fidelity (corr / lag / amp / velocity / return)

---

## 8. Privacy boundary

| Persist | Forbidden |
|---------|-----------|
| Derived profile scalars | Webcam / mesh / iris series |
| Local-only storage | Cloud / Supabase / telemetry upload |
| Aggregate evidence in `.qa` | Raw face recordings in repo |

---

## 9. #450 boundaries (measure ≠ render)

Mark `requires #450` when measured but not renderable today:

- nasolabial fold intensity beyond `noseSneer`
- rich cheek volume
- segmented lip contour morphs
- avatar contour fidelity (`NOT_MEASURED` in hybrid AB)

#449 stores capability/evidence; **no new morphs**.

---

## 10. Explicit non-goals this branch (until implement)

- No #448 temporal policy changes
- No personal temporal taus
- No #450 morphs
- No UI implementation yet (Adaptive UI / CE / THEME_GUIDE required at implement time)
- No server biometrics

## Verdict (intake)

`#449 ready to start` — dependency on #448 MERGED satisfied; architecture mapped; implementation not begun.
