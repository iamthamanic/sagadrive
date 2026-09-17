# Acceptance — avatar-save-materialized-export

<!-- seeded for GitHub issue #7 / avatar-order-12 -->

## Intent
Beim expliziten Character-Save wird ein owner-scoped, optimiertes Basisartefakt (GLB) materialisiert: Base Body / Import-Mesh + vollständiger #212 Morph-State + persistente #4 Basis-Traits + #214/#6 Versionsmetadaten. Compact `appearance.avatar` bleibt Source of Truth; Runtime-/Inventory-Overlays werden nie gebacken.

## Preconditions
- #216 AvatarFitRangeV1 auf `main`.
- Character Save Orchestrierung unter `src/app/character/edit/**`.
- Import-Storage-Bucket `character-avatars` vorhanden (#5).

## Happy Path
- [ ] Domain baut Export-Payload nur aus Base-Traits + Morph + Profil-/Rig-Versionen (keine Overlays).
- [ ] Infra lädt genau ein aktives Export-Artefakt (owner-scoped Pfad), signed URL zurück.
- [ ] Character-Save ist einzige Trigger-Aktion; kein zweiter Avatar-Save-Button.
- [ ] Erfolg aktualisiert `model_url`; Fehler behält Draft + vorheriges Modell.
- [ ] Altes Export-Artefakt erst nach erfolgreichem neuen Save deaktivieren.
- [ ] typed-strict + architecture-boundary + export-check grün.

## Edge Cases
- [ ] Helm/Rüstung als Runtime-Overlay → nicht im Export.
- [ ] Persistenter Creator-Kleidungs-Trait → bleibt enthalten.
- [ ] Export/Upload scheitert → altes Artefakt bleibt aktiv; Speichern bricht soft ab (Draft bleibt).
- [ ] Doppelklick Save → idempotent (saving-Guard).

## Scope
In: Domain export contract + GLB package encode, migration/table, infra service, CharacterEditor save wiring, checks.
Out: Live-Export bei Slider-Änderung, Marketplace/Batch, Meshy, Inventory baking (#158+).

## Security Coverage
- B-01/B-09: Storage-Pfad nur aus Auth-UID; keine Client-User-IDs.
- B-10: Signed URLs only; private bucket.
- P-02: Generische DE-Fehlermeldungen.
- Out: B-04 SQL N/A (storage API).

## Composition Gate
- HEAD_SHA: (set at commit)
- BASE_SHA: f0d130a
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-avatar-save-materialized-export.md`

## Implementation Notes
- Domain: `avatar-save-export.ts` — AvatarSaveExportV1 payload (morph + base traits + version stamps), overlay discard, owner path `uid/exports/{id}.glb`, minimal/injected GLB encode.
- Migration `025_character_avatar_export.sql` — `character_avatar_export_assets` + exactly-one active unique index + RLS.
- Infra: `character-avatar-export-service.ts` materializes on Save, activates one artifact, fail-closed (no active flip / keep prior model_url).
- App: `CharacterEditor.handleSaveCharacter` calls export before persist; soft-aborts save on export failure; no second Avatar-Save button; `data-avatar-save-export`.
- Checks: `avatar-save-export-check.mjs` wired into `test-gate`.
