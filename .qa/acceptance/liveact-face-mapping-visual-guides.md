# Feature: LiveAct Face-Rig Editor — Visual Guides + Binding Labels

<!-- liveact-face-mapping-visual-guides -->

## Intent
Manual Face Mapping wird zum visuellen Face-Rig Editor: verbindliche DE-Labels für alle 21 Marker, live Eye/Mouth/Brow-Guides, bidirektionale Auswahl mit Puls, Detail-Card (PDF), Frontal-Frame beim Öffnen.

## Happy Path
- [x] Binding-Labels (exakt): Innerer/Äußerer Augenwinkel, Oberes/Unteres Augenlid; Ober-/Unterlippe Mitte; Mundwinkel; Brauen Inneres/Mitte/Äußeres Ende; Nasenspitze / Kinnmitte / Stirnmitte.
- [x] Eye/Mouth: glatte geschlossene Konturen aus Draft-Ankern; Brow: glatte Kurve; Nase/Kinn/Stirn nur Marker.
- [x] Guides live aus Draft; reine Domain-Geometrie (`face-mapping-guide-geometry.ts`); keine neuen Runtime-Anker.
- [x] Viewport ↔ Panel Auswahl; selektierter Marker pulsiert auf Charakter **und** in Detail-Card.
- [x] Detail-Card zeigt Körperteil-Feature + Binding-Label + Puls-Punkt.
- [x] Face Mapping öffnen: Tracking/Overlay/Bones aus, Pose neutral, Kamera `applyCameraFrame('face')`.
- [x] Drag: nur gültige Allowlist-Raycast-Hits aktualisieren Draft; letzter gültiger Stand bleibt.
- [x] Cancel/Reset: Selection + Draft/Guides vollständig zurückgesetzt.

## Edge Cases
- [x] Fehlende Anker → Guide-Pfad für diese Region weggelassen.
- [x] Raycast bleibt `#420` `face-mapping-raycast.ts` (keine zweite Mapping-Implementierung).

## Non-goals
- Kein Auto-Mapping (#421), keine neuen Anchor-IDs, kein Iris/Pupil, keine Persistenz, kein Asset-Republish.

## Regression
- [x] Bestehendes Manual Face Mapping (#420/#430) bleibt nutzbar; Labels/Guides/Pulse sind Upgrade.

## Composition Gate
- Verdict: SKIPPED (session draft + visual metadata; single-hop)
- Proof: `.qa/runs/composition-gate-liveact-face-mapping-visual-guides.md` (optional)
