# Feature: LiveAct Face Setup 2/6 — Manual Face Mapping (21 Mesh-Marker)

<!-- #420 — liveact-face-mapping-manual -->

## Intent
Über Gear → Face Setup → Face Mapping kann der Nutzer die 21 `SagaDriveFaceAnchorsV1`-Marker per Mesh-Raycast setzen. Draft bleibt session-lokal bis Übernehmen.

## Happy Path
- [x] Face Setup im Gear; **Face Mapping öffnen** startet Authoring (Tracking/Overlay/Bones aus, Pose neutral).
- [x] 21 Marker gruppiert (Mund / Augen / Brauen / Gesicht) mit Status fehlt / gesetzt / ungültig / reviewed.
- [x] Mesh-Klick → `nodeIdentity + primitiveIndex + triangleIndex + barycentric` (keine World-XYZ-only Persistenz).
- [x] Draft, Reset, Cancel, Übernehmen ohne Repo-/Supabase-Persistenz.
- [x] Marker-Layer imperative (rAF); Theme Cyan/Gold.

## Edge Cases
- [x] Allowlist schließt Hair/Equipment/Helpers aus.
- [x] Miss-Klick zeigt Hinweis; Orbit-Drag setzt keinen Marker.
- [x] Model/runtime weg → Authoring schließt.

## Regression
- [x] Bestehendes LiveAct Gear/Overlay bleibt nutzbar wenn Face Mapping zu.

## Composition Gate
- Verdict: SKIPPED (single-hop session draft → runtime bind; no fan-out)
- Proof: `.qa/runs/composition-gate-liveact-face-mapping-manual.md`
