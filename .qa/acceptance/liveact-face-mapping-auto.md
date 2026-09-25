# Feature: LiveAct Face Setup 3/6 — Auto Mapping (MediaPipe IMAGE + Mesh-Raycast)

<!-- #421 — liveact-face-mapping-auto -->

## Intent
Auto Mapping rendert den Character frontal, erkennt Face-Landmarks mit einem **getrennten** lokalen MediaPipe FaceLandmarker im **IMAGE**-Modus und projiziert die 21 `SagaDriveFaceAnchorsV1` über dieselbe Raycast/Barycentric-Pipeline wie Manual Mapping. Ergebnis ist immer nur ein Vorschlag (`source=auto`, `reviewed=false`).

## Happy Path
- [x] **Auto Mapping** im Face-Mapping-Panel; kontrollierter Neutral-/Front-Capture; IMAGE-Landmarker (kein VIDEO-Reuse).
- [x] Definierte MediaPipe-Indizes/Centroids → dieselbe `raycastFaceMappingPointer`-Pipeline → Draft-Bindings.
- [x] Anatomical L/R aligned to `FaceLandmarker.FACE_LANDMARKS_LEFT_EYE` / `RIGHT_EYE` (left mouth=291, left outer eye=263).
- [x] Auto-Marker `source=auto`; manuelle Korrektur → `manual_override`; erneutes Auto überschreibt Protected nicht ohne Confirm/Replace.
- [x] Immutable Ground-Truth freeze **before** Auto; `validForGroundTruthComparison` only for reviewed/manual complete sets.
- [x] Surface-semantics classes (eyeball ≠ ok for canthus/lids); Compare export carries expected/actual/ok.
- [x] Async stale-result protection (session token) + edits locked while `autoBusy`.
- [x] 0-face / multi-face / partial → verständlicher Status; kein Auto-Publish.
- [x] Touched files: typed-strict (keine Escape-Hatches).

## Edge Cases
- [x] Mesh-Allowlist (Hair/Equipment/Helpers ausgeschlossen) — gleicher Raycast-Pfad wie #420.
- [x] Cleared manual: meta removed; fill-empty may refill.
- [x] Unreviewed auto sidecar/draft → `unreviewed_auto`, **kein** Auto-vs-Manual Qualitäts-PASS / keine 0px-Illusion.
- [x] Auto-vs-Manual Eval mit median/p95/max nur bei gültiger GT; Threshold-Status `needs-calibration` (nicht normativ).
- [x] Independent L/R check via MediaPipe topology (not map laterality metadata).

## Out of scope (Epic #442)
Dense Landmark Runtime, PerformanceFaceV2, Iris-Gaze Solver, neue Morphs, Speech Fidelity.

## Composition Gate
- Expected: SKIPPED (single-hop render → detect → session draft; no fan-out)
