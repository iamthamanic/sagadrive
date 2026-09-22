# composition-gate: liveact-semantic-morph-validator-v2 (#401)

**Verdict:** CLEAR

## Flow
GLB + optional `face-anchors.json` → `validateLiveActFaceAsset` (Khronos + structural V1) → `validateLiveActFaceSemanticQa` (region/side/combination) → `face-inventory.json` with `semanticQa.*`.

## Boundaries
- Scripts-only offline path; no React/runtime morph changes.
- Thresholds live in `liveact-face-semantic-profile-v1.mjs` (no filename/gender exceptions).
- Domain unchanged; anchors reuse SagaDriveFaceAnchorsV1 ids from #399.

## Risks
- Production m5/f5 runs without anchors skip semantic until ledger ships `face-anchors.json` (by design for #401).
