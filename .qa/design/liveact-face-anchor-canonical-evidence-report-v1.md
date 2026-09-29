# Live Evidence Report Template — Canonical Human Face Anchors (#421)

**Status:** Template only — fill after the next live Canonical Human Auto run.  
**No normative px thresholds** in this document.

| anchorId | semantic (V1) | MP indices | derivation | resolved screen (x,y) | mesh | surface class | strategy | snapDistancePx | GT Δpx |
|----------|---------------|------------|------------|------------------------|------|---------------|----------|----------------|--------|
| noseTip | nose tip | 1 | single | | | | | | |
| chin | chin pad center | 175,199 | midpoint | | | | | | |
| forehead | visible forehead center | 151,10 | midpoint | | | | | | |
| mouthUpper | upper lip body | 0,13 | midpoint | | | | | | |
| mouthLower | lower lip body | 14,17 | midpoint | | | | | | |
| mouthCornerLeft | left commissure | 291 | single | | | | | | |
| mouthCornerRight | right commissure | 61 | single | | | | | | |
| eyeLeftInner | medial canthus | 362 | single | | | | | | |
| eyeLeftOuter | lateral canthus | 263 | single | | | | | | |
| eyeLeftUpper | upper lid mid | 386,385,387 | centroid | | | | | | |
| eyeLeftLower | lower lid mid | 374,380,373 | centroid | | | | | | |
| eyeRightInner | medial canthus | 133 | single | | | | | | |
| eyeRightOuter | lateral canthus | 33 | single | | | | | | |
| eyeRightUpper | upper lid mid | 159,158,157 | centroid | | | | | | |
| eyeRightLower | lower lid mid | 145,144,153 | centroid | | | | | | |
| browLeftInner | brow near glabella | 336 | single | | | | | | |
| browLeftCenter | brow form center | 296,334,282 | centroid | | | | | | |
| browLeftOuter | brow temple | 300 | single | | | | | | |
| browRightInner | brow near glabella | 107 | single | | | | | | |
| browRightCenter | brow form center | 66,105,52 | centroid | | | | | | |
| browRightOuter | brow temple | 70 | single | | | | | | |

Notes: record `originalScreen*` vs `resolvedScreen*` from Auto session diagnostics when strategy ≠ first_allowed_depth_gated.
