# Design: liveact-hybrid-mouth-face-solver (#447)

## Why

V1 ARKit52/MediaPipe semantic weights are coarse. `#445` dense geometry already
exposes lips/cheeks/nose/jaw scalars with availability/confidence. `#447` fuses
both into better semantic performance controls for mouth, cheek, and nasolabial —
without 478→vertex warp, new morphs, temporal filtering, or actor calibration.

## Boundaries (hard)

```text
semantic evidence
≠
dense geometric evidence
≠
hybrid semantic output
≠
avatar deformation
```

```text
#447 fusion
≠
#448 temporal filtering
≠
#449 actor calibration
≠
#450 extended rig
```

```text
#447 face fusion
≠
#446 iris gaze
```

ARKit52 / `SagaDriveLiveActFaceV1` remains the compatibility layer. Hybrid does
not invent new morph channels. Dense evidence confirms/corrects/asymmetry-refines
existing controls.

## Architecture

```text
MediaPipe FaceLandmarker (single inference)
  ├─ semantic V1 channels (RAW)
  ├─ #445 dense features (same frame)
  └─ #446 iris (untouched)
        ↓
  Hybrid Face Solver (frame-local)
        ↓
  selected semantic face controls
        ↓
  existing map → smooth → calibrate → retarget → avatar output
```

Pipeline position (justified):

```text
RAW semantic + RAW dense (same sequence)
→ HYBRID MAPPED semantic controls
→ existing downstream calibration/smoothing
```

Fusion before calibration so dense and semantic share the same pre-calibration
scale. No fusion on stale dense (sequence mismatch → exact semantic fallback).

## Contract

`SagaDriveLiveActHybridFaceV1`

- semantic output controls (subset of `LIVEACT_FACE_CHANNELS`)
- per-control confidence
- per-control source: `semantic` | `hybrid` | `dense` | `unavailable`
- no raw landmarks, no mesh indices, not embedded in `LiveActFrameV1`

## Hybridized controls (dense evidence exists)

| Control | Semantic | Dense evidence |
|---------|----------|----------------|
| mouthSmileLeft/Right | mouthSmile* | corner*, curvature, cheekRaise* |
| mouthPucker | mouthPucker | width↓, protrusion, compression, contour |
| mouthFunnel | mouthFunnel | width, protrusion, gap/contour (distinct from pucker) |
| mouthPressLeft/Right | mouthPress* | compression + gap (L/R only if side gap available) |
| mouthRollUpper/Lower | mouthRoll* | upper/lower contour + gap (semantic-first if weak) |
| mouthUpperUpLeft/Right | mouthUpperUp* | upperContour stations + gap |
| mouthLowerDownLeft/Right | mouthLowerDown* | lowerContour stations + gap |
| cheekSquintLeft/Right | cheekSquint* | raise*, compression* |
| cheekPuff | cheekPuff | volumeProxy / compression (proxy, not physical volume) |
| noseSneerLeft/Right | noseSneer* | alar*, nasolabial* |
| jawOpen | jawOpen | chinDrop + gapCenter |
| jawForward | jawForward | chinForward (only if dense strong) |

Pass-through (no dense invention): dimple, frown, stretch, shrug, mouthLeft/Right, etc.

## Fusion primitives (reusable)

1. **passthrough** — no dense evidence → exact semantic
2. **confirmRefine** — both agree → preserve semantic, modest dense refine
3. **correctUnder** — semantic weak, dense strong → hybrid toward dense
4. **correctOver** — semantic overshoots dense → pull toward dense
5. **disagree** — both high, conflict → semantic authority + confidence↓
6. **unavailable** — both weak → unavailable / prior safe semantic

No global `0.5/0.5`. No `value * 4` gain hacks. No actor-neutral absolute lipWidth→stretch
mapping without #449 (absolute baselines are not used as sole evidence).

## Confidence

`conf = f(semConf, denseConf, agreement)`  
Disagreement → lower confidence. Missing dense → semantic confidence only.

## A/B success rules (predeclared)

Authority: `#444` metrics.

### Motion

- On under-/over-response fixtures: median abs control error vs latent truth
  improves by ≥ **0.05** absolute (meaningful threshold).
- On clean semantic==truth fixtures: hybrid error ≤ V1 error + **0.02** (non-degradation).
- Cross-talk ratio must not worsen by > **0.05** absolute vs V1.

### Speech-like sequences

- lip dynamic correlation (#444 Pearson) improves OR stays ≥ 0.95
- amplitude retention nearer 100% / within #444 band
- saturation not worse
- velocity retention reported (no temporal fix)
- return-to-neutral: hybrid must reach ~0 when evidence is neutral (no stale state)

### Contour labeling

- `evaluateDenseFeatureLipContour` = **input/dense feature contour** only
- Avatar/output contour fidelity = **NOT_MEASURED — requires #450/#451**

## #450 gaps (not implemented here)

| Dense capability | ARKit52 cannot represent | → |
|------------------|--------------------------|---|
| nasolabial fold intensity as fold | only noseSneer | #450 |
| richer cheek volume | cheekPuff/squint coarse | #450 |
| segmented lip contour correctives | coarse upper/lower morphs | #450 |

## Privacy

No raw landmarks, webcam, or biometric time-series. Synthetic fixtures + aggregate A/B only.

## Non-goals

Temporal solver, personal calib, new morphs, gaze changes, second inference, Gain-4 clipping.
