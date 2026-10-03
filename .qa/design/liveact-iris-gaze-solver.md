# Design: liveact-iris-gaze-solver (#446)

## Why

V1 gaze from `eyeLook*` blendshapes is a coarse planar/semantic proxy. Premium
Fidelity needs a geometric, head-local, per-eye iris solver with measurable angular
error against `#444` targets — and a documented win vs blendshape-only baseline.

## Boundaries (hard)

```text
Iris Geometry Solver
≠
Personal Calibration V2 (#449)
```

```text
Gaze estimation
≠
eyelid-follow
```

```text
Per-eye solution
→ fallback arbitration
→ existing single exclusive gaze-output path (#403)
```

No second avatar gaze driver. No morph additions. No temporal filter (#448).

## Architecture

```text
FaceLandmarker faceLandmarks
  → MediaPipeIrisGeometryAdapter (indices stay in infrastructure)
  → ProviderNeutralEyeGeometry (contours + iris centroid)
  → #445 buildDenseFaceLocalFrame (reuse — no second basis)
  → per-eye eyeball-sphere solve → yaw/pitch + confidence
  → arbitration vs blendshape gaze
  → LiveActSourceSample eyeLeft/Right X/Y
  → existing map/smooth/calibrate/retarget → exclusive output path
```

## Iris landmark provenance (`@mediapipe/tasks-vision@0.10.14`)

| Group | API | Indices |
|-------|-----|---------|
| Anatomical LEFT iris contour | `FACE_LANDMARKS_LEFT_IRIS` | 474, 475, 476, 477 |
| Anatomical RIGHT iris contour | `FACE_LANDMARKS_RIGHT_IRIS` | 469, 470, 471, 472 |

Connection sets export **no** separate center indices. Iris center =
`centroid(contour[4])`. Do not hardcode 468/473.

## Geometry method (eyeball sphere)

1. Eye-local basis: origin = contour center; +X anatomical left along outer↔inner;
   +Y lid-up orthogonalized; +Z = cross (face-forward).
2. Eyeball radius `R = halfWidth / sin(MAX_YAW)` so aperture edge ↔ ±35° yaw.
3. Eyeball center behind eyelid plane by `R * cos(MAX_YAW)`.
4. Gaze direction = `normalize(irisCenter − eyeballCenter)` in eye axes → yaw/pitch.

No free degree multipliers. No asset-specific constants.

## Face / eye frames

- Face-local: reuse `#445` (origin eye midpoint, +X anatomical left, +Y up, +Z nose-forward, scale interocular).
- Units: degrees internally for yaw/pitch; normalized −1..1 via `yaw/MAX_YAW`, `pitch/MAX_PITCH` for LiveAct channels.
- Sign: +yaw = anatomical left, +pitch = up.

## Head-relative Hard Contract

Identical eye-in-head pose under head yaw/pitch/roll (and combined) must yield the same
gaze within benchmark tolerance. No screen-/world-fixed target.

## Fair A/B (no sabotage)

```text
predictionIris       = sphere solve on synthetic eye-sphere fixtures
predictionBlendshape = planar aperture read → eyeLook encode → V1 source mapper
```

- Same geometry fixtures for both paths.
- V1 path reuses authoritative `mapMediaPipeFaceToLiveActSample` (via eyeLook encode).
- **No** artificial gain compression, **no** injected head-leak into blendshape baseline.
- Structural difference: planar `offset/halfWidth` vs sphere `asin`/`atan2` geometry.

Angular error (primary A/B): `acos(dot)` on **3D** unit gaze directions from yaw/pitch
(Phase 11; same definition as `#444`, magnitude-sensitive). `#444` 2D unit-vector metric
is also reported (direction-only).

Meaningful improvement: median absolute reduction ≥ **0.5°** (above numerical noise).

## Fallback

Blendshape `eyeLook*` path remains secondary evidence and fallback when iris geometry
is unavailable / low confidence / degenerate. Arbitration prefers iris when confidence
≥ threshold; otherwise blendshape (per-eye or full).

## Minimal neutral offset

Optional solver-local `gazeNeutralOffsetLeft/Right` only. Default zero.
Synthetic canonical fixture must pass without calibration. Not `#449`.

## Measurement (#444 authority)

Targets:

- median angular error ≤ 3°
- p95 ≤ 5°
- neutral normalized offset ≤ 0.03
- L/R disagreement at far gaze ≤ 2° when measurable

**Success:** iris path must show measurable gain vs fair V1 baseline. If not → `#446 BLOCKED`
(no threshold weakening).

## Privacy

Iris contours / centers: transient, local-only. Not in `LiveActFrameV1`, not networked,
not committed. Synthetic eye geometry fixtures only in-repo.

## Follow-ups

| Issue | Role |
|-------|------|
| #447 | mouth/cheek/nasolabial → avatar |
| #448 | temporal dynamics |
| #449 | personal calibration V2 |
| #451 | premium E2E |
