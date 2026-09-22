# Feature: LiveAct Face Setup 1/6 — Anchor-Sidecar-Versionierung + Ground-Truth-Provenance

<!-- #419 — liveact-face-anchor-ground-truth -->

## Intent
Model-URL und Face-Anchor-Sidecar bleiben versionskonsistent (`?v=`). Heuristische Anchors dürfen ohne Review nicht als Production-Ground-Truth gelten. Runtime bleibt `SagaDriveFaceAnchorsV1`; Provenance ist `SagaDriveFaceMappingAuthoringV1`.

## Happy Path
- [x] `listFaceAnchorsManifestUrlCandidates()` kopiert den Cache-Bust-Query auf Stem- und Generic-Sidecar.
- [x] `SagaDriveFaceMappingAuthoringV1` dokumentiert `source: auto|manual|manual_override`, `reviewed`, Asset/Topology-Fingerprint.
- [x] `isReviewedFaceMappingGroundTruth()` fail-closed: nur `manual` / `manual_override` + `reviewed=true`.
- [x] Heuristic author schreibt sibling `face-mapping-authoring.json` als `auto` + `reviewed=false`.
- [x] `FACE-AUTHORING.md` dokumentiert Review-Policy.
- [x] Touched TS: typed-strict, keine Escape-Hatches.

## Edge Cases
- [x] Relative + absolute Model-URLs mit Query und Hash.
- [x] `auto` + `reviewed=true` wird von Validator und Ground-Truth-Helper abgelehnt.

## Regression
- [x] `SagaDriveFaceAnchorsV1` unverändert (separater Contract).

## Assumptions
- Kein Face-Setup-UI in diesem Slice (#420).
- Publish-Ground-Truth wird erst nach manuellem Review gesetzt.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | n/a (contract/infra) |

## Composition Gate
- Verdict: SKIPPED
- Proof: `.qa/runs/composition-gate-liveact-face-anchor-ground-truth.md`
- Reason: single-hop URL resolution + offline provenance; no producer→consumer fan-out
