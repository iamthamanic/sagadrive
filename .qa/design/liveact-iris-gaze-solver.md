# Design: liveact-iris-gaze-solver (#446)

## Why

V1 gaze from MediaPipe `eyeLook*` blendshapes is a coarse semantic proxy. Premium
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
MediaPipe FaceLandmarker faceLandmarks
  → MediaPipeIrisGeometryAdapter (indices stay in infrastructure)
  → ProviderNeutralEyeGeometry (contours + iris centroid)
  → #445 buildDenseFaceLocalFrame (reuse — no second basis)
  → per-eye local solve → yaw/pitch + confidence
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

Eye contour corners/lids reuse `#421` / `#445` semantic points (no duplicate SoT).

## Face / eye frames

- Face-local: reuse `#445` (origin eye midpoint, +X anatomical left, +Y up, +Z nose-forward, scale interocular).
- Per-eye: origin = eye contour center; +X along outer↔inner; +Y lid-up orthogonalized; +Z = cross.
- Gaze = iris centroid offset in eye-local plane → yaw/pitch (degrees) and normalized −1..1 for `LiveActEyeGaze`.

## Head-relative Hard Contract

Identical eye-in-head pose under head yaw/pitch/roll (and combined) must yield the same
gaze within benchmark tolerance. No screen-/world-fixed target.

## Fallback

Blendshape `eyeLook*` path remains secondary evidence and fallback when iris geometry
is unavailable / low confidence / degenerate. Arbitration prefers iris when both eyes
available above confidence threshold; otherwise blendshape (per-eye or full).

## Minimal neutral offset

Optional solver-local `gazeNeutralOffsetLeft/Right` only. Not `#449` personal face profile.

## Measurement (#444 authority)

A/B on identical fixtures:

```text
V1 blendshape-only gaze
vs
Iris geometric gaze
```

Targets (stretch, versioned via `#444`):

- median angular error ≤ 3°
- p95 ≤ 5°
- neutral normalized offset ≤ 0.03
- L/R disagreement at far gaze ≤ 2° when measurable

**Success:** iris path must show measurable gain vs V1 baseline. If not → `#446 BLOCKED`
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
