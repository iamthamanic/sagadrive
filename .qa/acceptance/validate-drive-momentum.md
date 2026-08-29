# Acceptance — validate-drive-momentum (#26)

## Quellen
- Ticket: #26 (Epic #18), Type: chore, Labels: P2, Validierung
- Regeln: `docs/sagadrive core rules.md` §2.10 (Drive: Start 3, Max 5, Reroll mit Alte/Neu-Wahl, max 1/eigene Probe, Rückgewinnung via Komplikation), §2.11 (Momentum: Start 0, Max 3, Verfall 1/Szenenende, Quellen/Ausgaben), §2.12 + §16.3 (Deaktivierung: unabhängig, abhängige Fähigkeiten brauchen Ersatzbegrenzung oder nicht-verfügbar)
- Validierungsplan: `docs/sagadrive core validation.md` D2 (Varianten beide/nur Drive/nur Momentum/keine; Messgrößen: Gewinn/Ausgaben pro Szene, Cap-Häufigkeit, realer Wert eines Drive-Rerolls, Momentum-Einfluss auf Teamaktionen, Fähigkeiten ohne definierten Zustand bei Deaktivierung)

## Preconditions
- `scripts/lib/core-probe.mjs` (exakte Verteilungen je Modus normal/advantage/disadvantage).
- `scripts/lib/core-probe.mjs`-Modi decken §2.5 ab.

## Happy Path (postcondition-style)
- **Drive-Reroll-Wert:** exakt quantifiziert für normal/Vorteil/Nachteil über Zielwert-Matrix (5–35) und Risikoprofile (Novize–Legende): P(Erfolg mit Reroll, keep-better-of-two) = 1 − (1 − p)²; Nettogewinn gegenüber Baseline dokumentiert; Deckung mit der Realisierung „altes oder neues Ergebnis darf gewählt werden" (nie schlechter).
- **Szenen-Flüsse:** mehrere typische Szenen (Kampf, Recherche, Sozial) mit Buchhaltung Gewinn/Ausgabe/Cap/Verfall für Drive (Start 3, Max 5, +1 je Komplikation) und Momentum (Start 0, Max 3, Quellen nur kritische Zusammenarbeit/gemeinsame Zielerreichung/Teamfähigkeit, −1 am Szenenende).
- **Momentum auf Teamaktionen:** Koordination (Helfen → Vorteil) quantifiziert: Erfolgsspanne Vorteil vs normal; Teammanöver-Ausgaben senken den Pool, Cap 3 erzwingt民国 priorisierte Ausgaben.
- **Vier Varianten:** beide aktiv / nur Drive / nur Momentum / keine — je vollständige Szenen-Simulation mit Spielbarkeitsnachweis.

## Edge Cases (fail-closed)
1. Mehr als 1 Drive für dieselbe eigene Probe → Ablehnung (§2.10).
2. Drive über Max 5 ( stairs Komplikationen beyond cap) → Cap greift, Überschuss verfällt.
3. Momentum-Erzeugung durch mehrfach gleiche Trigger in derselben Runde unkontrolliert → Begrenzung assertiert (§2.11-Quellenliste; Teamfähigkeit-Krit einmal pro Runde je Fähigkeit — §11.3 Analyse/Koordination-Muster).
4. Momentum über Cap 3 → Verfall/Append verweigert.
5. Ressourcenfähigkeiten bei Deaktivierung: ohne explizite Ersatzbegrenzung → als nicht verfügbar markiert (§2.12/§16.3); stillschweigend kostenlos ist verboten und wird perfinding geahndet.
6. Reroll behält Vorteil/Nachteil-Bedingungen (§2.10): Nachteil-Reroll würfelt erneut unter Nachteil — kein „Nachteil abwerfen".

## Gütekriterien
- 0 Findings; exakte Wahrscheinlichkeiten (keine Simulation für Reroll-Wert); Szenen-Buchhaltung deterministisch.
- Byte-reproduzierbarer Report.

## Security Coverage
- N/A — reines Regelskript; keine Endpoints, keine Nutzerdaten, keine Secrets.

## Scope
- In: Reroll-Wert, Detail-Einführung, Komplikations-Regeneration, Momentum-Quellen/Cap/Verfall, Teamaktionen, vier Deaktivierungs-Varianten.
- Out: neue Archetypfähigkeiten, allgemeine Kernwahrscheinlichkeiten außerhalb der Ressourcenwirkung.

## Implementation Notes
- **Engine:** `scripts/validate-drive-momentum.mjs` — deterministisch (Report-MD5 `c9ea2a37672c50655f22b4ecc78f813d`), exakte Reroll-Mathematik 1−(1−p)² auf `scripts/lib/core-probe.mjs`.
- **§2.10 Drive:** 60 exakte Reroll-Zeilen (5 Risikoprofile × normal/Vorteil/Nachteil × Zielwert 10/15/20/25); Invarianten: Reroll nie schlechter (Wahlrecht alt/neu), Gewinn ≤ 25pp (Theorie-Maximum p·(1−p) bei p=0,5), Baseline-Ordnung Vorteil ≥ normal ≥ Nachteil.
- **§2.10-Buchhaltung:** Start 3, Max 5 (überschießende Komplikation clamp), max 1 Drive/eigene Probe (fail-closed), Komplikations-Rückgewinnung nur bei aktivem Drive.
- **§2.11:** Start 0, Max 3 (Aufbau über Cap fail-closed), nur legitime Quellen (kritische Zusammenarbeit/gemeinsame Zielerreichung/Teamfähigkeit), doppelte Quelle pro Runde abgelehnt, Ausgaben senken Pool, Verfall −1 am Szenenende.
- **§2.12/§16.3-Varianten:** alle vier (beide/nur Drive/nur Momentum/keine) als deterministische Szenenläufe; Deaktiviert-Aktionen fail-closed abgelehnt (keine stillschweigend kostenlosen Fähigkeiten).
- **§16.3-Abhängigkeiten:** §11.3-Kernfähigkeiten katalogisiert — Analyse/Koordination mit expliziter Ersatzbegrenzung (Momentum-Zusatzeffekt entfällt, Kernwirkung bleibt), Drive-Marker-Fähigkeit mit Ersatzbegrenzung „einmal pro Szene".
- **Gefundene Modellklarstellung (keine Regel-Bug):** Reroll-Gewinn ist **nicht** monoton über Zielwerte/Modi — er peakt bei p=0,5 mit 25pp; der erste Invarianten-Entwurf (monoton über Modi) war regelwidrig und wurde korrigiert. Dokumentiert als Designbestätigung: Reroll hilft mittleren Wahrscheinlichkeiten am stärksten.
- Report: `.qa/runs/validate-drive-momentum-report.md`; verdrahtet als `checkDriveMomentumValidation()`; D2-Status im Validation-Doc.
- Keine App-/UI-/Schema-Änderung; kein neues Dependency.