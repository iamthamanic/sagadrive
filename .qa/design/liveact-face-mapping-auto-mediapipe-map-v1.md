# MediaPipe → SagaDriveFaceAnchorsV1 Map V1 (#421)

**Version:** `MediaPipeSagaDriveFaceAnchorMapV1`  
**Semantics:** `.qa/design/liveact-face-anchor-semantics-v1.md` (`SagaDriveFaceAnchorSemanticsV1`)  
**Code:** `src/infrastructure/character/liveact/mediapipe-sagadrive-face-anchor-map-v1.ts`

Left/Right = anatomical (subject), aligned to official MediaPipe Face Landmarker topology:

- `FaceLandmarker.FACE_LANDMARKS_LEFT_EYE` contains **263, 362, 386…**
- `FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE` contains **33, 133, 159…**
- Lips outer/inner centers from `FACE_LANDMARKS_LIPS`: outer upper **0**, inner upper **13**, inner lower **14**, outer lower **17**

Do **not** use historic `LIVEACT_FACE_METRIC_LANDMARK_INDICES.mouthLeft=61` / `leftEyeOuter=33` for anatomical-left Auto Mapping.

Unmirrored frontal character render: subject's anatomical left appears at **higher image X**.

## Mapping table

| Anchor | Indices | Kind | Laterality | Region | Rationale |
|--------|---------|------|------------|--------|-----------|
| noseTip | 1 | single | center | midline | Face Mesh nose tip |
| chin | **175,199** | midpoint | center | midline | Chin pad (not oval bottom 152) |
| forehead | **151,10** | midpoint | center | midline | Visible forehead (not hairline-only 10) |
| mouthUpper | **0,13** | midpoint | center | mouth | Upper lip body (not seam-only 13) |
| mouthLower | **14,17** | midpoint | center | mouth | Lower lip body (not seam-only 14) |
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
| browLeftCenter | **296,334,282** | centroid | left | brow_left | LEFT_EYEBROW mid-arc centerline |
| browLeftOuter | **300** | single | left | brow_left | LEFT_EYEBROW temple |
| browRightInner | **107** | single | right | brow_right | RIGHT_EYEBROW near glabella |
| browRightCenter | **66,105,52** | centroid | right | brow_right | RIGHT_EYEBROW mid-arc centerline |
| browRightOuter | **70** | single | right | brow_right | RIGHT_EYEBROW temple |

## L/R evidence

Independent check (does not read our `laterality` field for expected X):

1. Import `@mediapipe/tasks-vision` `FaceLandmarker.FACE_LANDMARKS_LEFT_EYE` / `RIGHT_EYE`
2. Assert map `eyeLeftOuter` ∈ LEFT set, `eyeRightOuter` ∈ RIGHT set
3. Place landmark **indices** 263/291 at high X and 33/61 at low X; assert resolved mouthCornerLeft.x > mouthCornerRight.x

## Surface semantics

See `face-mapping-surface-semantics-v1.ts` — provider-neutral class from node identity tokens (`Eyes`→eyeball, `Eyelashes`→eyelash, `Teeth`/`Tongue`→`oral_interior`, `Head`→face_skin).

- Canthus / lids: allow `eyelid_or_skin` | `face_skin` only
- **Reject** eyeball and **eyelash** for lids (#421 fail-closed; functional eyelash follow-proof is #422+)
- Mouth/nose/chin/forehead: `face_skin` only
- **`oral_interior` forbidden for all 21 anchors**
- `unknown` (unlabeled `*_mesh` / HighRes skins without semantic tokens) is allowed when the anchor expects `face_skin` — not an asset-name allowlist

## Ground-truth compare

- Freeze reference **before** Auto apply (`freezeFaceMappingGroundTruthReference`)
- `validForGroundTruthComparison=true` **only** when all 21 anchors are bound **and** each has `reviewed=true` **and** `source` is `manual`|`manual_override` **and** `reviewedAt` is a valid ISO timestamp **and** binding surface semantics OK
- Eyes/Eyelashes/Teeth/Tongue bindings → marker `invalid` → not GT
- `source=manual` / `manual_override` alone is **not** enough; `auto+reviewed` is never GT

## Surface-aware Auto raycast (#421)

Shared `listFaceMappingRaycastCandidates` (ordered near→far). Manual still uses first hit.

Auto:

1. Classify each candidate; `isFaceMappingSurfaceSemanticsOk(anchorId, class)`
2. Take first allowed hit within a **depth gate** of the nearest hit
3. If only deeper allowed hits exist → **same-ray expanded depth** (keep original MediaPipe screen point)
4. Else small **screen snap** biased by lid/canthus, radius ~0.12× interocular px
5. Else `surface_mismatch` with candidate diagnostics on the Auto session export

## #422 Verification Points (not done in #421)

- Mouth Upper/Lower under `jawOpen` / speech: do lip-body bindings separate correctly on face_skin?
- Brow `Eyebrows` vs `Body` co-deformation under brow expressions

## Known V1 limits (Epic #442 later)

- no full upper/lower lip curve
- no detailed cheek / nasolabial surface
- no iris/pupil representation
- no detailed lid curve

These 21 anchors are authoring/QA ground truth — **not** max LiveAct tracking resolution.
