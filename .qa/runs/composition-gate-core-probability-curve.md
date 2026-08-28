# Composition Gate — core-probability-curve

- HEAD_SHA: 1e1c056f7337248b1bcc64ffad9b5773e099e87c
- BASE_SHA: 8c1fe476ef9201f499561b8b2d754538c7692266
- Date: 2026-08-28
- Verdict: CLEAR

## Event
Ein Entwickler führt den Test Gate bzw. `node scripts/validate-core-probability.mjs` aus; die Engine berechnet die exakte Wahrscheinlichkeitsmatrix der SagaDrive-Kernprobe und schreibt den Report nach `.qa/runs/validate-core-probability-report.md`.

## Hop chain
`docs/sagadrive core rules.md` §2/§3/§5/§2.7 kodieren die Regelkonstanten → `scripts/validate-core-probability.mjs` modelliert die Kernprobe deterministisch (Grade inkl. nat 1/20-Shift, Advantage/Disadvantage als 2d20 keep-high/low, Safety als deterministischer Wert, EB nur bei Training, Caps fail-closed) → Konsistenz-Assertions (Adv ≥ Normal ≥ Dis, ZW-Monotonie, exakte 100 %-Verteilungen, Safety zwischen nat-1 und nat-20) → Report-Artefakt `.qa/runs/validate-core-probability-report.md` → `scripts/test-gate.mjs` (`checkCoreProbabilityValidation()`) verdrahtet den Check als Regression-Schutz.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Test Gate (CI) und lokale Läufe können parallel dieselbe Engine ausführen, ohne sich zu stören. | Die Engine ist eine reine Funktion über konstanten Regel-Tabellen; kein globaler State, keine Queues. Der Report ist deterministisch identisch pro HEAD; Concurrent Writes erzeugen byteidentische Dateien (last-writer-wins harmlos). | pass |
| Invalid/missing | Regelverletzungen dürfen nicht still korrigiert werden (§19.5: nur dokumentierte Befunde ändern Regeln). | `createProfile` schlägt fehl bei Skill > Cap, EB bei untrainiert, Spec ohne Training, Attr außerhalb 1–5, Spec ≠ 0/+2 — fail-closed statt stiller Korrektur. Unerwartete Throws landen als Findings und beenden den Lauf mit Exit 1. | pass |
| Two consumers / crash | Zwei Konsumenten (CI-Gate, lokaler Report-Leser) dürfen die Matrix nicht unterschiedlich interpretieren. | Single Source of Truth: die Engine selbst. Der Report ist ein abgeleitetes, deterministisches Artefakt; kein Consumer mutiert Regelwerte. Ein Crash mid-run hinterlässt den vorherigen Report unverändert (Write erst nach vollständigem Lauf). | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| modeling: §2.4-Safety-Garantie | flag | Engine → Assertions | Eine erste Assertion verlangte „Safety ≥ Median des normalen Wurfs". §2.4 garantiert das nicht — Safety ist ein deterministischer Wert, kein Erfolgsversprechen. | done: korrekte Invariante implementiert (Safety schlägt das §2.2-degradierte nat-1-Ergebnis und wird vom nat-20-Ergebnis nicht geschlagen); falsche Median-Assertion entfernt, 0 Findings. |

## Skip reason
n/a

## Notes
- Kein neuer Service-, Backend- oder Persistenz-Hop: Die Engine liest nur Regelkonstanten (im Script kodiert und gegen die Core Rules verifiziert) und schreibt ausschließlich `.qa/runs/`.
- Verifikation gegen §19.1: +5 vs ZW15 ergibt exakt 55 % / 79,75 % / 30,25 % (normal/Vorteil/Nachteil) — Deckung mit den im Regelwerk dokumentierten Referenzwerten.
- 1862 Probe-Reihen über 266 Profile; alle vier Erfolgsgrade, alle Pflichtmodi (normal/Vorteil/Nachteil/Sicherheitswert), nat 1/20-Gradverschiebung modelliert.