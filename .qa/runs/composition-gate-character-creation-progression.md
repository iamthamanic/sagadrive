# Composition Gate — character-creation-progression

- HEAD_SHA: a01a1b3
- BASE_SHA: 0752b0b
- Date: 2026-08-29
- Verdict: CLEAR

## Event
Ein Entwickler führt den Test Gate bzw. `node scripts/validate-character-creation-progression.mjs` aus; die Engine baut die 6 Pflichtkonzepte als §17-Basen, levelt B1/B2/B3 nach §13 auf Stufe 20, prüft die §13.3-Äquivalenz und 19 Negativpfade, und schreibt den Report nach `.qa/runs/validate-character-creation-progression-report.md`.

## Hop chain
`docs/sagadrive core rules.md` §3–5, §11–13, §17 kodieren Erschaffungs-/Progressionsregeln → `scripts/lib/core-probe.mjs`-Konsistenz (Rang/EB/Cap in `rankRowFor` gespiegelt) → `scripts/validate-character-creation-progression.mjs` (fail-closed `requireCondition` mit Regelstellen; `RuleViolation` trägt `rule`) → Snapshot-Vergleich (§13.3) → Report-Artefakt → `scripts/test-gate.mjs` (`checkCharacterCreationValidation()`).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | CI, lokale Läufe, alle fünf Engines parallel. | Reine Funktionen, kein globaler State außer FINDINGS pro Lauf; Report byte-deterministisch (MD5 identisch bei Wiederholung). | pass |
| Invalid/missing | Illegale Builds dürfen niemals stillschweigend gebaut werden; Budget-Restbeträge und falsche Quelle müssen fail-closed sein. | `requireCondition` wirft `RuleViolation` mit Regelstelle; `spendFreeFeature` prüft Rang, Investitionszahl, Essence-Quelle und Stufe; ein Durchlauf ohne erwartete Ablehnung erzeugt ein Finding und Exit 1 (19 Negativpfade asserted). | pass |
| Two consumers / crash | Zwei Builds desselben Konzepts (inkrementell/direkt) dürfen nicht divergieren; Crash darf Snapshot nicht vortäuschen. | `snapshot()` normalisiert und vergleicht; Findings blockieren Exit-Code; Reports erst nach vollständigem Lauf geschrieben. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| modeling: Speziesbudget | flag | Build-Daten → §4.5-Check | Erste Build-Definitionen nutzten 4–6 Punkte (1+1+2 etc.) und wurden von der Engine korrekt abgelehnt — Zeigte Budget-Strenge, nicht Engine-Bugs. | done: Alle 6 Builds auf exakt 3 Punkte korrigiert (B6 nutzt Flugfähig=3 allein). |
| modeling: §5.3-Cap-Interaktion | flag | Progressionsplan → bumpSkill | Stufe-3-Erhöhungen auf bereits max. Novize-Fertigkeiten (Wert 3) prallten ans Cap; §5.3-Cap bindet auch Entwicklungen. | done: Pläne umgestellt (Spezialisierung/Erhöhung nach Rangwechsel); dokumentiert als legitimes §5.5-Verhalten. |
| data: §13.3-Mutation | flag | progressTo → Direct-Builder | `progressTo` mutierte das Quellobjekt, sodass die Direkterschaffung bereits hochgelevelte Attribute (5er) als Startwerte kopierte. | done: Pristiner Stufe-1-Snapshot (`basis`) vor `progressTo` erfasst und für den Direkt-Build verwendet. |
| modeling: Investitionszählung | flag | basisFor → §4.2/§11.2 | `basisFor` enthält die Kernfähigkeit bereits; die Negativpfade pusheten zu viele Features und waren damit legal. | done: Push-Zahlen korrigiert (2 bzw. 1 zusätzliche), beide Negativpfade rejected. |

## Skip reason
n/a

## Notes
- Kein Service-, Backend- oder Persistenz-Hop: Engine liest nur kodierende Regelkonstanten und schreibt ausschließlich `.qa/runs/`.
- 6/6 Basen, 3/3 Progressionen, 3/3 §13.3-Äquivalenzen, 19/19 Negativpfade abgelehnt, 0 Findings.
- Keine Zahlenänderung am Core (§19.5): Alle Befunde waren Build-/Plan-Korrekturen; §17, §13 und §11.2 sind in der Engine exakt abbildbar ohne Widerspruch.