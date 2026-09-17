# Acceptance — custom-vrm-glb-import

<!-- seeded for GitHub issue #5 / avatar-order-05 -->

## Intent
Nutzer können eigene `.vrm`/`.glb`-Characters sicher importieren und über dieselbe AvatarRuntime nutzen. Servervalidierung ist autoritativ; Capabilities kommen nie vom Client.

## Preconditions
- #4 modular traits auf `main`.
- Character portrait storage pattern + AvatarCanvas vorhanden.

## Happy Path
- [ ] CTA „3D-Charakter importieren“ mit File-Picker + Drag/Drop (VRM/GLB).
- [ ] Client nur frühe UX-Prüfung; Upload läuft über autoritative Validierung (Magic Bytes + Größe + Extension).
- [ ] Owner-scoped Storage-Pfad (`{auth.uid}/…`); signed URL zurück.
- [ ] Genau ein aktives Import-Artefakt pro bestätigtem Import; `rigAnalysisStatus: pending` für #6.
- [ ] Erfolg setzt `appearance.avatar.model_url` ohne Client-Capability-Felder.
- [ ] States: idle / validating / uploading / analyzing / success / error / unsupported-capabilities.
- [ ] Fehler behält vorherigen gültigen Avatar.
- [ ] typed-strict + architecture-boundary + import-check grün.

## Edge Cases
- [ ] Zu groß / falsches Magic → fail-closed, kein Storage-Objekt aktiv.
- [ ] Navigation während Upload → kein „aktives“ Artefakt ohne Bestätigung.
- [ ] GLB ohne Skeleton → Import ok, Analyse-Status pending (#6 degradiert später).

## Scope
In: Domain validators + import DTO, migration/bucket, infra upload service, Look-tab UI, checks.
Out: Auto-rig (#6), Meshy, Morph-Editor (#212+).

## Security Coverage
- B-01/B-09: Storage-Pfad nur aus Auth-UID; keine Client-User-IDs.
- B-10: Keine Secrets im Client; signed URLs only.
- P-02: Generische DE-Fehlermeldungen.
- Out: B-04 SQL injection N/A (storage API), B-07/08 permission admin N/A.

## Composition Gate
- HEAD_SHA: 82fb691e666a9df99b9cf3cb48d80f5c248f7306
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-custom-vrm-glb-import.md`

## Implementation Notes
- Domain: `avatar-import.ts` — magic-byte GLB/VRM validation, size/extension gates, unsafe URI hint reject, owner path builder, sanitize (no client capability escalation).
- Migration `024_character_avatar_import.sql` — private `character-avatars` bucket + `character_avatar_import_assets` (pending-only insert, one active per character).
- Infra: `character-avatar-import-service.ts` validates bytes before upload, activates one artifact, returns signed URL with `rigAnalysisStatus: pending` for #6.
- App: `AvatarImportPanel` beside preview (CTA + drag/drop + status); CharacterEditor keeps prior model URL on error; success sets `importedModelUrl` → `appearance.avatar.model_url`.
- Checks: `avatar-custom-import-check.mjs` + e2e `characterstudio-avatar-import.spec.ts`.
