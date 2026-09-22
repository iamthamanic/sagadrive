# Feature: LiveAct 2/10: Kamera-Face-Overlay pixelgenau projizieren und Metrics-HUD ergänzen

<!-- seeded by ecc-runner from issue #398 on 2026-09-22 — @implement may refine -->

## Intent
Mache das Webcam-Face-Overlay geometrisch korrekt für die tatsächlich sichtbare PiP-Darstellung und ergänze normalisierte Face-Metrics. Das aktuelle Overlay multipliziert normalisierte MediaPipe-Koordinaten direkt mit dem Canvas, während das Video `object-cover` + Mirror verwendet; dieser Slice führt einen einzigen VideoViewportTransform als Source of Truth ein.

## Happy Path
- [ ] - [ ] `object-cover` Crop + Scale + Mirror werden von einem deterministischen VideoViewportTransform berechnet und Overlay/Video matchen.
- [ ] - [ ] Metrics-Switch ist separat, initial true, bei Overlay ON sichtbar wirksam und unabhängig abschaltbar.
- [ ] - [ ] Geometrische Metriken sind dimensionslos normalisiert, nicht rohe Pixelabstände.
- [ ] - [ ] UI nutzt bestehende SagaDrive-Primitives/Tokens; kein per-frame React state und `npm run test-gate` ist grün.
- [ ] - [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] (from .qa/edge-cases.md + @implement)

## Regression
- [ ] Feed and topic routes still load

## Assumptions
- none

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Implementation Notes
<!-- filled after coding -->
