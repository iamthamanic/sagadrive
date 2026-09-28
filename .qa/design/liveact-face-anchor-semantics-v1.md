# SagaDrive Face Anchor Semantics V1 (#421)

**Contract:** `SagaDriveFaceAnchorSemanticsV1`  
**IDs:** unchanged `SagaDriveFaceAnchorId` (21) — see `face-anchor-contract.ts`  
**Evidence basis:** Human-in-the-loop Canonical V1 live test (PR #452). Manual GT defines *meaning*; MediaPipe must reproduce asset-neutrally.  
**Non-goals:** No hardcoded GT pixels, no asset-name overrides, no #422 functional QA, no V2 / #442.

Related map implementation: `mediapipe-sagadrive-face-anchor-map-v1.ts`  
Related surfaces: `face-mapping-surface-semantics-v1.ts`

## Shared rules

| Layer | Meaning |
|-------|---------|
| A — semantic screen / anatomical target | Where the marker *should* sit in a neutral frontal view |
| B — deforming mesh surface | Allowed surface class for a valid binding |

Manual: user screen point → ordered raycast → surface-aware select. **No** automatic screen-snap.  
Auto: MediaPipe sample → raycast at original sample → depth-gated allowed hit; **same-ray expanded depth** before screen-snap; snap only as last fallback. Diagnostics keep original vs resolved.

Laterality = **anatomical** subject L/R (not screen-left/right). Unmirrored frontal: anatomical left → higher image X.

Normative GT (all 21 required for `validForGroundTruthComparison`):
binding + `manual`|`manual_override` + `reviewed=true` + valid `reviewedAt` + **surface semantics OK**.

---

## Mouth

### mouthUpper
| Field | Definition |
|-------|------------|
| anatomical target | Center of the **visible upper-lip volume / surface** on the vertical midline |
| visual (neutral frontal) | Mid-upper vermillion body, clearly above the mouth opening |
| laterality | center |
| required surface | `face_skin` (`unknown` unlabeled skin OK; **not** `oral_interior`) |
| purpose | Upper lip authoring / QA anchor |
| MediaPipe strategy | **midpoint** of outer upper lip **0** and inner upper lip **13** (lip body, not seam alone) |
| ambiguity | 13 alone ≈ inner seam / opening — collapses toward mouthLower |
| neighbors | `mouthUpper.y < mouthLower.y`; distinct region from mouthLower |

### mouthLower
| Field | Definition |
|-------|------------|
| anatomical target | Center of the **visible lower-lip volume / surface** on the vertical midline |
| visual | Mid-lower vermillion body, clearly below the mouth opening |
| laterality | center |
| required surface | `face_skin` |
| purpose | Lower lip authoring / QA |
| MediaPipe strategy | **midpoint** of inner lower **14** and outer lower **17** |
| ambiguity | 14 alone ≈ inner seam — collapses toward mouthUpper |
| neighbors | Below mouthUpper; above chin |

### mouthCornerLeft / mouthCornerRight
| Field | Definition |
|-------|------------|
| anatomical target | Commissure — where upper and lower lips meet laterally |
| laterality | left / right (anatomical) |
| required surface | `face_skin` |
| MediaPipe strategy | single **291** (left) / **61** (right) — `FACE_LANDMARKS_LIPS` corners |
| neighbors | Horizontal span of mouth; L.x > R.x on unmirrored frontal |

**Invariant:** mouthUpper and mouthLower are two different anatomical regions; they must not share inner-lip-seam semantics.

---

## Eyes

### eyeLeft/RightInner
| Field | Definition |
|-------|------------|
| anatomical target | Medial canthus |
| required surface | `eyelid_or_skin` \| `face_skin` — **not** eyeball / eyelash |
| MediaPipe | single **362** (left) / **133** (right) |

### eyeLeft/RightOuter
| Field | Definition |
|-------|------------|
| anatomical target | Lateral canthus |
| required surface | same as inner |
| MediaPipe | single **263** (left) / **33** (right) |

### eyeLeft/RightUpper
| Field | Definition |
|-------|------------|
| anatomical target | Midpoint of **upper eyelid margin** (not iris / pupil / globe center) |
| required surface | `eyelid_or_skin` \| `face_skin` |
| MediaPipe | **centroid** left **386,385,387** / right **159,158,157** |
| ambiguity | 2D can look correct while ray hits `Eyes`/`Eyelashes` — layers A/B stay separate |
| Auto | Prefer allowed hit on **original** sample ray (incl. expanded same-ray depth) before screen-snap |

### eyeLeft/RightLower
| Field | Definition |
|-------|------------|
| anatomical target | Midpoint of **lower eyelid margin** |
| required surface | same as upper |
| MediaPipe | **centroid** left **374,380,373** / right **145,144,153** |

---

## Brows

### browLeft/RightInner
| Field | Definition |
|-------|------------|
| anatomical target | Visible inner start of brow near glabella |
| required surface | `eyebrow` \| `face_skin` |
| MediaPipe | single **336** (left) / **107** (right) |

### browLeft/RightCenter
| Field | Definition |
|-------|------------|
| anatomical target | Geometric / visual **center of the visible brow form** (centerline) |
| required surface | `eyebrow` \| `face_skin` |
| MediaPipe | **centroid** of LEFT/RIGHT_EYEBROW mid-arc (**296,334,282** / **66,105,52**) — between inner and outer on the brow centerline; not a single “mid” topology vertex alone |
| neighbors | Lies between inner and outer on the brow centerline |

### browLeft/RightOuter
| Field | Definition |
|-------|------------|
| anatomical target | Visible temporal end of brow |
| MediaPipe | single **300** (left) / **70** (right) |

**Invariant:** inner → center → outer along a sensible brow centerline; L/R not mirrored incorrectly.

---

## Nose / Chin / Forehead

### noseTip
| Field | Definition |
|-------|------------|
| anatomical target | Visible nose tip (frontal) |
| MediaPipe | single **1** (keep unless new evidence) |
| surface | `face_skin` |

### chin
| Field | Definition |
|-------|------------|
| anatomical target | Front-facing **center of the chin pad / chin body** |
| NOT | Bottom face-oval silhouette, neck edge (landmark **152** alone) |
| MediaPipe | **midpoint** of chin-pad landmarks **175** and **199** (tesselation chin region; above oval bottom) |
| surface | `face_skin` |
| neighbors | Below mouthLower; midline |

### forehead
| Field | Definition |
|-------|------------|
| anatomical target | Central visible forehead on midline — **above brows**, not hairline / top oval |
| NOT | Landmark **10** alone as hairline / oval top |
| MediaPipe | **midpoint** of **151** (mid-forehead / above glabella) and **10** (oval top) — pulls sample below pure hairline |
| surface | `face_skin` |
| neighbors | Above brow region; midline with noseTip / chin |

---

## Surfaces (provider-neutral)

Classes include `oral_interior` (teeth, tooth, tongue, gum(s), palate, denture, oral / inner-mouth tokens).  
`oral_interior` is **forbidden** for every `SagaDriveFaceAnchorId` in V1.  
Unlabeled third-party skin may remain `unknown` → allowed only when the anchor expects `face_skin`.

---

## Acceptance relations (tests — relational, not pixel thresholds)

- Mouth: upper ≠ lower; upper.y < lower.y (canonical frontal fixture); both face_skin; corners L/R correct  
- Brow: center between inner/outer; L/R not swapped  
- Eyes: canthus / lid semantics; eyeball/eyelash not GT; prefer original screen over snap when same-ray allowed  
- Midline: noseTip / forehead / chin centered; forehead above brows; chin below mouthLower; chin ≠ bottom-oval-only  
- Surface: Teeth/Tongue → `oral_interior` → rejected  

No normative px error walls in #421 — measure first (compare export).
