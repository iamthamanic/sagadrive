# jawOpen Coupled Shell 1 — f5

## Selection
- Primary: GT triangle → CC → topology hops (unchanged surface-fix)
- Secondary: Option C seam coincide (`τ=0.12·meanEdge`) + normals + GT locality + body veto
- Motion: nearest-primary delta × topology falloff on secondary patch only

## Metrics
- jawOpen affected: 1244 (coupled patch verts: 40)
- mouthGapΔ: 0.1233
- accepted coupled comps: [497]
- Seam Continuity: PASS (maxGap@1 ≈ 0)
- Body FP: 0
- Functional 7/7: PASS
- Visual: PASS
- Blink L/R: PASS
- Regression / Combination / Determinism: PASS
