# Composition Gate — liveact-hybrid-mouth-face-solver (#447)

- Verdict: **CLEAR**
- Branch: `agent/liveact-hybrid-mouth-face-solver`
- Previous HEAD: a1252957222d6f48ac22d2a1b7bce0e7fd8e554f
- Base/main: 8136a3c90af8ffa164afdd9365876836c41d5c18

## Hop chain (happy path)

```text
MediaPipe FaceLandmarker (single inference)
→ anatomical semantic V1 channels (RAW)
→ anatomical #445 dense features (same sequence)
→ Hybrid Face Solver (anatomical orientation authority)
→ applyHybridFaceToSemantic (anatomical)
→ mirror exactly once (LIVEACT_MIRROR_AVATAR)
→ existing map → smooth → calibrate → retarget
→ avatar face output
```

## Degraded path (CE-20)

```text
dense missing / stale sequence / invalid / low confidence
→ exact V1 semantic passthrough (no hybrid correction)
→ mirror once → map/calibrate/retarget
→ avatar remains operational (no LiveAct face collapse)
```

## Orientation authority

- Hybrid fusion space = **anatomical**
- Single mirror point = after hybrid apply, before map/calibrate
- No double mirror; no L/R swaps inside fusion
- #446 iris keeps its own mirror path (unchanged)

## Cardinality / identity

- One face detect → one hybrid face side-channel + one semantic face frame
- No fan-out, queue, or second inference
- Dense never reused across sequences

## Flags

none
