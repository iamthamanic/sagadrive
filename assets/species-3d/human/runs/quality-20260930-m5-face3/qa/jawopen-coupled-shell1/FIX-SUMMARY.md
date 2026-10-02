# jawOpen Coupled Shell 1 — m5

## Selection
- Primary: GT triangle → CC → topology hops (unchanged surface-fix)
- Secondary: Option C seam coincide (`τ=0.12·meanEdge`) + normals + GT locality + body veto
- Motion: nearest-primary delta × topology falloff on secondary patch only

## Metrics
- jawOpen affected: 3663 (coupled patch verts: 471)
- mouthGapΔ: 0.1498
- accepted coupled comps: [176, 189, 292, 341]
- Seam Continuity: PASS (maxGap@1 ≈ 0)
- Body FP: 0
- Functional 7/7: PASS
- Visual: PASS
- Blink L/R: PASS
- Regression / Combination / Determinism: PASS
