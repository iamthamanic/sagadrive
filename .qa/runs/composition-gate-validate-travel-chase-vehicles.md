# Composition Gate Proof — validate-travel-chase-vehicles (#29)

- HEAD_SHA: pending-commit on branch `chore/29-validate-travel-chase-vehicles`
- BASE_SHA: `6c0469c` (main after #33)
- Date: 2026-09-06

## Ablageklassen
- **UI-Flows:** keiner berührt (Diff nur `scripts/`, `.qa/`)
- **Service-Schicht:** keine
- **Backend/Persistenz:** keine Migration, kein Schema-Diff
- **Domain-Regeln:** KEINE Laufzeitänderung — Validator modelliert §10.4/§14.2/§14.10 deterministisch; Core-Doc unverändert

## Risiko-Matrix
| Fluss | Risiko | Befund |
|---|---|---|
| App-Runtime (UI/Services/DB) | Regression | NONE — keine App-Dateien geändert |
| Regeldomain | Fehlvalidierung | NONE — 6/6 E2-Szenarien, Distanzlogik Fuß/Tier/Fz identisch, Sackgassen=0, Findings=0 |
| Test-Infra | Gate-Lückenschluss | NONE — `test-gate.mjs` um `checkTravelChaseVehiclesValidation()` erweitert |

## Verdict
**CLEAR** — NZUI (nicht-UI-Diff). Single-hop Validierungsskript; keine Composition über UI/Service/DB.

## Hop chain
`docs/sagadrive core rules.md` §2.6/§10.4/§14.2/§14.10 (read-only Referenz) → `scripts/validate-travel-chase-vehicles.mjs` (Chase-Distanzleiste, Reise-Fail-Forward, Maßstab/Schutz/Schwachstelle, 6 Pflichtszenarien) → Assertions (Sackgassen=0, Gleichstand-Freeze, Δ≥2 block, kein Retry, kein Skill-Cherry-Pick) → `.qa/runs/validate-travel-chase-vehicles-report.md` → `scripts/test-gate.mjs` (`checkTravelChaseVehiclesValidation()`).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | CI Test Gate und lokale Läufe parallel. | Reine Funktionen über konstanten Regelmodellen; Report deterministisch byte-identisch. | pass |
| Invalid/missing | Sackgassen, Distanz-Shift bei Gleichstand, Δ≥2-Schaden, Reise-Retry, Cherry-Pick dürfen nicht still durchgehen. | Harte Assertions + Exit 1 bei Findings. | pass |
| Two consumers / crash | CI und Report-Leser sehen denselben Regelstand. | Single Script-Source; Write erst nach vollständigem Lauf. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | keine | n/a |

## Skip reason
n/a

## Gates (lokal)
- `node scripts/validate-travel-chase-vehicles.mjs` → Findings: 0
- Determinismus: Report-MD5 `bbbe03bdbaf6fa0c5bf2a23634f9c4b6` byte-identisch bei erneutem Lauf
