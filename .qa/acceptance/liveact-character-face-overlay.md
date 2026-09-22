# Feature: LiveAct 4/10: Character Face Overlay und Character Metrics auf deformierter Mesh-Geometrie bauen

## Intent
Ersetze die bisherige grobe Character-Face-Debug-Schätzung durch ein echtes mesh-gebundenes Overlay. Kamera- und Character-Overlay teilen Face-Overlay- und Metrics-Toggles.

## Happy Path
- [x] Character-Overlay wird ausschließlich aus deformierten `SagaDriveFaceAnchorsV1` projiziert.
- [x] Kamera und Character nutzen `computeLiveActFaceMetrics` (getrennte Quellpunkte).
- [x] Face-Overlay-Toggle steuert PiP + Character; Metrics-Toggle steuert beide HUDs.
- [x] `npm run test-gate` inkl. `liveact-character-face-overlay-check.mjs`.
- [x] Keine Type-Escape-Hatches in touched files.

## Edge Cases
- [x] Fehlende `face-anchors.json` → Overlay aus, Settings-Hinweis „Character Face Mapping nicht verfügbar“.
- [x] Model swap / dispose → Manifest-Token + Debug-Controller reset.
- [x] Portrait → `runWithoutSampling` (kein Debug-Sampling während Capture).

## Regression
- [ ] Feed and topic routes still load

## Implementation Notes
- Infra: `liveact-character-face-debug.ts`, `face-anchors-manifest-url.ts`, `character-studio-runtime.ts`
- App: `LiveActCharacterFaceOverlay.tsx`, `LiveActViewportControls.tsx`, `AvatarSurfaceViewer.tsx`, `AvatarPreviewSettings.tsx`
- Domain: `buildLiveActFaceLandmarksFromAnchorScreenPoints` in `liveact-face-metrics.ts`
