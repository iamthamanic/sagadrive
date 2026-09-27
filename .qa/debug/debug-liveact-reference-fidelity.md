# Debug Report — `liveact-reference-fidelity`

**Date:** 2026-09-25  
**Project:** `sagadrive`  
**Shell:** web (Vite, port 3004)  
**Repro grade:** full (domain + three/three-vrm headless repro with real rest poses/clip; asset facts from VRM file)

---

## Summary

Five independent causes, not one: (A) the procedural Idle clip keeps playing during LiveAct and overwrites the head bone after `vrm.update()`; (B) engine smoothing feeds back the calibrated frame, so calibration subtracts the baseline ~2.9×; (C) without calibration, resting `eyeBlink` 0.17–0.28 is applied 1:1; (D) retarget is identity and MediaPipe under-reports; (E) the Reference VRM `jawOpen` expression does not bind the lower-teeth mesh.  
**Confidence:** high (A, B, E, D) · medium (C gaze part, A on SagaDrive GLB)

---

## Bug description

| | |
|--|--|
| **Expected** | Avatar mirrors camera 1:1: jaw + lower teeth open, eyes as open as the user's, head follows, no idle motion. |
| **Actual** | Lower teeth stay closed; avatar sways permanently; eyes droopier than user's; expressions weaker than camera; head does not follow roll. |
| **Steps** | 1. Mensch → Mesh-Vorlage „Reference VRM (ARKit52)“. 2. 3D Setup öffnen. 3. Tracking an (cal: OFF). 4. Mund weit öffnen. |

User evidence: `.qa/evidence/debug-liveact-reference-fidelity-user.png` (local only — contains the webcam image, not committed) — camera `roll −13°`, avatar head upright; `jawOpen=0.54` at maximal mouth opening; `eyeBlinkLeft=0.28 / Right=0.17` with open eyes; `cal: OFF`.

---

## Reproduction

### A — Idle clip overwrites LiveAct head (three + @pixiv/three-vrm, same render order)

Raw bones with Reference VRM authored local rests (`Head` x=−0.1567 ≈ −18°, `Spine2` ≈ +15°), `VRMHumanoid`, idle clip identical to `avatar-animation-runtime.ts` (tracks bound by rig-map names: raw `Spine`, normalized chest, raw `Head`). LiveAct sets normalized head roll 0.2 rad each frame; loop = `humanoid.update()` → `mixer.update()`.

```
head world pitch/yaw/roll (deg) — LiveAct roll 11.5° requested
without idle mixer: 0.0/0.0/11.5  0.0/0.0/11.5  0.0/0.0/11.5  0.0/0.0/11.5
with idle mixer   : 18.4/1.2/0.4  18.6/2.4/0.8  18.3/1.2/0.4  18.0/0.0/0.0
```

→ LiveAct head lost, head pitched +18° (authored rest replaced by identity), yaw 0↔2.4° at 1 Hz = „wackelt permanent“.

### B — Smoothing/calibration feedback (real domain functions, engine order)

`processSample`: `frame = applyLiveActNeutralBaseline(smoothLiveActFrame(this.frame, mapped))` — `this.frame` is already calibrated. Baseline blink 0.25, roll 0.10:

```
neutral again   expected blink 0.00 got 0.000 | expected roll 0.00 got -0.186
eyes closed     expected blink 0.60 got 0.136
mouth wide      expected jaw 0.58 got 0.543
head roll +0.3  expected roll 0.20 got 0.014
```

Steady state: `calibrated = raw − baseline/α` (α = 0.35 → 2.86×).

### E — Teeth binding gap (VRM JSON + morph deltas)

```
CUSTOM jawOpen -> H_DDS_HighRes[jawOpen]*1          (only the skin)
H_DDS_HighRes[jawOpen]                maxMove 20.3mm, 1538 verts (identical to MouthOpen_h)
h_TeethDown[h_teeth.t_MouthOpen_h]    maxMove 15.5mm, 4737 verts, mean dY −11.3mm   (unbound)
humanBones: no `jaw`
```

---

## Evidence

### Console / Network

No errors relevant to these symptoms (behavioural bugs, not exceptions).

### Code locations

- `src/infrastructure/character/avatar/character-studio-runtime.ts:282-290` — render loop `vrm.update()` then `animationRuntime.update()`; Idle auto-plays on bind (`avatar-animation-runtime.ts:181`), never paused for LiveAct.
- `src/infrastructure/character/avatar/avatar-animation-runtime.ts:82-87` — Idle: 1.0 s loop, absolute quaternions on spine/chest/head.
- `src/infrastructure/character/avatar/rig-analyzer.ts:62-84` — skeleton pass maps raw names first (`Head`, `Spine`), VRM normalized only as fallback (chest).
- `src/infrastructure/character/liveact/liveact-pose-drive.ts:10-21` — absolute head drive on normalized head (VRM).
- `src/infrastructure/character/liveact/liveact-engine.ts:481-484` — smoothing uses calibrated `this.frame` as previous.
- `src/domains/character/liveact/liveact-calibration.ts:136-176` — neutral subtraction only; no range normalization.
- `src/infrastructure/character/liveact/liveact-retarget-profile-registry.ts:29-33` — identity gain for all avatars.
- `src/infrastructure/character/liveact/liveact-pose-drive.ts:23-35` + VRM `lookAt.rangeMap*.outputScale = 10` — gaze input ≤ ~16° → eye bones ≤ ~1.8°.
- `src/domains/character/liveact/liveact-face-asset-contract.ts:55` — `tongueOut` excluded from V1 (MediaPipe provides none).

