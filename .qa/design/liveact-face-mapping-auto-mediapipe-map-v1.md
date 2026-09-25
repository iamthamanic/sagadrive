# MediaPipe → SagaDriveFaceAnchorsV1 Map V1 (#421)

**Version:** `MediaPipeSagaDriveFaceAnchorMapV1`  
**Code:** `src/infrastructure/character/liveact/mediapipe-sagadrive-face-anchor-map-v1.ts`

Left/Right = anatomical (subject), aligned to official MediaPipe Face Landmarker topology:

- `FaceLandmarker.FACE_LANDMARKS_LEFT_EYE` contains **263, 362, 386…**
- `FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE` contains **33, 133, 159…**

Do **not** use historic `LIVEACT_FACE_METRIC_LANDMARK_INDICES.mouthLeft=61` / `leftEyeOuter=33` for anatomical-left Auto Mapping — those names predate this topology check and remain for the mirrored webcam LiveAct metric path.

Unmirrored frontal character render: subject's anatomical left appears at **higher image X**.

## Mapping table

| Anchor | Indices | Kind | Laterality | Region | Rationale |
|--------|---------|------|------------|--------|-----------|
| noseTip | 1 | single | center | midline | Face Mesh nose tip |
| chin | 152 | single | center | midline | Chin midpoint |
| forehead | 10 | single | center | midline | Mid-forehead (not iris) |
| mouthUpper | 13 | single | center | mouth | Upper lip outer center |
| mouthLower | 14 | single | center | mouth | Lower lip outer center |
| mouthCornerLeft | **291** | single | left | mouth | Anatomical left (LEFT topology) |
| mouthCornerRight | **61** | single | right | mouth | Anatomical right (RIGHT topology) |
| eyeLeftInner | **362** | single | left | eye_left | LEFT_EYE inner canthus |
| eyeLeftOuter | **263** | single | left | eye_left | LEFT_EYE outer canthus |
| eyeLeftUpper | **386,385,387** | centroid | left | eye_left | LEFT_EYE upper lid |
| eyeLeftLower | **374,380,373** | centroid | left | eye_left | LEFT_EYE lower lid |
| eyeRightInner | **133** | single | right | eye_right | RIGHT_EYE inner canthus |
| eyeRightOuter | **33** | single | right | eye_right | RIGHT_EYE outer canthus |
| eyeRightUpper | **159,158,157** | centroid | right | eye_right | RIGHT_EYE upper lid |
| eyeRightLower | **145,144,153** | centroid | right | eye_right | RIGHT_EYE lower lid |
| browLeftInner | **336** | single | left | brow_left | LEFT_EYEBROW near glabella |
| browLeftCenter | **334** | single | left | brow_left | LEFT_EYEBROW mid |
| browLeftOuter | **300** | single | left | brow_left | LEFT_EYEBROW temple |
| browRightInner | **107** | single | right | brow_right | RIGHT_EYEBROW near glabella |
| browRightCenter | **105** | single | right | brow_right | RIGHT_EYEBROW mid |
| browRightOuter | **70** | single | right | brow_right | RIGHT_EYEBROW temple |

## L/R evidence

Independent check (does not read our `laterality` field for expected X):

1. Import `@mediapipe/tasks-vision` `FaceLandmarker.FACE_LANDMARKS_LEFT_EYE` / `RIGHT_EYE`
2. Assert map `eyeLeftOuter` ∈ LEFT set, `eyeRightOuter` ∈ RIGHT set
3. Place landmark **indices** 263/291 at high X and 33/61 at low X; assert resolved mouthCornerLeft.x > mouthCornerRight.x

## Ground-truth compare

- Freeze reference **before** Auto apply (`freezeFaceMappingGroundTruthReference`)
- `source=auto` + `reviewed=false` → `validForGroundTruthComparison=false` (no fake 0px PASS)
- Mark GT via UI → `manual_override` + `reviewed=true` for all bound anchors

## Surface semantics

See `face-mapping-surface-semantics-v1.ts` — provider-neutral class from node identity tokens (`Eyes`→eyeball, `Eyelashes`→eyelash, `Head`→face_skin). Eyeball is **not** OK for canthus/lids.

## Known V1 limits (Epic #442 later)

- no full upper/lower lip curve
- no detailed cheek / nasolabial surface
- no iris/pupil representation
- no detailed lid curve

These 21 anchors are authoring/QA ground truth — **not** max LiveAct tracking resolution.
