# Feature: validate-damage-healing-dying

<!-- Acceptance: Issue #23 (Epic #18), Validierungsplan C2, `docs/sagadrive core rules.md` §6.1/§6.6, §8, §16.4 -->

## Intent
Schaden, Schutz, Heilung und Sterben werden über mehrere Konflikte geprüft, damit SagaDrive verwundbare Figuren behält, ohne dass einzelne Treffer, Rüstung oder Regeneration die Belastungskurve ungewollt dominieren.

## Preconditions
- SagaDrive lokal-only; Regelquelle `docs/sagadrive core rules.md` §6.1 (Gesundheit), §6.6 (Erholung), §8 (Schaden/Heilung/Tod), §16.4 (Härtegrade Heroisch/Standard/Hart).
- Validierungsplan C2 definiert Pflichtfälle und Messgrößen (Treffer bis 0, Heilung pro Ruhephase, Sterbewahrscheinlichkeit, Schutzwirkung, Attrition).
- #19 (PR #61) und #22 (PR #62) sind abgeschlossen; die Schadenswürfel werden über die geteilte Kernprobe (`scripts/lib/core-probe.mjs`) bzw. exakte Verteilungen aufgelöst.
- Der Validierungsapparat ist ein deterministisches Node-Script (`scripts/validate-damage-healing-dying.mjs`): exakte Wahrscheinlichkeiten für Einzelwürfe, vollständige Zustands-Simulation (Health-Track) über drei Bänder.

## Happy Path
- [ ] `node scripts/validate-damage-healing-dying.mjs` berechnet deterministisch: erwartete Treffer bis 0 (E[HP]/E[Schaden pro Treffer]), Heilungskurven, Sterbend-3-Wahrscheinlichkeit, Schutzwirkung pro Schadensklasse, Attrition über mehrere Konflikte.
- [ ] Testprofile: Ausdauer niedrig/mittel/hoch × Bänder I/III/V; Schutz 0/1/2/3/5; mit/ohne Durchdringung; alle fünf Schadensklassen (§8.1).
- [ ] Pflichtszenarien: normaler Treffer, Krit (nur Würfel verdoppelt, §8.2), mehrere Treffer, 0 Gesundheit, Schaden bei 0 (Sterbend +1 / Krit +2), Stabilisierungs-Wurf (§8.5: d20+Ausdauer+EB vs 15), Erste Hilfe (§8.7), Verschnaufpause + medizinische Versorgung (§8.8, Ersatz nicht Addition), volle Ruhe.
- [ ] Härtegrade Heroisch/Standard/Hart (§16.4) erzeugen klar unterschiedliche, aber spielbare Attritionsprofile; Hart-Regeln (Start Sterbend 2, Wunden −2 max HP, max 3 Wunden → Sterbend +1, Ruhe 2×Erholung) modelliert.
- [ ] Massiver Schaden (§8.6): single hit ≥ aktuell + max Gesundheit → sofortiger Tod, deterministisch verifiziert.
- [ ] Report in `.qa/runs/validate-damage-healing-dying-report.md`; Check im Test Gate verdrahtet.

## Edge Cases
- [ ] Kritischer Schaden verdoppelt nur Würfel, nicht feste Boni (§8.2: d8+2 → 2d8+2).
- [ ] Schutz macht leichte Waffen nicht irrelevant und schwere nicht zur Zwangswahl: für jede (Schutz, Klasse)-Kombination bleibt die Trefferwirkung > 0 und die Attritionsreihenfolge der Waffen bleibt erhalten (keine Klassen-Inversion, solange Würfel+Bonus-Dominanz nicht kippt).
- [ ] Wiederholtes Erreichen von 0 im Hart-Modul erzeugt jeweils eine Wunde (bis 3); vierte Wunde stattdessen Sterbend +1.
- [ ] Medizinische Versorgung während der Verschnaufpause ersetzt 1×Erholung durch 2×Erholung — nicht additiv (§8.8).
- [ ] Sterbend 0 = stabil; Sterbend 3 = Tod; Krit-Fehlschlag beim Stabilisieren = Sterbend +2 (§8.5).
- [ ] Erste Hilfe: Krit-Erfolg stabil + 1 HP; Krit-Fehlschlag Sterbend +1 (§8.7).
- [ ] Stabil bei 0 nach 10 sicheren Minuten: 1 Gesundheit (§8.8).

