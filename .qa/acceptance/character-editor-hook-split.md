# Feature: refactor(character): naechster CharacterEditor-Split — Hook-Extraktion (Follow-up #307)

<!-- seeded by ecc-runner from issue #324 on 2026-09-20 — @implement may refine -->

## Intent
From GitHub issue #324: refactor(character): naechster CharacterEditor-Split — Hook-Extraktion (Follow-up #307)

## Happy Path
- [ ] 1. Genau ein klar abgegrenzter Hook extrahiert (nicht alles auf einmal — gleiche Disziplin wie #307: "first safe split").
- [ ] 2. Datei `src/app/character/edit/useCharacter<Name>.ts` neu; CharacterEditor konsumiert den Hook; useState-Anzahl sinkt messbar (im PR-Report: vorher/nachher).
- [ ] 3. Keine Verhaltensaenderung: gleiche Render-Ausgabe, gleiche Handler-Signaturen nach aussen.
- [ ] 4. `npm run test-gate` + projekt-Typecheck gruen; bestehende Editor-Tests unveraendert gruen.
- [ ] 5. ECC-Konventionen: acceptance in `.qa/acceptance/`, Gate-Proofs mit HEAD-SHA.

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
