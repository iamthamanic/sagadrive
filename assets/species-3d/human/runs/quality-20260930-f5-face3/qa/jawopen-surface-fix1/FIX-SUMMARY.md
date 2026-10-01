# jawOpen Surface Fix 1 — f5

## Selection
- **Before:** Euclidean `dist3` only to mouthLower/chin
- **After:** GT triangle → connected component union (mouth seeds) → topology hops + topo falloff → Euclidean weight; chin body-shell excluded from surface when disconnected
- Skin joints NOT primary gate

## Metrics
- affected: 21841 → 1204
- mouthGapΔ: 1.148 → 0.1233
- amp: 0.00861 = min(face, mouthW, neutralGap)
- offSurfaceAffected: 0
- Functional: PASS | Surface Safety: PASS | Visual: PASS-borderline — neck/chest stable; mouth open modest; no chest/shoulder crater
- blinkL/R Functional PASS; Visual PASS
- Combination: PASS | Frozen morphs unchanged: True