## Scope
### In
- `scripts/validate-damage-healing-dying.mjs` (neu): exakte Schadensverteilungen pro Klasse (inkl. Krit-Doppelwürfel), Health-Attrition-Simulation über Konflikte, Sterbend-Kette (deterministische Grade über die geteilte Probe), Schutz-Matrix, Härtegrad-Vergleich.
- `scripts/test-gate.mjs` (Wiring: `checkDamageHealingValidation`).
- `.qa/acceptance/validate-damage-healing-dying.md` (dieses Dokument), `.qa/runs/validate-damage-healing-dying-report.md`, `.qa/runs/composition-gate-damage-healing-dying.md`, C2-Status-Update im Validierungsplan.

### Out
- Gegnerbudget (#24), Kräftebalance (#25), Welt-spezifische Regel-Ersatzungen (#30).

## Security Coverage
- Skript läuft lokal, keine Endpoints/Secrets/DB-Zugriffe — Security-Checklist nicht anwendbar für dieses Slice (keine neuen Uploads/Auth-Flächen/Trust-Boundaries).

## Implementation Notes
- **Engine:** `scripts/validate-damage-healing-dying.mjs` — exakte Faltung der Schadenswürfel (d4–d12, §8.1), Krit verdoppelt nur Würfel (§8.2, verifiziert: Krit-Ø > Normal-Ø für alle Klassen), Schutz 0/1/2/3/5 × Durchdringung 0/1/2 × 5 Schadensklassen × 3 Bänder × 3 Ausdauerprofile → 720 Szenario-Reihen.
- **Dying-State-Machine** (§8.5): exakte Zustands-Wahrscheinlichkeiten über Todeswürfe (d20+Ausdauer+EB vs ZW 15); Sterbend 3 = Tod (absorbing).
- **Härtegrade** (§16.4): Heroisch = stabil bei 0 (0 % Todeswahrscheinlichkeit, Sterbend nur via Krit/atemöglicher Gefahr); Standard = Start 1 (19,25 % Todesrisiko bei mittlerer Ausdauer, Novize); Hart = Start 2 (47,50 %) + Wunden-Modell (max 3, je −2 max Gesundheit, weitere Stürze → Sterbend +1, volle Ruhe nur 2 × Erholung).
- **Erholung** (§8.8): Verschnaufpause = Erholungswert; medizinische Versorgung = 2 × Erholung (ersetzt, nicht additiv — asserted); stabil bei 0 = +1 HP nach 10 min; Volle Ruhe = voll (Standard) / 2 × Erholung (Hart).
- **Massiver Schaden** (§8.6): Schwelle = aktuelle + maximale Gesundheit; Krit-Schaden der Extrem-Klasse erreicht diese bei vollem Leben praktisch nie (Kurven im Report).
- **Invarianten:** mehr Schutz erhöht nie erlittenen Schaden; Durchdringung hilft strikt; leichte Waffen bleiben bei hohem Schutz nicht strikt irrelevant (nicht komplett neutralisiert).
- **Ergebnis:** 0 Befunde — Schutz 0–5 erzeugt keine toten/dominate Kombinationen; Härtegrade erzeugen klar unterschiedliche, spielbare Profile.
- Report: `.qa/runs/validate-damage-healing-dying-report.md`; verdrahtet als `checkDamageHealingDyingValidation()`.
- Keine App-/UI-Änderung; keine Schema-Änderung; kein neues Dependency.