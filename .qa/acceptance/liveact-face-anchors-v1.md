# Feature: LiveAct 3/10: SagaDriveFaceAnchorsV1 als semantischen Mesh-Contract einführen

<!-- #399 — sagadrive-face-anchors-v1 -->

## Intent
Führe einen provider-neutralen `SagaDriveFaceAnchorsV1`-Contract ein, damit Character-Debugging und spätere Semantic-QA echte Punkte auf der Avatar-Oberfläche verwenden statt Billboard-/Head-Bone-Schätzungen.

## Happy Path
- [x] `SagaDriveFaceAnchorsV1` definiert mouth upper/lower/corners, eye inner/outer/upper/lower L/R, brow inner/outer/center L/R, noseTip, chin, forehead (21 ids).
- [x] Runtime evaluiert Anker aus deformierter Mesh-Oberfläche (morph + skinning); kein Billboard-/Head-Fallback.
- [x] Authoring/validation erkennt stale node/primitive/triangle deterministisch (`liveact-face-anchor-validate.mjs`).
- [x] m5/f5 Pfade dokumentiert; Author-CLI erzeugt Manifeste ohne Provider-Namen im Domain-Layer.
- [x] Touched TS: typed-strict, keine `any`-Escapes in neuen Dateien.

## Edge Cases
- [x] Multiple SkinnedMeshes: node index by stable name; missing node → unavailable.
- [x] Ungültige Barycentrics / triangle index → fail-closed parse + unavailable runtime.
- [x] Morph + skin vor World-Projection (`face-anchor-runtime.ts`).

## Regression
- [ ] Feed and topic routes still load (unchanged this slice)

## Assumptions
- Bindings refer to glTF node names authored offline; runtime does not embed m5/f5 vertex ids.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Implementation Notes
- Domain: `src/domains/character/avatar/face-anchor-contract.ts`
- Infra: `src/infrastructure/character/avatar/face-anchor-runtime.ts`
- Scripts: `scripts/liveact-face-anchor-author.mjs`, `scripts/liveact-face-anchors-v1-check.mjs`
- Fixture: `.qa/fixtures/liveact-face-anchors-v1/face-anchors.json`
