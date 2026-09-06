# SagaDrive Character Editor Rules UX Report (#21)

B1 Contract: Playwright E2E (`e2e/validate-character-editor-rules-ux.spec.ts`) + structural/domain guards. Kein Core-Doc-Edit.

- Legal builds covered in E2E: LEGAL-1 (Kämpfer+Körperlich L1), LEGAL-2+3 (Kämpfer+Mental + Direkt ≥5)
- Illegal I1–I8: UI pre-save / omission + domain #20 for I7/I8 engine
- Lore/Notizen: non-blocking (not in collectValidationProblems)
- Preset panel reachable after save
- Findings: 0

## Findings
- 0 Findings: Editor-Regelvertrag (Legal/Illegal/Save-Reload/Gebunden) strukturell und per E2E-Marker gesichert.

## Pflicht-Legal-Builds

| ID | Build | Nachweis |
|---|---|---|
| LEGAL-1 | Kämpfer + Körperlich, Stufe 1 | `e2e/validate-character-editor-rules-ux.spec.ts` LEGAL-1 save/reload |
| LEGAL-2 | Kämpfer + Mental, Stufe 1 (ungewöhnlich legal) | same file LEGAL-2+3 + `e2e/character-editor.spec.ts` Mental path |
| LEGAL-3 | Direkt-Erschaffung Stufe ≥5 | LEGAL-2+3 fills L3+L5 progression slots then save/reload |

## Pflicht-Illegal I1–I8

| ID | Fall | Editor-Nachweis |
|---|---|---|
| I1 | Attribut > +4 | SelectItems nur `[0..4]`; Speichern-Toast bei Budgetbruch |
| I2 | Budget ≠ 15 | Toast via `collectValidationProblems` attributeDistributionValid |
| I3 | Hintergrund 3 Punkte | 3. + Button disabled at 2/2 |
| I4 | Skill außerhalb Pool | Increase disabled / control absent |
| I5 | Spezies ≠ 3 | Toast Speziesmerkmale |
| I6 | Spec bei Rang 0 | Progression option disabled / absent |
| I7 | Zweitarchetyp vor 6 | Kein UI-Control; Domain #20 reject |
| I8 | Sek. Essenz vor 10 | Kein UI-Control; Domain #20 reject; Begriff Gebunden |

## Harte K.o.-Kriterien

- Structural/domain Findings: 0
- Playwright: `npm run test:e2e` (CI Browser E2E) muss grün sein
- Core-Doc unverändert in diesem Issue
