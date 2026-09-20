# Acceptance — avatar-mtoon-preview-toggle

## Intent
Im Character-Editor 3D-Viewport MToon-Stil (SagaDrive-Profil) per Toggle an/aus schalten, um Roh-PBR vs. Stylized-Look zu vergleichen — ohne Shader-Injection und ohne Persistenz.

## Preconditions
- AvatarCanvas ready mit geladenem VRM/GLB.
- Bestehendes SagaDriveMToonProfileV1 + applyAppearance-Pfad.

## Happy Path
- [ ] Editor-Viewport zeigt Toggle „MToon“ (sichtbar wenn Runtime ready).
- [ ] Default: MToon an (bestehendes Profil auf Materialien + Lights).
- [ ] Aus: Original-Materialwerte (Snapshot nach Load) + neutrale Preview-Lights.
- [ ] An: Profil erneut angewendet; Look wie vor dem Ausschalten.
- [ ] Live-/Session-Surfaces: kein Toggle (nur Editor-controlMode).
- [ ] Keine Persistenz in appearance.avatar; Reload setzt Default an.

## Edge Cases
- [ ] Toggle disabled solange Runtime nicht ready.
- [ ] Model-Reload: Snapshot neu, Toggle-State bleibt (oder Reset auf an — dokumentiert: Reset auf an).
- [ ] Import ohne echte MToon-Materials: Aus = Roh-PBR; An = kontrollierter PBR-Fallback des Profils.

## Security Coverage
- F-01: UI-only; keine neuen Network/HTML-Sinks.
- Kein Custom-Shader / kein User-String in Material-Pipeline.
- Out of scope: B-xx API / Storage.

## Out of scope
- Persistenter Preferenz-Store.
- Per-Material-Klassen-Toggles.
- Erzwingen von echten MToon-Materials auf reinen GLBs.

## Implementation Notes
- Acceptance: `.qa/acceptance/avatar-mtoon-preview-toggle.md`
- Applier: `captureMaterialStyleSnapshots` / `restoreMaterialStyleSnapshots` / `applyNeutralPreviewLights`
- Runtime: `setMtoonStyleEnabled` / `isMtoonStyleEnabled`; snapshot on load; restore→apply or restore→neutral
- UI: `AvatarMtoonStyleToggle` overlay top-right on editor viewport (`data-testid="avatar-mtoon-toggle"`)
- Model reload resets toggle to on; not persisted
- Check: `avatar-mtoon-profile-check.mjs` covers toggle wiring
