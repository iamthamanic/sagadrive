# Feature: validate-combat-action-economy

<!-- Acceptance: Issue #22 (Epic #18), Validierungsplan C1, `docs/sagadrive core rules.md` §2, §6, §7, §9 -->

## Intent
Der direkte Kampf wird als vollständiger Ablauf geprüft, damit Initiative, Hauptaktion, Bewegung, Reaktion, Sicht, Deckung, Reichweite und Manöver zusammen vorhersehbar funktionieren und keine dominante Standardaktion oder Regel-Lücke entsteht.

## Preconditions
- SagaDrive lokal-only; Regelquelle `docs/sagadrive core rules.md` §6 (abgeleitete Werte), §7 (Kampfsystem), §9 (Zustände), §2.5 (Vorteil/Nachteil).
- Validierungsplan C1 definiert 11 Pflichtszenarien; Testbänder I, III, V (Stufen 1–4, 9–12, 17–20).
- #19 (Kernwahrscheinlichkeiten) ist abgeschlossen (PR #61); die Probe-Auflösung wird aus `scripts/validate-core-probability.mjs` in `scripts/lib/core-probe.mjs` extrahiert und geteilt (eine Quelle der Wahrheit, keine Parallel-Implementierung).
- Der Validierungsapparat ist ein deterministisches Node-Script (`scripts/validate-combat-action-economy.mjs`), das die Szenarien als Aktionskosten-State-Machine über die Core-Regeln simuliert.

## Happy Path
- [ ] `node scripts/validate-combat-action-economy.mjs` durchspielt alle 11 Pflichtszenarien deterministisch über drei Testbänder (I/III/V) und prüft Aktionskosten, Timing und Widerstände gegen §7.
- [ ] Zugstruktur-State-Machine (§7.3) erzwingt: 1 Hauptaktion, 1 Bewegung, 1 freie Interaktion, 1 Reaktion/Runde; keine allgemeine Bonusaktion; Hauptaktion → zweite Bewegung.
- [ ] Advantage-Folding nach §2.5: mehrere Vorteils-/Nachteilsquellen kollabieren zu genau 2d20 keep-high/low — nie 3d20.
- [ ] Gelegenheitsangriff-Logik (§7.5): freiwilliges Verlassen → Reaktion des Gegners; Lösen/erzwungene Bewegung/Teleportation → kein Gelegenheitsangriff.
- [ ] Manöver-Widerstände (§6.5, §7.6): Greifen→Manöverwiderstand, Schubsen→Körperwiderstand, Zu-Fall-Bringen→Reflexwiderstand, Entwaffnen→Verteidigung, Entkommen→Manöverwiderstand des Greifers.
- [ ] Konsistenz-Assertions: keine Kernaktion erzeugt mehr Aktionswert als Alternativen ohne Kosten/Voraussetzung; Überraschte haben bis zum ersten Zug keine Reaktion; Bereithalten verbraucht Hauptaktion UND Reaktion (keine Gratis-Hauptaktion).
- [ ] Report in `.qa/runs/validate-combat-action-economy-report.md`; Check im Test Gate verdrahtet.

## Edge Cases
- [ ] Erzwungene Bewegung (Schubsen, Greifen-Verschiebung) und Teleportation lösen keinen Gelegenheitsangriff aus (§7.5).
- [ ] Bereithalten: Hauptaktion jetzt + Reaktion später — keine faktische Zusatz-Hauptaktion ohne Kosten.
- [ ] Gegriffen → Bewegung 0 (§9.3); Entkommen als Hauptaktion gegen Manöverwiderstand; bei stark differenten Stärke-/Geschick-Profilen bleibt Entkommen möglich (Athletik ODER Akrobatik).
- [ ] Verborgener Angriff: Vorteil, danach normalerweise sichtbar; Verborgen ist observer-relativ, kein globales Boolean (§9.10).
- [ ] Volldeckung: nicht direkt anvisierbar — Angriff unmöglich statt Nachteil.
- [ ] Reichweite: bis normal = normal, bis maximal = Nachteil, darüber = unmöglich (§7.8).
- [ ] Überraschung: Nachteil auf Initiative + keine Reaktion bis zum ersten Zug (§7.2).

