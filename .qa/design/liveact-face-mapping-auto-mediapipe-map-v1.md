# MediaPipe → SagaDriveFaceAnchorsV1 Map V1 (#421)

**Version:** `MediaPipeSagaDriveFaceAnchorMapV1`  
**Code:** `src/infrastructure/character/liveact/mediapipe-sagadrive-face-anchor-map-v1.ts`

Left/Right = anatomical (subject), matching LiveAct RAW / `LIVEACT_FACE_METRIC_LANDMARK_INDICES`.  
Unmirrored frontal character render: subject's left appears at **higher image X**.

## Mapping table

| Anchor | Indices | Kind | Laterality | Region | Rationale |
|--------|---------|------|------------|--------|-----------|
| noseTip | 1 | single | center | midline | Face Mesh nose tip |
| chin | 152 | single | center | midline | Chin midpoint |
| forehead | 10 | single | center | midline | Mid-forehead (not iris) |
| mouthUpper | 13 | single | center | mouth | Same as LiveAct mouthGap upper |
| mouthLower | 14 | single | center | mouth | Same as LiveAct mouthGap lower |
| mouthCornerLeft | 61 | single | left | mouth | MediaPipe mouthLeft |
| mouthCornerRight | 291 | single | right | mouth | MediaPipe mouthRight |
| eyeLeftInner | 133 | single | left | eye_left | Inner canthus |
| eyeLeftOuter | 33 | single | left | eye_left | Outer canthus |
| eyeLeftUpper | 159,158,157 | centroid | left | eye_left | Upper lid stability |
| eyeLeftLower | 145,144,153 | centroid | left | eye_left | Lower lid stability |
| eyeRightInner | 362 | single | right | eye_right | Inner canthus |
| eyeRightOuter | 263 | single | right | eye_right | Outer canthus |
| eyeRightUpper | 386,385,387 | centroid | right | eye_right | Upper lid centroid |
| eyeRightLower | 374,380,373 | centroid | right | eye_right | Lower lid centroid |
| browLeftInner | 107 | single | left | brow_left | Near glabella |
| browLeftCenter | 105 | single | left | brow_left | LiveAct browLiftLeft |
| browLeftOuter | 70 | single | left | brow_left | Temple end |
| browRightInner | 336 | single | right | brow_right | Near glabella |
| browRightCenter | 334 | single | right | brow_right | LiveAct browLiftRight |
| browRightOuter | 300 | single | right | brow_right | Temple end |

## Availability / confidence

- Missing required landmarks → `missing_landmark` / `low_confidence`
- Raycast miss on allowlisted mesh → `raycast_miss`
- Confidence ≈ landmark availability × presence (no auto-publish)

## Known V1 limits (Epic #442 later)

- no full upper/lower lip curve
- no detailed cheek / nasolabial surface
- no iris/pupil representation
- no detailed lid curve

These 21 anchors are authoring/QA ground truth — **not** max LiveAct tracking resolution.
