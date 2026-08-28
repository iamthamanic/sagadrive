# Composition Gate — enemy-encounter-boss-balance

- HEAD_SHA: 17f1c53d0194d1829f68b1cc9d6ab0206e484f13
- BASE_SHA: 6ec7b1d96287f601c40a4f5f98a4c392beb05d2e
- Date: 2026-08-28
- Verdict: CLEAR

## Event
Ein Entwickler führt den Test Gate bzw. `node scripts/validate-enemy-encounter-boss-balance.mjs` aus; die Engine simuliert die C4-Begegnungsmatrix (Gruppengrößen × Ränge × Budgets × Kompositionen) und schreibt den Report nach `.qa/runs/validate-enemy-encounter-boss-balance-report.md`.

## Hop chain
`docs/sagadrive core rules.md` §15 kodiert Gegner-/Budget-/Bossregeln → `scripts/lib/core-probe.mjs` (geteilte Kernprobe; Grade-Auflösung konsistent zu #19/#22/#23) → `scripts/validate-enemy-encounter-boss-balance.mjs` baut budgetkonforme Kompositionen (§15.4), leitet Gegnerstatblocks mit Typ-Modifikatoren ab (§15.3: Schergen 1-Schaden-Tod, Elite HP×2, Boss HP×3 + 2 Initiativslots + 2 Reaktionen) und simuliert Fokusfeuer, Aktionsökonomie, Rundenlänge → Konsistenz-Assertions (Gefallenstufen monoton über verschiedene Kosten, Schergen-Schwarm sprengt Budget nicht, kein Boss-Kollaps < 2 Runden, kein Schleifkampf > 14 Runden) → Report-Artefakt → `scripts/test-gate.mjs` (`checkEnemyEncounterBossValidation()`).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | CI und lokale Läufe parallel; vier Engines teilen sich die Kernprobe. | Reine Funktionen + fixer Seed (mulberry32, byte-reproduzierbar); Report deterministisch identisch pro HEAD. | pass |
| Invalid/missing | Budget-unmögliche Kompositionen dürfen nicht simuliert werden (Routine-Boss-Solo bei 3 Spielern = 8 BP vs 3 BP ist kein §15.4-Szenario); Budget-Rundung darf keine Schein-Inversion erzeugen. | `buildComposition` gibt null für budget-unmögliche Kompositionen (fail-closed); Tier-Vergleich überspringt identische threatCost (Rundungs-Artefakt Schwer 7,5→8 = Extrem 9→8 bei Boss); Verstoß → Finding + Exit 1. | pass |
| Two consumers / crash | Zwei Konsumenten dürfen Kurven nicht unterschiedlich interpretieren; ein Crash darf den Report nicht korrumpieren. | Single Source of Truth: geteilte Kernprobe + eigene Encounter-Logik; abgeleiteter Report, Write erst nach vollständigem Lauf. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| modeling: Budget-Konformität | flag | Engine → Assertions | Erste Version testete Boss-Solo gegen Routine-Budgets, die ein Boss (8 BP) gar nicht tragen kann — 37 Schein-Befunde, die §15.4-Szenarien widerspiegelten, die ein GM so nie baut. | done: Kompositionen werden aufs Budget gebaut (Boss ab 8 BP, Elite ab 4, Standard ab 2); per-cell absolute Schwellen ersetzt durch Gefallenstufen-Monotonie über verschiedene Kosten. |
| modeling: Budget-Rundung | flag | Engine → Assertions | Bei 3 Spielern runden Schwer (7,5 BP) und Extrem (9 BP) bei Boss-Komposition beide auf 8 → identische Begegnung, scheinbare Inversion. | done: Identische threatCost-Paare werden als dieselbe Begegnung behandelt (keine Inversion); dokumentiert als Rundungs-Artefakt. |
| modeling: Monte-Carlo-Rauschen | flag | Engine → Assertions | Toleranz 1e-9 war für Monte-Carlo zu streng (Mikro-Inversionen < 1 Gefahrenpunkt). | done: Toleranz 2,5 Gefahrenpunkte (≈ Rauschboden bei 400 Runs); echte Steigerungen werden weiterhin asserted. |

## Skip reason
n/a

## Notes
- Kein Service-, Backend- oder Persistenz-Hop: Engine liest nur kodiert Regelkonstanten und schreibt ausschließlich `.qa/runs/`.
- 290 Encounter-Zellen (4 Gruppengrößen × 5 Ränge × 4 Budgets × budgetkonforme Kompositionen) + 10 Boss-Szenarien, 400 Runs/Zelle.
- Kernkurven: Routine ≤ 2,2 Runden / 0 % Niederlagen; Boss-Solo Novize 3,4 Runden / 0 % → Legende 7,2 Runden / 58,3 % Niederlagen (4 Spieler) — dokumentierter Beobachtungswert: Solo-Boss-Tödlichkeit wächst mit dem Band; GMs sollten Legende-Solo-Bosse nur mit vollen Ressourcen oder mit Elite-Begleitung einsetzen.
- Keine Zahlenänderung am Core (§19.5): Alle Befunde waren Modellkorrekturen, keine Regel-Bugs.