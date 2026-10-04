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
  ├─ semantic V1 channels (RAW anatomical)
  ├─ #445 dense features (RAW anatomical, same frame)
  └─ #446 iris (untouched; own mirror)
        ↓
  Hybrid Face Solver (anatomical space, frame-local)
        ↓
  mirror ONCE (LIVEACT_MIRROR_AVATAR)  ← single orientation boundary
        ↓
  existing map → smooth → calibrate → retarget → avatar output
```

### Orientation contract

```text
Hybrid solver coordinate/orientation authority = anatomical
```

| Stage | Orientation | Notes |
|-------|-------------|-------|
| RAW semantic | anatomical | MediaPipe source |
| RAW dense | anatomical | same-frame #445 |
| Hybrid fusion | anatomical | semantic + dense share L/R |
| Mirror | exactly once | `mirrorLiveActSourceSample` after hybrid apply |
| map / calibrate / output | avatar | when `LIVEACT_MIRROR_AVATAR` |

Hard rules:

- no double mirror
- no scattered L/R swaps inside fusion
- no asset-specific mirror hacks
- dense is never fused against already-mirrored semantic

Pipeline position (justified):

```text
RAW anatomical semantic + RAW anatomical dense (same sequence)
→ hybrid fusion (anatomical)
→ mirror exactly once
→ existing downstream calibration/smoothing
```

Fusion before calibration so dense and semantic share the same pre-calibration
scale. No fusion on stale dense (sequence mismatch → exact semantic fallback).

### Fusion decision order

1. missing/unavailable
2. semantic-only fallback
3. dense-only (explicit allow)
4. strong high-confidence disagreement → semantic authority
5. under-response correction
6. over-response correction
7. agreement refinement / soft disagree

### Jaw / press / roll geometry rules (#447)

- `chinDrop` / `chinForward` are static anatomical distances → **not** motion
  activation. Neutral-relative chin/jaw geometry → **#449**.
- `jawOpen` dense evidence = `gapCenter` only when clearly open (`> 0.08`).
- Inverse lip-gap alone ≠ press/roll. Inverse-gap may strengthen only when
  compression evidence is already active.

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
| jawOpen | jawOpen | gapCenter (dynamic open only; chinDrop deferred to #449) |
| jawForward | jawForward | semantic authority (#449 for neutral-relative chin) |

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

- Gate metric `activeUnderResponseMedianAbs` (active under-response controls only)
  ≥ **0.05** absolute vs V1. Same value is reported in evidence JSON and asserted
  by the gate (no private alternate success path).
- Clean baseline: evaluate **active controls only**
  (`|latent| ≥ 0.05` OR `|v1−hybrid| ≥ 0.02`). Every active control must satisfy
  hybridError ≤ v1Error + **0.02**. Global median over inactive zeros is forbidden.
- Cross-talk ratio must not worsen by > **0.05** absolute vs V1.
- Realistic neutral geometry (`hy-neutral-realistic-geometry`) must not activate
  jaw/press/roll/smile/cheek/nose from static anatomy alone.

### Speech-like sequences

- lip dynamic correlation (#444 Pearson) stays ≥ 0.95 (do not claim “improved”
  if numerically lower than V1)
- amplitude / velocity retention reported honestly
- saturation not worse
- return-to-neutral: hybrid must reach ~0 when evidence is neutral (no stale state)

### Conductor Experience (PERFORMANCE mode)

- **CE-04** Immediate acknowledgement: no extra interaction latency beyond #444
  performance-fidelity latency contract (solver is frame-local, same detect tick).
- **CE-20** Degraded operation: dense unavailable/stale/invalid/low-confidence →
  exact V1 semantic fallback; LiveAct face path remains operational.
- Other CE gates: N/A — no UI/control surface changed in this runtime slice.

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
