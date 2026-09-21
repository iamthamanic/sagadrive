# Feature: LiveAct 3/7 — Face-Landmark-Debug + Neutral-Kalibrierung

<!-- refined from issue #331 -->

## Intent

Getrennter local-only Diagnostics-Pfad für Face-Landmarks und ephemeral Neutral-Kalibrierung.
PiP-Canvas zeigt Konturen imperativ; LiveActFrame bleibt landmark-frei.

## Preconditions

- #329 LiveActEngine + domain contract
- #330 Viewport gear + PiP

## Happy Path

- [ ] MediaPipe liefert Samples + separaten `LiveActFaceDiagnosticsFrameV1`; `LiveActFrameV1` ohne Landmark-Arrays
- [ ] Face Overlay zeichnet Kontur/Augen/Brauen/Mund über PiP via Canvas/rAF ohne React pro Frame
- [ ] Kalibrieren sammelt 30 gültige Frames in max. 2 s; Baseline nur bei Erfolg ersetzt
- [ ] Head/Gaze/Face relativ zur Baseline auf ausgehenden Frames
- [ ] Diagnostics/Calibration nie persistiert; dispose verwirft Baseline
- [ ] `scripts/liveact-face-diagnostics-check.mjs` + `npm run test-gate` grün; zero type escapes

## Edge Cases

- [ ] Face lost während Kalibrierung → Fehler, alte Baseline bleibt
- [ ] Overlay OFF → kein Zeichnen; Tracking/Kalibrierung unverändert möglich
- [ ] Kalibrieren disabled ohne aktives Tracking
- [ ] Mobile ohne Head-Matrix: Gaze/Face kalibrierbar, Head optional unsupported

## Security Coverage

| Item | How |
|------|-----|
| P-04 | Diagnostics local-only asserts; kein Blob/Serialize auf Frame/Diagnostics |
| F-03 | Kein Upload; Landmarks nur PiP-Canvas |

## Implementation Notes

- Domain: `liveact-face-diagnostics.ts`, `liveact-calibration.ts`
- Infra: `mediapipe-face-source.ts`, `liveact-face-diagnostics.ts`, `liveact-engine.ts`
- App: `LiveActFaceOverlay.tsx`, `useLiveActViewport.ts`, settings/PiP wiring
- Gate: `scripts/liveact-face-diagnostics-check.mjs` after viewport-ui in `test-gate.mjs`
