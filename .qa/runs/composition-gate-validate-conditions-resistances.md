# Composition Gate Proof — validate-conditions-resistances (#33)

- HEAD_SHA: `1b86120` on branch `chore/33-validate-conditions-resistances`
- BASE_SHA: `ce29104` (main after #27/#28)
- Date: 2026-09-06

## Ablageklassen
- **UI-Flows:** keiner berührt (Diff nur `scripts/`, `.qa/`)
- **Service-Schicht:** keine
- **Backend/Persistenz:** keine Migration, kein Schema-Diff
- **Domain-Regeln:** KEINE Laufzeitänderung — Validator modelliert §9/§6.5/§2.5 deterministisch; Core-Doc unverändert

## Risiko-Matrix
| Fluss | Risiko | Befund |
|---|---|---|
| App-Runtime (UI/Services/DB) | Regression | NONE — keine App-Dateien geändert |
| Regeldomain | Fehlvalidierung | NONE — 11 Core-Zustände begin/refresh/end, 7/7 Pflichtkombos, 4 Widerstände, deadEnds=0, 0 Findings |
| Test-Infra | Gate-Lückenschluss | NONE — `test-gate.mjs` um `checkConditionsResistancesValidation()` erweitert |

## Verdict
**CLEAR** — NZUI (nicht-UI-Diff). Single-hop Validierungsskript; keine Composition über UI/Service/DB.

## Hop chain
`docs/sagadrive core rules.md` §2.5/§6.5/§7.4/§8.5/§9 (read-only Referenz) → `scripts/validate-conditions-resistances.mjs` (Zustands-State-Machine, Advantage-Folding, Widerstandsformeln, 7 Pflichtkombos) → Assertions (kein Stack, d20Count=1, observer-relatives Verborgen, Erschöpfung>3→Schaden, Lockouts=0) → `.qa/runs/validate-conditions-resistances-report.md` → `scripts/test-gate.mjs` (`checkConditionsResistancesValidation()`).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | CI Test Gate und lokale Läufe parallel. | Reine Funktionen über konstanten Regelmodellen; Report deterministisch byte-identisch. | pass |
| Invalid/missing | Stacking, globales Verborgen, Erschöpfung≥4, Dead-End-Lockouts dürfen nicht still durchgehen. | Harte Assertions + Exit 1 bei Findings. | pass |
| Two consumers / crash | CI und Report-Leser sehen denselben Regelstand. | Single Script-Source; Write erst nach vollständigem Lauf. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | keine | n/a |

## Skip reason
n/a

## Gates (lokal)
- `node scripts/validate-conditions-resistances.mjs` → Findings: 0
- Determinismus: Report-MD5 `9b92ac689e5849dcd70a3552660c2aca` byte-identisch bei erneutem Lauf
