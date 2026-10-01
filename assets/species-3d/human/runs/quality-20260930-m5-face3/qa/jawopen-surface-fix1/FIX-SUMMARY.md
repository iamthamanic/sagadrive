# jawOpen Surface Fix 1 — m5

## Selection
- **Before:** Euclidean `dist3` only to mouthLower/chin
- **After:** GT triangle → connected component union (mouth seeds) → topology hops + topo falloff → Euclidean weight; chin body-shell excluded from surface when disconnected
- Skin joints NOT primary gate

## Metrics
- affected: 13055 → 3192
- mouthGapΔ: 0.914 → 0.1498
- amp: 0.01182 = min(face, mouthW, neutralGap)
- offSurfaceAffected: 0
- Functional: PASS | Surface Safety: PASS | Visual: FAIL — residual under-beard silhouette vs frozen neck shell (off-surface energy=0)
- blinkL/R Functional PASS; Visual PASS
- Combination: PASS | Frozen morphs unchanged: True
