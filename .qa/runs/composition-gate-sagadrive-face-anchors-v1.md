# composition-gate: sagadrive-face-anchors-v1 (#399)

**Verdict:** CLEAR
**Date:** 2026-09-22

## Path
`face-anchors.json` (manifest) → parse/validate (domain + offline GLB gate) → `evaluateFaceAnchorsManifest` (Three.js deformed triangle barycentrics) → world positions for diagnostics/semantic QA (future UI).

## Simulations
- Stale node/triangle → validate errors + runtime `unavailable`
- Missing binding → omitted evaluation (no synthetic fallback)
- Morph + skin: deformed vertex read before `localToWorld`

No FLAGGED findings.
