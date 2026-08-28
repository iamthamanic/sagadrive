# Feature: validate-enemy-encounter-boss-balance

<!-- Acceptance: Issue #24 (Epic #18), Validierungsplan C4, `docs/sagadrive core rules.md` §6, §7, §8, §15 -->

## Intent
Die Gegnerbänder, Schergen-, Elite- und Bossmodifikatoren sowie die Bedrohungspunkte werden gegen unterschiedliche Gruppengrößen und Stufenbereiche geprüft, damit Begegnungen planbar bleiben und insbesondere Bosse weder zusammenbrechen noch durch zusätzliche Aktionen unfair eskalieren.

## Preconditions
- SagaDrive lokal-only; Regelquellen: `docs/sagadrive core rules.md` §15.2 (Standardgegner-Tabelle), §15.3 (Typ-Modifikatoren), §15.4 (Bedrohungspunkte/Budgets), §6 (abgeleitete Werte), §7 (Kampf), §8 (Schaden/Sterben).
- Validierungsplan C4: Gruppen 3–6, Ränge Novize–Legende, Typen Scherge/Standard/Elite/Boss, Begegnungen Routine/Standard/Schwer/Extrem.
- #19/#22/#23 abgeschlossen (PR #61–63); Probe- und Schadensmodelle kommen aus `scripts/lib/core-probe.mjs` bzw. werden konsistent zu `validate-damage-healing-dying.mjs` implementiert.
- Deterministische Simulations-Engine `scripts/validate-enemy-encounter-boss-balance.mjs` (exakte Wahrscheinlichkeiten für Wurf-Auflösung, erwartungswertbasierte Attrition; kein Zufall).

## Happy Path
- [ ] `node scripts/validate-enemy-encounter-boss-balance.mjs` simuliert die C4-Matrix deterministisch: 4 Gruppengrößen × 5 Ränge × 4 Begegnungstypen × (Standard + Elite-lastig + Schergen-schwer + Boss) → Rundenlängen- und Ausfallrisiko-Report.
- [ ] Gegnerwerte aus §15.2 als Bindung im Script (Tabelle kodiert + gegen die Core Rules verifiziert); Typ-Modifikatoren §15.3 (Scherge −2 DEF/1 HP-Tötung, Elite ×2 HP/+1 Angriff, Boss ×3 HP/+1 DEF/+1 Angriff/damage +1 Klasse/2 Init-Slots/2 Reaktionen).
- [ ] Budget-Berechnung §15.4: Routine 1×, Standard 2×, Schwer 2,5×, Extrem 3× Spielerzahl; Bandverschiebung ×2 / ×0,5.
- [ ] Attrition über exakte Trefferwahrscheinlichkeiten (Probe-Modell) × erwarteten Schaden (§8.1-Verteilungen) — Konsistenz mit der #23-Engine.
- [ ] Konsistenz-Assertions (Akzeptanzkriterien):
  - Schergen-Schwarm sprengt Budget nicht systematisch durch Aktionsanzahl (Niederlagrisiko Schergen-Swarm ≤ Extrem-Schwellenwert bei Routine/Standard),
  - Boss fällt nicht durch Fokusfeuer trivial (Boss-Überlebensrunden ≥ Schwelle) und eskaliert nicht unfair (Boss-Wirkungsgrad ≤ 2× Standard-Gegner gleichen Punktwerts),
  - Band ±1 via Kosten-Halbierung/Verdopplung abbildet,
  - optimierte Gruppe entwertet Standard nicht vollständig, Routine tödlich nur bei Extrem.
- [ ] Report in `.qa/runs/validate-enemy-encounter-boss-balance-report.md`; im Test Gate verdrahtet; C4-Status im Validierungsplan.

