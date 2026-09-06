# Feature: validate-travel-chase-vehicles

<!-- Issue #29 (Epic #18), Validierungsplan E2 -->

## Intent
Reisen, Verfolgungsjagden und Fahrzeug-/Maßstabsregeln werden deterministisch zusammen geprüft, damit dieselbe Distanzlogik für Fuß-, Tier- und Fahrzeugverfolgungen gilt, Reise-Fehlschläge Fail-Forward erzeugen und Maßstab/Schutz Personen von Fahrzeugen/Strukturen trennen — ohne Core-Doc-Änderung.

## Preconditions
- Regelquelle: `docs/sagadrive core rules.md` §2.6 (vergleichende Checks / Gleichstand), §10.4 (Fahrzeuge / Größenmaßstab), §14.2 (Reisen), §14.10 (Verfolgungsjagden).
- Validierungsplan E2 (#29): 6 Pflichtszenarien; Distanz Start=2 / eingeholt=0 / entkommen=5.
- Shared Probe: `scripts/lib/core-probe.mjs` (`GRADES`) verfügbar; kein RNG.
- Branch `chore/29-validate-travel-chase-vehicles` aus main; Fix-Policy Script-only (keine Core-Doc-Edits).

## Happy Path
- [x] `node scripts/validate-travel-chase-vehicles.mjs` deckt alle 6 Pflichtszenarien ab und schreibt `.qa/runs/validate-travel-chase-vehicles-report.md` mit Findings = 0.
- [x] Fuß-, Tier-/Mount- und Fahrzeugverfolgungen nutzen identische Distanzverschiebung (Cross-Mode Assertion).
- [x] Gleichstand verändert Distanz nicht (S1/S2).
- [x] Kritischer Erfolg gegen Fehlschlag oder schlechter verschiebt Distanz um 2.
- [x] Reise-Fehlschlag mutiert Zeit/Position/Ressourcen/Situation — nie Wiederholungswurf (S3).
- [x] Person↔Fahrzeug ohne Ausnahme: Schaden nach Schutz halbiert; Δ≥2 ohne Ausnahme: 0 Strukturschaden (S5).
- [x] Definierte Schwachstelle / Anti-Fahrzeug öffnet strukturelles Fenster (S6).
- [x] Skills vorgehensweise-begründet; ungerechtfertigtes Cherry-Pick (Fernkampf bei Sprint) wird abgewiesen.
- [x] Check in `scripts/test-gate.mjs` verdrahtet (`checkTravelChaseVehiclesValidation`).

## Edge Cases
- [x] Gleichstand in der Verfolgung: Shift = 0.
- [x] Fahrzeug urban: Fortbewegungsmittel + Handling dokumentiert; Wahrnehmung nur bei Traffic-Nav-Approach.
- [x] Δ≥2 mit bloßem Durchdringen ohne Anti/Schwachstelle bleibt blockiert.
- [x] Übergang Reise → Chase → Direktkonflikt besitzt eindeutigen `ruleStateAfter`.

## Regression
- [x] Bestehende validate-*-Scripts und Test Gate bleiben grün.
- [x] Keine Änderung an `docs/sagadrive core rules.md`.

## Assumptions
- Contested Chase-Runden in diesem Validator vergleichen Erfolgsgrade (Script-Sequenzen); volle Gleichstände frieren die Distanz.
- Penetration allein bridged keine ≥2 Maßstabsstufen (nur Anti-Fahrzeug / definierte Schwachstelle).

## Screenshots
| Step | Filename |
|------|----------|
| n/a | Script-only validation — keine UI |

## Scope
### In
- `scripts/validate-travel-chase-vehicles.mjs`
- `scripts/test-gate.mjs` (Wiring)
- `.qa/acceptance/validate-travel-chase-vehicles.md`
- `.qa/runs/validate-travel-chase-vehicles-report.md`
- `.qa/runs/composition-gate-validate-travel-chase-vehicles.md`

### Out
- Core-Rules-Doc-Edits; vollständiges Vehicle-Combat-Subsystem; settingbezogene Fahrzeugkataloge; RNG/Monte-Carlo.

## Security Coverage
- N/A — reines Regelskript; keine Endpoints, keine Nutzerdaten, keine Secrets.

## Implementation Notes
- **Engine:** `scripts/validate-travel-chase-vehicles.mjs` — deterministic chase bar, travel fail-forward, §10.4 scale/Schutz.
- **Coverage:** 6/6 Pflichtszenarien; foot/mount/vehicle Distanzlogik identisch; Sackgassen=0; Findings=0.
- **Report:** `.qa/runs/validate-travel-chase-vehicles-report.md` (MD5 `bbbe03bdbaf6fa0c5bf2a23634f9c4b6`, byte-stable).
- **Test Gate:** `checkTravelChaseVehiclesValidation()` after `checkConditionsResistancesValidation()`.
- No App-/UI-/Schema-Änderung; Core-Doc unverändert.

## Composition Gate

- HEAD_SHA: pending-commit on branch `chore/29-validate-travel-chase-vehicles`
- Date: 2026-09-06
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-validate-travel-chase-vehicles.md`
- Reason: Single-hop NZUI script validation; N-actors n/a — pure deterministic validation script.
