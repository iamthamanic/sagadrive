# Feature: Integrate Look preview and application into the World Editor

<!-- #350 world-look-preview -->

## Intent
Füge im World-/Saga-Kontext eine Look-Fläche hinzu, auf der der GM gespeicherte Looks an der tatsächlichen Weltansicht previewen und als Saga-Default anwenden kann.

## Happy Path
- [x] World-/Saga-Kontext besitzt einen dedizierten „Look“-Bereich mit aktuellem Look, temporärer Preview, Anwenden und Zurücksetzen (`WorldLookPreviewPanel` on `section === 'world'`).
- [x] Temporäre Preview mutiert weder Saga noch LookProfile bis explizit „Anwenden“ gewählt wird (`previewLookId` vs `savedLookId`).
- [x] „Look bearbeiten“ navigiert zum kanonischen Library-Look-Editor mit Return Context (`setLookEditorReturnPath` / `takeLookEditorReturnPath`); keine Authoring-Slider im World Editor.
- [x] Unsupported World-Domains werden als „Noch nicht verfügbar“ gezeigt (`listReservedLookCapabilityMetadata`) ohne Fehler.
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [x] Preview-Look archiviert während/bei Apply → reject + error.
- [x] Gespeicherter Saga-Look archiviert beim Laden → notice + System-Default.
- [x] Apply fehlgeschlagen nach Preview → error; Preview bleibt lokal.
- [x] Look Editor Zurück → World section via return path.

## Regression
- [x] Settings `SagaVisualStyleSettings` (#348) unchanged
- [x] Session Look (#349) unchanged

## Assumptions
- World section of SagaResourceScreen is the World Editor surface for this slice.
- Apply reuses `updateProjectLookSettings` (persists saga default only).

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Implementation Notes
- `src/app/project/WorldLookPreviewPanel.tsx`
- `src/app/look/look-editor-return.ts`
- Contract: `scripts/world-look-preview-check.mjs`

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-world-look-preview.md`