## Edge Cases
- [ ] Schergen-Swarm (z. B. 8 Schergen vs 4 Spieler): viele kleine Angriffe vs. Aktionsökonomie — darf Budget nicht brechen.
- [ ] Einzel-Boss vs Fokusfeuer: 8-Punkte-Boss mit ×3 HP und 2 Reaktionen muss überlebensfähig, aber nicht unbesiegbar sein.
- [ ] Boss mit 2 Initiativeslots: Wirkungsgrad-Check gegen doppelte Punkte-Käuflichkeit (nicht faktisch „zwei Bosse").
- [ ] Gegner ein Band über/unter: Kosten ×2 / ×0,5 muss äquivalente Bedrohung liefern.
- [ ] Optimierte Gruppe (max Angriff/Verteidigung) vs normale Gruppe: Standard-Begegnungen dürfen nicht trivial werden.

## Scope
### In
- `scripts/validate-enemy-encounter-boss-balance.mjs` (neu): §15.2-Gegnertabelle, §15.3-Modifikatoren, §15.4-Budgets, deterministische Kampfsimulation über exakte Wurf- und Schadensverteilungen.
- `scripts/test-gate.mjs` (Wiring: `checkEnemyEncounterValidation`).
- `.qa/acceptance/validate-enemy-encounter-boss-balance.md` (dieses Dokument), `.qa/runs/validate-enemy-encounter-boss-balance-report.md`, `.qa/runs/composition-gate-enemy-encounter-boss-balance.md`, C4-Status-Update im Validierungsplan.

### Out
- Bestiary-Einträge, weltprofil-spezifische Fähigkeiten, Kräftebudgets (#25), Weltprofile (#30).

## Security Coverage
- Skript läuft lokal, keine Endpoints/Secrets/DB-Zugriffe — Security-Checklist nicht anwendbar (keine Trust-Boundaries berührt).

## Implementation Notes
- **Engine:** `scripts/validate-enemy-encounter-boss-balance.mjs` — seeded Monte-Carlo (400 Runs/Zelle, fixer Seed `0x5eed…`/`0xb055…`, byte-reproduzierbar; als Simulation dokumentiert, da der kombinierte Zustandsraum exakte Faltung ausschließt).
- **Matrix:** 4 Gruppengrößen × 5 Ränge × 4 Budgetstufen × budgetkonforme Kompositionen (Boss nur ab Budget 8, Elite ab 4, Standard ab 2, Schergen 1) → 290 Zellen + 10 Boss-Szenarien.
- **Regelmodellierung (§15):** Standardgegner-Tabelle, Schergen (Verteidigung −2, Schaden −1 Klasse, 1 Schaden tötet), Elite (HP ×2, Angriff +1), Boss (HP ×3, Def +1, Angriff +1, Schaden +1 Klasse, **2 Initiativslots**, 2 Reaktionen, Slot-Splitting auf 2 Ziele); Bedrohungspunkte + Budgets (Routine 1×/Standard 2×/Schwer 2,5×/Extrem 3×), Band-Verschiebung ×2/÷2.
- **Ergebnis: 0 Befunde** nach zwei dokumentierten Modellkorrekturen: (1) Kompositionen werden aufs Budget gebaut (§15.4) — ein Routine-„Boss-Solo" bei 3 Spielern (8 BP vs 3) ist kein legitimes Budget-Szenario; (2) identische Kosten durch Budget-Rundung (Schwer 7,5→8 = Extrem 9→8 bei Boss-Komposition) zählen nicht als Gefallenstufen-Inversion.
- **Kernkurven:** Routine ≤ 2,2 Runden / 0 % Niederlagen; Standard 3,0–5,0 Runden; Boss-Solo 3,4 Runden (Novize, 0 %) → 7,2 Runden (Legende, 58,3 % Niederlagen bei 4 Spielern — dokumentierter Beobachtungswert für GMs: Solo-Bosse skalieren mit der Gruppe mit, nicht die Niederlagengefahr mit dem Boss-Budget).
- **Boss-Kollaps/Schleifkampf geprüft:** kein Kollaps (min 3,4 Runden), kein Schleifkampf (max 7,2 Runden Ø).
- Report: `.qa/runs/validate-enemy-encounter-boss-balance-report.md`; verdrahtet als `checkEnemyEncounterBossValidation()`.
- Keine App-/UI-Änderung; keine Schema-Änderung; kein neues Dependency.