---

## Prior art

- [x] Repo grep — locations above.
- [x] GitHub: [#403](https://github.com/iamthamanic/sagadrive/issues/403) (closed) kept identity gains until RAW→APPLIED evidence; no issue for idle/calibration bugs.
- [x] `.qa/acceptance/liveact-face-retarget-profile.md` — identity until QA documents overrides.
- [ ] LightRAG — not queried.

---

## Root cause

- **A (runtime ownership):** two writers on the head/spine. The Idle mixer runs after `vrm.update()` and writes absolute quaternions to raw bones, discarding LiveAct's head pose and the VRM's authored raw rest rotations. Same ordering applies to GLB outputs (LiveAct writes raw head asynchronously; mixer wins at render) — not separately reproduced.
- **B (engine):** EMA state is the post-calibration frame; subtraction compounds each tick.
- **C (eyes):** with `cal: OFF` the resting MediaPipe `eyeBlink` (0.17–0.28 while open, higher with jaw open) closes lids 17–28 %. Calibrating today triggers B (blink reaches only 0.14 of 0.60). Gaze barely moves due to asset rangeMap + LiveAct target scale.
- **D (fidelity):** MediaPipe blendshapes saturate low (jawOpen 0.54 at max) and nothing rescales them (identity retarget, neutral-only calibration).
- **E (asset, Fall B):** incomplete `jawOpen` expression bind in the Reference VRM; LiveAct correctly drives what the asset declares.
- **F (tongue):** tongue exists (`h_TeethDown` `*_tg_h` morphs, e.g. `OutMiddle_tg_h` 37 mm) but is unbound and there is no tongue signal from MediaPipe.

**Fix attempts this bug:** 0

---

## Suggested fix (minimal, in order)

1. **A:** pause the animation runtime while a LiveAct output is bound to that runtime; resume on unbind (`character-studio-runtime.ts`, LiveAct bind path). Follow-up ticket: VRM rig map should prefer normalized bones so procedural clips never replace raw rests.
2. **B:** keep a separate `smoothedFrame` in the engine; `smooth(prevSmoothed, mapped)` → calibrate → retarget (`liveact-engine.ts`).
3. **C:** after 1+2, run „Kalibrieren“ with neutral face (removes resting blink).
4. **D:** range calibration (neutral + max pose → per-channel scale) or evidence-backed source gains in the retarget registry (source-side, not asset-specific). Product decision needed.
5. **E:** derived Reference VRM with `jawOpen` bind extended to `h_TeethDown[h_teeth.t_MouthOpen_h]` (offline patch script, CC BY 4.0 adaptation noted in ATTRIBUTION). No runtime compensation.
6. **F:** none with MediaPipe (out of scope).

**Regression guards:** engine-order check (repro B table as assertions); ownership check (repro A: head roll arrives while LiveAct bound); asset check (reference `jawOpen` binds lower teeth).

**Next step:** `@implement`

---

## Implementation (2026-09-25, scope „1–5“ + two-step calibration)

1. **A:** `AvatarAnimationRuntime.setSuspended()` stops all actions (mixer restores the rest pose) and skips `update()`; `play()`/`bind()` remember the request and resume replays it. `CharacterStudioRuntime.setLiveActDriveActive()` is called from the LiveAct bind effect in `AvatarSurfaceViewer.tsx` (card or 3D Setup runtime, reset in cleanup). In-app: Tracking on → „Animation pausiert — LiveAct steuert den Charakter.“, off → „Spielt Idle.“
2. **B:** `stepLiveActCalibratedFrame()` (domain) keeps the EMA on uncalibrated values; the stage order RAW → MAPPED → SMOOTHED → CALIBRATED (Diagnostics V2) is unchanged. While tracking is lost the last calibrated output eases to neutral and the smoothing state moves to the matching uncalibrated pose, so loss/re-acquire has no jump.
3. + 4. **C/D:** „Kalibrieren“ = step 1 neutral (30 frames ≤ 2 s) + step 2 max pass (5 s: Mund weit auf, Augen fest zu, Brauen hoch, breit lächeln). Per channel: gain = 1 / (p95 − neutral), only when span ≥ 0.10, capped at 4×; unexercised channels stay 1:1. Prompt + countdown on the camera PiP; PiP metrics show `cal: neutral` / `cal: neutral+max`. Session-only, like the baseline.
5. **E:** `scripts/lib/liveact-reference-vrm-teeth-binds.mjs` adds `h_TeethDown` twins to `jawOpen`/`jawLeft`/`jawRight`/`jawForward` (each ARKit jaw morph is byte-identical to `h_expressions.<Shape>`, twin `h_teeth.t_<Shape>`; directions verified). JSON chunk only, BIN byte-identical, idempotent; run via `node scripts/fetch-liveact-reference-vrm.mjs --skip-if-present`. ATTRIBUTION notes the CC BY change. Evidence: `.qa/evidence/liveact-teeth-bind-before-after.png`.

Regression guard: `scripts/liveact-fidelity-check.mjs` (test-gate) — table B as assertions, range gains, lost/re-acquire continuity, engine two-step state machine with controlled clock, idle suspend with the real `AvatarAnimationRuntime`, teeth patch on a synthetic GLB (+ local binary when present).

Not verifiable in the embedded browser: the calibration run itself (background tab → `requestAnimationFrame` 0 fps, engine loop does not tick); covered by the engine state-machine check.

---

## Notes

- Assumption: user frames in the screenshot are representative (single frame).
- Out of scope: gaze range tuning, tongue tracking, SagaDrive GLB morph quality.
