# Acceptance — validate-powers-essences-ranks (#25)

## Quellen
- Ticket: #25 (Epic #18), Type: chore, Labels: P2, Validierung
- Regeln: `docs/sagadrive core rules.md` §10 (Momentum), §11 (Fähigkeiten/Ränge/Investitionen), §12 (Kraftmodell 12.1–12.6), §2 (Aktivierungsprobe)` — §12.6 Wirkungsbudget: Novize d6+2 … Legende 5d6+5
- Validierungsplan: `docs/sagadrive core validation.md` D1 (Dimensionen: Schaden, Kontrolle, Mobilität, Schutz, Utility, Ziele, Fläche, Reichweite, Dauer, Aufrechterhaltung; kritisch: Experte–Legende, Multi-Ziele+Kontrolle+lange Dauer, Gegenwirkung, sekundäre Essenz, Multi-Archetyp)

## Preconditions
- `scripts/lib/core-probe.mjs` (Aktivierungsproben via `exactProbabilities` / `resolveGrade`).
- `scripts/validate-character-creation-progression.mjs` (Builds B1–B6 als Kraft-Träger).

## Happy Path (postcondition-style)
- **Budget-Kurve:** Für jeden Rang I–V existieren repräsentative Kräfte aller 5 Essenzen; Wirkungsbudget §12.6 (Novize ≈ d6+2 … Legende ≈ 5d6+5) wird als Obergrenze asserted; jede Kraft dokumentiert Wirkungsbudget und getestete Wirkung.
- **Pflichtprüfungen pro Kraft:** Aktivierungsprobe (d20 + Attribut + EB; erschlossene Essenz = Training), Widerstand (vergleichend, Ausweichprobe), Aufrechterhaltung (standardmäßig nur 1 Effekt), direkte Gegenwirkung mit Gleichstand-Regel (§12.5: bestehender Effekt bleibt), Begrenzungsmodelle (einmal/Szene, Charges, Erschöpfung, Komponenten, externe Quelle, Ritual).
- **Alle 5 Essenzen** in Kampf und Nichtkampf getestet; sekundäre Essenz in mindestens einem Build (B2 Spirituell→Körperlich nutzt Sekundär-Manifestation).
- **Rang III–V kombiniert:** Schaden+Fläche+Dauer+Kontrolle nie zusammen maximal (§12.6: "Mehr Ziele, Fläche, Reichweite, Dauer und Kontrolle verbrauchen dasselbe Wirkungsbudget").
- **Multi-Archetyp:** B1 (Denker+Rebell+Diplomat) nutzt Fähigkeiten aus 3 Archetypen ohne Budget-Verletzung.

## Edge Cases (fail-closed)
1. **Budgetsprengung:** Kraft mit gleichzeitig max Schaden (Klasse Legende), großer Fläche, langer Dauer und harter Kontrolle auf Rang III → Ablehnung (§12.6).
2. **Doppelte Aufrechterhaltung:** zweiter aufrechterhaltener Effekt ohne ausdrückliche Fähigkeit beendet den ersten (§12.4) — Simulation der Estadolets.
3. **Externe Quelle:** gebundene/technologische Kraft mit Equipment-Rückfüllung über Chaos-Budget → Asserter verhindert faktisch unbegrenzte Nutzung (§12.3 Begrenzungsmodelle binden).
4. **Gegenwirkung bei Gleichstand:** Vergleichsprobe mit identischem Ergebnis → bestehender Effekt bleibt (§12.5, fail-closed für Angreifer).
5. Aktivierungsprobe ohne erschlossene Essenz: Kein Essenz-Training → EB 0 auf Kraftprobe (§12.2), fail-closed gegen versehentliches Voll-EB.
6. Rang über Charakterrang (Legende-Fähigkeit auf Stufe 12) → Ablehnung via §11.2-Model von #20.

## Gütekriterien (§19.5)
- 0 Findings; jede Ablehnung mit exakter Regelstelle.
- Deterministische Datenstrukturen + geteilte Probe-Bibliothek; Stichproben-Monte-Carlo nur für Szenario-Aggregate (fixer Seed), Rest exakt.

## Security Coverage
- N/A — reines Regelskript; keine Endpoints, keine Nutzerdaten, keine Secrets.

## Scope
- In: Wirkungsbudget I–V, Aktivierung/Widerstand/Gegenwirkung, Aufrechterhaltung, Begrenzungsmodelle, 5 Essenzen, sekundäre Essenz, Multi-Archetyp.
- Out: vollständige Content-Bibliothek, welt-spezifische Flavor-Balance.

## Implementation Notes
- **Engine:** `scripts/validate-powers-essences-ranks.mjs` — deterministisch (kein RNG; Report-MD5 bei Wiederholung identisch: `59171032bfd8d7e9e645de06fc9283f4`), auf der geteilten Probe-Bibliothek `scripts/lib/core-probe.mjs`.
- **Katalog:** 30 repräsentative Kräfte — jede Essenz × jeder Rang (I–V) abgedeckt, alle D1-Dimensionen (Schaden, Kontrolle, Mobilität, Schutz, Utility, Multi-Ziele, Fläche, Dauer) abgedeckt; Limits: einmal/Szene, Charges, Erschöpfung, Komponenten, externe Quelle, Ritual, Aufrechterhaltung.
- **§12.6 Budget-Modell:** Kosten = 1 + Schadensmagnitude (über Richtwert) + jede weitere maximierte Dimension; Assert: kein Kraft-Build überschreitet Rang-Ceiling (verhindert Schaden+Fläche+Dauer+Kontrolle gleichzeitig maximal).
- **§12.2 Aktivierung:** exakte Verteilungen (keine Simulation) vs Zielwert 15; Träger auf jeweiliger Rang-Stufe; alle 32 Zeilen in 25–95% (keine dominante oder nutzlose Kraft); nicht erschlossene Essenz fail-closed ohne Training (EB 0).
- **§12.4 Aufrechterhaltung:** Zustands-Szenario Hypnose→Zeitlähmung — zweiter Effekt beendet den ersten; ausdrückliche Mehrfach-Haltung bleibt via Fähigkeit erlaubt.
- **§12.5 Gegenwirkung:** Gleichstand erhält bestehenden Effekt; Angriff > Verteidigung durchdringt; niedriger scheitert.
- **§12.3 Begrenzungen:** Ausgaben über Charges hinaus und externe Rückfüllung ohne Quelle werden fail-closed abgelehnt (keine faktisch unbegrenzte Nutzung).
- **Sekundäre Essenz:** B2-Modell (Spirituell→Körperlich, Stufe 14) aktiviert Primär- und Sekundär-Manifestationen erfolgreich (beide Essenzen erschlossen).
- **Multi-Archetyp:** B1-Modell (Denker+Rebell+Diplomat) mit 3 Archetyp-Quellen.
- **Rang-Gate:** Legende-Kraft auf Stufe 12 → abgelehnt (§11.2).
- **Gefundene Modellfragen (dokumentiert, keine Regel-Bugs):** (1) Essence-Rank-Katalog vollständig durch Deklaration erzeugt — Coverage-Lücken wurden beim ersten Lauf systematisch aufgedeckt und geschlossen; (2) Aktivierungszielwert 15 für alle Ränge beibehalten: Erfolgsspanne bleibt stabil, weil EB mit dem Rang wächst — legales §12.2-Verhalten.
- Report: `.qa/runs/validate-powers-essences-ranks-report.md`; verdrahtet als `checkPowersEssencesValidation()`.
- Keine App-/UI-/Schema-Änderung; kein neues Dependency.