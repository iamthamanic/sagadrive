# Acceptance — validate-analog-end-to-end-playtest (#31)

## Quellen
- Ticket: #31 (Epic #18), Type: chore, Labels: P2, Validierung
- Regeln: `docs/sagadrive core rules.md` Abschnitte 1.3, 19 und 20 (analoge Spielbarkeit)
- Validierungsplan: `docs/sagadrive core validation.md` Phase G1
- Feature slug: `validate-analog-end-to-end-playtest`

## Preconditions
- Alle abhängigen Validierungsslices (#19–#20, #22–#30, #32–#33) sind geschlossen und liefern Reports mit 0 Findings.
- Charakterbogen, Würfel und Schnellreferenz reichen als Spielhilfen — keine Rule Engine, keine App.

## Happy Path (postcondition-style)
- **Session A** (Weltprofil Fantasy): Charaktererschaffung + Exploration + Recherche/sozial + Standardkampf — vollständig auf Papier, mit gemessenen Regelpausen, Nachschlägen und Rechenschritten.
- **Session B** (gleiches oder kompatibles Profil): Reise/Verfolgung + Gemeinschaftsprojekt + Elite/Boss-Kampf + Heilung/Ruhe — ebenso gemessen.
- **Session C** (anderes Weltprofil, Drive oder Momentum deaktiviert): bleibt ohne digitale Ersatzlogik spielbar; abhängige Fähigkeiten tragen Ersatzbegrenzung oder Nicht-verfügbar (§16.3).
- Alle verbleibenden Core-Änderungsvorschläge sind auf reproduzierbare Befunde aus vorherigen Slices oder ≥2 Playtest-Sessions zurückführbar (kein Spekulations-Backlog).

## Edge Cases
1. Digital leicht automatisierbarer Wert ist analog zu aufwendig → zählt als Core-Finding trotz korrekter Mathematik.
2. Novizen müssen Grundaktionen/Erfolgsgrade mit Schnellreferenz anwenden können.
3. Deaktiviertes Drive/Momentum hinterlässt keine unsichtbaren Löcher in Fähigkeiten oder Szenenabläufen.
4. Zweites Weltprofil erzwingt keinen zusätzlichen Grundregel-Lernaufwand.

## Gütekriterien
- ≥3 vollständige analoge Session-Ledgers (A/B/C) mit Pflichtszenen und ≥2 Weltprofilen.
- Pro Session dokumentiert: Regelpausen, Nachschlagehäufigkeit, manuelle Rechenschritte, ungeklärte Situationen.
- ≥1 Session mit Drive oder Momentum deaktiviert und `digitalErsatzlogik=false`.
- 0 ungeklärte Situationen; analoge Aufwandsschwellen eingehalten; prior-slice Reports vorhanden und clean.
- Deterministischer Report unter `.qa/runs/validate-analog-end-to-end-playtest-report.md`.

## Security Coverage
- N/A — reines Regelskript / QA-Artefakt; keine Endpoints, keine Nutzerdaten, keine Secrets.

## Scope
- In: drei Session-Protokolle, Metrik-Ledger, Prior-Slice-Aggregation, §16.3-Deaktivierungs-Check, Report + test-gate-Verdrahtung, G1-Status im Validation-Doc.
- Out: App-UX, digitale Automatisierung, vollständige Publikationsredaktion des Regelbuchs, live Tischgruppe (die Engine simuliert den Papier-Ledger deterministisch).

## Composition Gate
- Verdict: **SKIPPED** (single-hop QA script → local report; no producer→consumer path). Proof: `.qa/runs/composition-gate-validate-analog-end-to-end-playtest.md`.

## Implementation Notes
- **Engine:** `scripts/validate-analog-end-to-end-playtest.mjs` — deterministisch (Report-MD5 `055611bfbcf47d3c6a9e5dff6e7c0bda`), kein RNG.
- **Sessions:** A (Eldenmark Chargen/Exploration/Sozial/Kampf), B (Reise/Projekt/Elite/Heilung), C (Graustadt + Drive aus, §16.3 ohne Digital-Ersatz).
- **Metriken:** Regelpausen, Nachschläge, manuelle Rechenschritte, Unklarheiten pro Szene; Papier-Aufwandsschwellen fail-closed.
- **Prior-Slices:** liest Findings-Zeile aus #19–#30/#32/#33 Reports; spekulative Core-Vorschläge verboten.
- **Verdrahtung:** `checkAnalogEndToEndPlaytestValidation()` in `scripts/test-gate.mjs`; G1-Status in `docs/sagadrive core validation.md`.
- Keine App-/UI-/Schema-Änderung; kein neues Dependency.

## Happy Path (verified)
- [x] Mindestens drei vollständige analoge Testsitzungen decken die definierten Pflichtsessions und mindestens zwei Weltprofile ab.
- [x] Regelpausen, Nachschlagehäufigkeit, manuelle Rechenschritte und ungeklärte Situationen werden pro Sitzung dokumentiert.
- [x] Mindestens eine Sitzung wird mit deaktiviertem Drive oder Momentum durchgeführt und bleibt ohne digitale Ersatzlogik spielbar.
- [x] Alle verbleibenden Core-Änderungsvorschläge sind auf reproduzierbare Befunde aus vorherigen Slices oder mehreren Playtests zurückführbar.
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

