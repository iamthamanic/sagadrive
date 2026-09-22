# composition-gate: liveact-character-face-overlay (#400)

## Flow
`face-anchors.json` (sibling URL) → `CharacterStudioRuntime.loadFaceAnchorsManifestForModel` → `evaluateFaceAnchorsManifest` → `LiveActCharacterFaceDebugController.sample` → `LiveActCharacterFaceOverlay` (rAF canvas) + shared `computeLiveActFaceMetrics`.

## Consumers
- Settings: shared Face Overlay + Metrics toggles; mapping unavailable hint.
- PiP: existing `LiveActFaceOverlay` (camera landmarks).
