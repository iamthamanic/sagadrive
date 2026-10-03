# Design: liveact-dense-face-features (#445)

## Why

Blendshape-only LiveAct V1 lacks geometric lip/lid/cheek/nose signal. MediaPipe already
emits dense face landmarks; #445 turns them into a **provider-neutral Dense Feature Frame**
for later solvers (#446–#449). Measurement authority remains #444.

## Boundaries (hard)

```text
Raw landmarks     = provider-local + ephemeral
Dense Features    = provider-neutral + semantic
Avatar Controls   = later solver (#447+)
```

```text
Dense Feature Extraction
≠ Temporal Filtering (#448)
≠ Actor Calibration (#449)
≠ Avatar Retargeting (#447 / V1)
≠ Iris Gaze Solver (#446)
```

`SagaDriveLiveActFrameV1` is **unchanged** — no landmark arrays, no dense payload.

## Architecture

```text
MediaPipe Face Landmarks
  → provider adapter (indices → named semantic points)  [infrastructure]
  → face-local orthonormal normalization                  [domain]
  → region feature extraction                            [domain]
  → SagaDriveLiveActDenseFaceFeaturesV1                  [domain]
  → engine side-channel listener (future #446/#447)
```

## Normalization

- **Origin:** midpoint of anatomical left/right eye centers (upper-face).
- **+X:** anatomical left ← from right eye center toward left eye center.
- **+Y:** upper-face up (toward forehead), Gram–Schmidt vs X.
- **+Z:** `cross(X,Y)`, sign stabilized so nose tip has **+Z** (face-forward proxy).
- **Scale:** interocular distance (eye-center to eye-center).
- Mouth/jaw **must not** define the basis (expression must not warp the frame).

Fail closed on degenerate scale / non-orthonormalizable basis → `normalizationStatus: degenerate`,
features unavailable.

## Feature families (units)

All values are **face-scale-normalized** (local coordinates after `/ scale`).

| Region | Signals | Unit / meaning |
|--------|---------|----------------|
| lips | width, gap L/C/R, upper/lower contour stations (5), curvature, compression, protrusion, corners, asymmetry | normalized distance / displacement / depth proxy / signed curvature |
| eyes | opening L/R, upper/lower lid L/R | normalized lid aperture / displacement |
| brows | inner/mid/outer L/R | normalized displacement vs eye reference |
| cheeks | raise / compression / volume proxy L/R | geometric proxy (not physical volume) |
| nose | alar L/R, nasolabial L/R, width proxy | geometric proxy |
| jaw | chinDrop, chinForward proxy, jawWidth | normalized displacement / depth proxy |

**Monocular limits:** protrusion, cheek volume, nasolabial, chinForward are **RGB depth proxies**,
not millimetre reconstruction.

## Availability / confidence

- Unavailable → `value: null` (never fake `0`).
- Confidence = face-level detection confidence × geometric availability (finite, required points).
- No “looks plausible → 0.9” inventing.

## Privacy

Raw landmarks and live dense frames: local-only, ephemeral, not networked, not persisted,
not committed. Synthetic semantic geometry fixtures only in-repo.

## Follow-ups

| Issue | Consumes | Builds |
|-------|----------|--------|
| #446 | eye/lid (+ transient iris if needed) | iris gaze solver |
| #447 | lips, cheeks, nose, jaw | hybrid → avatar controls |
| #448 | feature/control time series | temporal dynamics |
| #449 | actor ranges | personal calibration |

## #444

Reuses Perfect Fidelity contracts/targets. Contour geometry becomes measurable at **feature**
level; E2E avatar lip contour fidelity remains later (#447/#451). Gaze runtime target stays
`NOT_MEASURED` until #446.