## Scope
### In
- `scripts/lib/core-probe.mjs` (neu): geteilte Probe-Modelle (resolveGrade, exactProbabilities, Profile) — extrahiert aus #19-Engine.
- `scripts/validate-core-probability.mjs` (Refactor auf Shared-Lib, Verhalten unverändert).
- `scripts/validate-combat-action-economy.mjs` (neu): 11 Pflichtszenarien × 3 Testbänder, Aktionskosten-State-Machine, Advantage-Folding, Reaktions-/Gelegenheitsangriff-Logik, Deckungs-/Reichweiten-Modifikatoren.
- `scripts/test-gate.mjs` (Wiring: `checkCombatActionEconomyValidation`).
- `.qa/acceptance/validate-combat-action-economy.md` (dieses Dokument), `.qa/runs/validate-combat-action-economy-report.md`, `.qa/runs/composition-gate-combat-action-economy.md`, A1/C1-Status-Update im Validierungsplan.

### Out
- Schaden/Heilung als Balancekurve (#23), Gegnerbudget (#24), Zustands-Kombinatorik (#33), Feinbalance von Kräften (#25).

## Security Coverage
- Skript läuft lokal, keine Endpoints/Secrets/DB-Zugriffe — Security-Checklist nicht anwendbar für dieses Slice (keine neuen Uploads/Auth-Flächen/Trust-Boundaries).

## Implementation Notes
- **Shared-Lib-Extraktion:** Probe-Modelle (resolveGrade, exactProbabilities, createProfile, rankRowFor, successShare) aus der #19-Engine nach `scripts/lib/core-probe.mjs` extrahiert; `validate-core-probability.mjs` refactored, Verhalten byteidentisch verifiziert (1862 Reihen / 266 Profile, unverändert).
- **Combat-Engine** `scripts/validate-combat-action-economy.mjs`: 10 Szenario-Funktionen decken alle 11 C1-Pflichtszenarien ab (Teil-/Volldeckung + Reichweite in einem Szenario-Block), über Testbänder I/III/V (Stufen 1/9/17, Ränge Novize/Experte/Legende) → 57 Probe-Reihen.
- **Regelmodellierung:** §6.2 Verteidigung, §6.5 Körper-/Reflex-/Geist-/Manöverwiderstand deterministisch abgeleitet; §7.3 Zugstruktur als State-Machine (1 Hauptaktion, 1 Bewegung, 1 freie Interaktion, 1 Reaktion — keine allgemeine Bonusaktion); §7.2 Überraschung (Init-Nachteil + Reaktions-Sperre bis erster Zug); §7.5 Gelegenheitsangriff-Ausnahmen (Lösen/erzwungene Bewegung/Teleport); §7.7 Deckung/Sicht (Volldeckung fail-closed untargetable); §7.8 Reichweitenstufen; §9.2/§9.3 Liegend/Gegriffen-Interaktionen; §9.10 observer-relatives Verborgen (2 Beobachter, 1 nimmt wahr).
- **Advantage-Folding §2.5** als zentrale Funktion: paarweises Aufheben, nie mehr als 2d20.
- **Befunde:** 0 — keine dominante Standardaktion, keine Timing-Widersprüche; Bereithalten kostet exakt Hauptaktion + Reaktion; Greifen/Entkommen bei differenten Profilen via Athletik-ODER-Akrobatik-Route offen.
- **Verifikation:** Alle Grade über die geteilte Kernprobe — konsistent mit der §19.1-verifizierten #19-Matrix (identische Grade-Auflösung).
- Report: `.qa/runs/validate-combat-action-economy-report.md`; verdrahtet im Test Gate als `checkCombatActionEconomyValidation()`.
- Keine App-/UI-Änderung; keine Schema-/Migration; kein neues Dependency.