# Composition Gate — combat-action-economy

- HEAD_SHA: e61259219aab81bd749d60b44b1bc33bf729fc9a
- BASE_SHA: 6ec7b1d
- Date: 2026-08-28
- Verdict: CLEAR

## Event
Ein Entwickler führt den Test Gate bzw. `node scripts/validate-combat-action-economy.mjs` aus; die Engine durchspielt die elf C1-Pflichtszenarien deterministisch über die Testbänder I/III/V und schreibt den Report nach `.qa/runs/validate-combat-action-economy-report.md`.

## Hop chain
`docs/sagadrive core rules.md` §6/§7/§9 kodieren Kampf- und Aktionsregeln → `scripts/lib/core-probe.mjs` liefert die geteilte Kernprobe (§2.2-Grade, §2.5-Folding — eine Quelle der Wahrheit für #19 und #22) → `scripts/validate-combat-action-economy.mjs` leitet §6.2-Verteidigung und §6.5-Widerstände deterministisch ab, modelliert §7.3-Aktionsökonomie als State-Machine, §7.2-Überraschung, §7.5-Gelegenheitsangriffe (Lösen/erzwungene Bewegung/Teleport ausgenommen), §7.7-Deckung (Volldeckung fail-closed), §7.8-Reichweite → Konsistenz-Assertions (Reaction-Budgets, Bereithalten = Hauptaktion + Reaktion, Liegend-Modifikatoren, observer-relatives Verborgen) → Report-Artefakt → `scripts/test-gate.mjs` (`checkCombatActionEconomyValidation()`) verdrahtet den Check.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Test Gate (CI) und lokale Läufe können parallel dieselbe Engine ausführen. | Reine Funktionen über konstanten Regel-Tabellen; kein globaler State. Report ist deterministisch identisch pro HEAD; Concurrent Writes erzeugen byteidentische Dateien. | pass |
| Invalid/missing | Regelwidrige Konfigurationen dürfen nicht still korrigiert werden: Volldeckung ist kein Wurf mit Malus, sondern unmöglich (§7.7); Überraschte haben keine Reaktion (§7.2). | `attackSuccessShare` wirft bei `cover: 'full'` (fail-closed statt stiller Korrektur); Überraschungs-Turn ohne `reactionAvailable`; Assertions verifizieren beide Pfade. | pass |
| Two consumers / crash | Zwei Konsumenten (CI-Gate, Report-Leser) dürfen die Szenarien nicht unterschiedlich interpretieren. | Single Source of Truth: geteilte Kernprobe aus `scripts/lib/core-probe.mjs` — #19 und #22 lösen Grade identisch auf. Der Report ist abgeleitetes Artefakt; kein Consumer mutiert Regelwerte. Write erst nach vollständigem Lauf. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| modeling: Volldeckung | flag | Engine → Assertions | Erste Version berechnete Volldeckung als normalen Angriffswurf mit Share > 0 und assertete Share 0 — inkonsistent. | done: §7.7 fail-closed modelliert (Angriff gegen Volldeckung wirft statt zu würfeln); Assertion prüft das fail-closed Verhalten; 0 Findings. |
| extraction: geteilte Kernprobe | flag | #19-Engine → neue Lib → #22-Engine | Zwei parallele Grade-Auflösungen hätten driftende Kurven zwischen den Validatoren erzeugt (two-consumers-Fall). | done: `scripts/lib/core-probe.mjs` als eine Quelle der Wahrheit; #19-Engine refactored mit byteidentischem Ergebnis (1862 Reihen / 266 Profile unverändert). |

## Skip reason
n/a

## Notes
- Kein Service-, Backend- oder Persistenz-Hop: Engine liest nur kodiert Regelkonstanten und schreibt ausschließlich `.qa/runs/`.
- 10 Szenario-Blöcke decken alle 11 C1-Pflichtszenarien ab (Teil-/Volldeckung + Reichweite in einem Block), über Bänder Novize/Experte/Legende (Stufen 1/9/17) → 57 Probe-Reihen.
- Refactor-Verifikation: `validate-core-probability.mjs` liefert nach der Shared-Lib-Extraktion identische Ergebnisse (1862 Reihen / 266 Profile / 0 Findings).