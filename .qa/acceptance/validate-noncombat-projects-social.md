# Acceptance — validate-noncombat-projects-social (#27)

## Quellen
- Ticket: #27 (Epic #18), Type: chore, Labels: P1, Validierung
- Regeln: `docs/sagadrive core rules.md` §2.8 (unterstützte Einzel-/Gruppen-/Gemeinschaftsproben), §14.1–14.9 (Erkundung, Recherche, Haltung, sozialer Konflikt, Gefahren, Kontakte, Ruf), Fail Forward
- Validierungsplan: `docs/sagadrive core validation.md` E1

## Preconditions
- `scripts/lib/core-probe.mjs` (`resolveGrade`, `GRADES`) für deterministische Probengrade.
- Locked decisions #27: kein RNG; Bounds Ziel3≤7 / Ziel5≤11 Würfe; Fix-Policy Domain/Script OK, keine Core-Rules-Doc-Edits.

## Happy Path (postcondition-style)
- **7 Pflichtszenarien:** essentielle Recherche, komplexes Gemeinschaftsprojekt (+ klein/groß), reservierter NSC/riskante Hilfe, Gefahrenpassage, Kontakt, Ruf, Erkundung unter Zeitdruck — jeweils mit Start, Probenfolge, Fortschritt, Konsequenzen im Report.
- **Fail Forward:** kein zentraler Hinweis/kein Abenteuer stoppt durch einzelnen Fehlschlag (Sackgassen = 0).
- **Unterscheidbarkeit:** Einzel = 1 Wurf/1 Ergebnis; Gruppe = N Würfe/1 Aggregat; Projekt = Intervall-Fortschritt mit ≤3 Checks — messbar unterschiedliche Kurven.
- **Haltung/Kontakt/Ruf:** Kategorie-/Zugangsverschiebung ohne freie Zahlenmodifier (Zahlenboni = 0).
- **Bounds:** Fortschrittsziel 3 ≤ 7 Würfe, Ziel 5 ≤ 11 Würfe; im Report dokumentiert.

## Edge Cases (fail-closed)
1. Essentieller Hinweis hinter einzelnem Ermitteln-Fehlschlag → verboten (§14.3).
2. >3 Projektchecks pro Intervall → Ablehnung (§2.8 Cap).
3. Haltung erzeugt freien Zahlenbonus statt Kategorieverschiebung → Finding.
4. Kontakt/Ruf als pauschaler Würfelbonus → Finding (§14.8/§14.9).
5. Extrem-Haltungen Feindselig/Unterstützend und Projektgrößen klein/komplex/groß abgedeckt.

## Gütekriterien
- 0 Findings; deterministisch; byte-reproduzierbarer Report.
- Keine Änderung an `docs/sagadrive core rules.md`.
- Script im Test-Gate verdrahtet.

## Security Coverage
- N/A — reines Regelskript; keine Endpoints, keine Nutzerdaten, keine Secrets.

## Scope
- In: Script, Report, Test-Gate, Acceptance, Composition-Gate-Proof.
- Out: Verfolgungen/Fahrzeuge (#29), direkter Kampf (#22), Core-Rules-Doc, neue Social-/Research-Engine.

## Implementation Notes
- **Engine:** `scripts/validate-noncombat-projects-social.mjs`
- Report: `.qa/runs/validate-noncombat-projects-social-report.md` (MD5 `a3661bf97f8f1f154ca9a16e2eabd0c4`)
- Test-Gate: `checkNoncombatProjectsSocialValidation()` nach All-Core-Skills
- Domain-Fix-Policy: Script-only; Core-Doc unverändert

## Composition Gate

- HEAD_SHA: `8234cbc082d7dd7d6c5d3f56982deb61254ab00d`
- Date: 2026-09-06
- Verdict: **CLEAR**

### Event
Deterministisches Validierungsskript schreibt Report und hängt am Test-Gate — kein App-Producer/Consumer-Pfad.

### Ablageklassen
- UI-Flows: keine
- Service-Schicht: keine
- Backend/Persistenz: keine
- Domain-Regeln: Validator-only (liest Core-Probe-Lib; ändert keine Runtime-Domain)

### Skip/Clear reason
Single-hop NZUI (scripts + `.qa/` only). Kein fan-out, keine Persistence, keine UI-Composition.
