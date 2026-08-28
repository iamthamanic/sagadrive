# Composition Gate — damage-healing-dying

- HEAD_SHA: 1d8a026900c7c8d2ae8c85408760d3cbf63b0598
- BASE_SHA: 6ec7b1d96287f601c40a4f5f98a4c392beb05d2e
- Date: 2026-08-28
- Verdict: CLEAR

## Event
Ein Entwickler führt den Test Gate bzw. `node scripts/validate-damage-healing-dying.mjs` aus; die Engine berechnet exakte Schadens-/Sterbe-/Heilungskurven über die C2-Pflichtmatrix und schreibt den Report nach `.qa/runs/validate-damage-healing-dying-report.md`.

## Hop chain
`docs/sagadrive core rules.md` §8/§16.4 kodieren Schadens-, Schutz-, Sterbe- und Erholungsregeln → `scripts/lib/core-probe.mjs` liefert die geteilte Kernprobe (Grade-Auflösung identisch zu #19/#22) → `scripts/validate-damage-healing-dying.mjs` faltet die Schadenswürfel exakt (§8.1/§8.2), leitet Schutz-/Durchdringungs-Effekte ab (§8.3), modelliert die Dying-State-Machine (§8.5), massiven Schaden (§8.6), Erholungspfade (§8.8) und Härtegrade (§16.4) → Konsistenz-Assertions (Krit > Normal-Ø, Schutz monotone Schadensminderung, Durchdringung strikt hilfreich, Heroisch ≤ Standard ≤ Hart tödlich) → Report-Artefakt → `scripts/test-gate.mjs` (`checkDamageHealingDyingValidation()`).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Test Gate (CI) und lokale Läufe parallel; drei Validierungs-Engines teilen sich die Kernprobe. | Reine Funktionen über konstanten Regel-Tabellen; die geteilte `core-probe.mjs` ist read-only; Report deterministisch identisch pro HEAD (byteidentisch bei Concurrent Writes). | pass |
| Invalid/missing | Regelwidrige Konstellationen dürfen nicht still korrigiert werden: Krit verdoppelt nie feste Boni (§8.2); medizinische Versorgung ersetzt Verschnaufpause-Heilung, addiert sie nicht (§8.8); Heroisch startet stabil bei 0 (§16.4). | Assertions verifizieren Krit-Ø > Normal-Ø, medizinische Heilung > Erholungswert, Heroisch = 0 % Todeswahrscheinlichkeit über Todeswürfe; Verstoß → Finding + Exit 1. | pass |
| Two consumers / crash | Zwei Konsumenten (CI, Report-Leser) dürfen Kurven nicht unterschiedlich interpretieren. | Single Source of Truth: geteilte Kernprobe; Schadens-/Sterbemodell nur in dieser Engine; abgeleiteter Report, Write erst nach vollständigem Lauf. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| modeling: Heroisch | flag | Engine → Assertions | Erste Version startete die Dying-Track-Simulation für alle Härtegrade gleich; §16.4 Heroisch definiert aber stabil bei 0 (kein Todeswurf-Zyklus). | done: Heroisch modelliert als stabil bei 0 (0 % Todeswahrscheinlichkeit; Sterbend nur via Krit-Treffer oder ausdrücklich tödlicher Gefahr); Assertion verifiziert. |
| modeling: Massive-Damage-Scope | flag | Engine → Assertions | Der Massive-Damage-Block referenzierte eine Krit-Verteilung außerhalb seines Scopes (ReferenceError). | done: Extrem-Klassen-Krit-Verteilung explizit im Block berechnet. |

## Skip reason
n/a

## Notes
- Kein Service-, Backend- oder Persistenz-Hop: Engine liest nur kodiert Regelkonstanten und schreibt ausschließlich `.qa/runs/`.
- 720 Szenario-Reihen: 5 Schadensklassen × Schutz {0,1,2,3,5} × Durchdringung {0,1,2} × 3 Bänder (Novize/Experte/Legende) × 3 Ausdauerprofile (1/3/5).
- Härtegrad-Kurven: Todeswahrscheinlichkeit über Todeswürfe bei mittlerer Ausdauer — Novize: Heroisch 0 % / Standard 19,25 % / Hart 47,50 %; Legende: 0 % / 7,10 % / 21,04 % — klar unterschiedene, spielbare Profile ohne Regelwiderspruch.