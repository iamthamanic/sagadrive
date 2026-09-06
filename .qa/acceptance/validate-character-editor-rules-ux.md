# Feature: validate-character-editor-rules-ux

<!-- Issue #21 (Epic #18), Validierungsplan B1 -->

## Intent
Der Character Editor wird als praktische Regelabbildung geprüft: Legal-Builds speichern, I1–I8 werden vor dem Speichern abgefangen, Save/Reload und Lore/Notizen bleiben deterministisch, Core-Begriff `Gebunden` bleibt sichtbar.

## Preconditions
- Regelquelle: `docs/sagadrive core rules.md` (§3.3, §4.2/§4.4/§4.5, §5.2, §13.1) + Domain #20.
- Branch `chore/21-validate-character-editor-rules-ux` aus main.
- Keine Core-Doc-Edits in diesem Issue.

## Happy Path
- [x] `node scripts/validate-character-editor-rules-ux.mjs` → Findings: 0; Report `.qa/runs/validate-character-editor-rules-ux-report.md`
- [x] Playwright `e2e/validate-character-editor-rules-ux.spec.ts` deckt LEGAL-1/2/3 und I1–I8 ab
- [x] CI Browser E2E grün (local green; CI re-run after E2E harden)
- [x] `checkCharacterEditorRulesUxValidation` in `scripts/test-gate.mjs`

## Edge Cases
- [x] Kämpfer+Mental bleibt legal
- [x] Zweitarchetyp / sek. Essenz nicht auf Stufe 1 wählbar
- [x] Lore/Notizen blockieren Speichern nicht
- [x] Kosmetik-only Tooltip-Findings zählen nicht als Blocking Findings

## Regression
- [x] Bestehende `e2e/character-editor.spec.ts` weiter grün (helpers extracted; mega-spec retained)
- [x] Keine Änderung an `docs/sagadrive core rules.md`

## Screenshots
| Step | Filename |
|------|----------|
| I1–I8 | `.qa/evidence/validate-character-editor-rules-ux/i1-i8-prevention.png` |
| LEGAL-1 | `.qa/evidence/validate-character-editor-rules-ux/legal-1-body-reload.png` |
| LEGAL-2+3 | `.qa/evidence/validate-character-editor-rules-ux/legal-2-3-mental-l5.png` |

## Scope
### In
- `e2e/validate-character-editor-rules-ux.spec.ts`, `e2e/helpers/character-editor.ts`
- `scripts/validate-character-editor-rules-ux.mjs`, `scripts/test-gate.mjs`
- `.qa/acceptance|runs/*validate-character-editor-rules-ux*`

### Out
- Inventar/Traglast (#32), Look/Avatar, Core-Doc, Multi-Weltprofil

## Security Coverage
- N/A — Editor-E2E + strukturelles Regelskript; keine neuen Endpoints.

## Implementation Notes
- Structural gate mirrors I1–I8 UI/domain contracts; Playwright provides Happy/Illegal/Save-Reload evidence.
- I7/I8: omission of secondary controls at L1 + domain #20 rejects.
- Helpers extracted for reuse with existing character-editor E2E.
- E2E harden: essence via `role=radio` + carousel nav; I2 toast only after full sheet; Preset pre-save copy; Essenz badge `.first()`.

## Composition Gate

- HEAD_SHA: `d2ef0aa` on branch `chore/21-validate-character-editor-rules-ux`
- Date: 2026-09-06
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-validate-character-editor-rules-ux.md`
- Reason: Single-hop editor validation (E2E + structural script); no multi-service composition.
