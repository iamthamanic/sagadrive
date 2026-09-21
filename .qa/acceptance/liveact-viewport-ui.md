# Feature: LiveAct 2/7 — permanentes Viewport-Settings-Menü + Kamera-PiP

<!-- refined by @implement from issue #330 on 2026-09-21 -->

## Intent

Bestehendes `AvatarPreviewSettings`-Gear zur permanenten Viewport-Steuerung erweitern
(auch Fallback „CH“). LiveAct Tracking/Kamera/PiP dort integrieren; kein LiveAct-State
in `CharacterEditor`.

## Preconditions

- #329 LiveActEngine auf main
- Editor-Surface `AvatarSurfaceViewer` / `AvatarCanvas`

## Happy Path

- [ ] Gear in Surface-Chrome; sichtbar/öffnbar auch bei Fallback „CH“
- [ ] Menü: Darstellung (MToon + Mesh-Version wenn vorhanden); LiveAct (Tracking, Kamera,
      Kameravorschau, Face Overlay stub, Bones stub, Kalibrieren stub); Status read-only
- [ ] Tracking ohne 3D-Runtime disabled, kein Permission-Prompt; mit Runtime startet LiveAct
- [ ] PiP gespiegelt 4:3 unter Gear; unabhängig vom Tracking ausblendbar; kein Drag
- [ ] Kein neuer LiveAct-State in CharacterEditor; Editor Face-Tracking-Leiste nicht parallel;
      test-gate grün; zero type escape hatches

## Edge Cases

- [ ] Fallback: Gear openable; actions disabled + „3D-Modell erforderlich“
- [ ] PiP OFF + Tracking ON
- [ ] Unmount/Stop clears stream from video element
- [ ] Device list: „Standardkamera“ until permission, then enumerate

## Security Coverage

| Item | How |
|------|-----|
| F-03 | Tracking start only; menu open does not prompt |
| P-04 | No blob capture / upload; audio false |

## Screenshots

N/A in agent run — structural + check script.

## Implementation Notes

- `AvatarPreviewSettings` is the sole editor gear; always openable (fallback + 3D).
- `AvatarSurfaceViewer` hosts `LiveActViewportControls` + `useLiveActViewport`.
- Editor hides legacy MToon button + Face Tracking bar; Player/Session keep FT bar until 6/7.
- PiP mirrored 4:3 under gear; independent of tracking via Kameravorschau toggle.
- CharacterEditor has no LiveAct state.
