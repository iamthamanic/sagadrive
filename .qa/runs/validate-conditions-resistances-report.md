# SagaDrive Conditions & Resistances Report (#33)

Deterministische Prüfung von §9 Zustände, §6.5 Widerstände, §2.5 Vorteil/Nachteil, §7.4/§8.5. Kein RNG.

- Core-Zustände einzeln (begin/refresh/end): 11/11
- Pflichtkombinationen: 7/7
- Widerstände geprüft: 4/4
- Lockout-Sackgassen: 0
- Findings: 0

## Findings
- 0 Findings: Stapelung=Refresh; d20Count≤1; Verborgen observer-relativ; Erschöpfung>3→Schaden; Lockouts=0; Timing konsistent.

## Harte Assertions

| ID | Titel | Pass |
|---|---|---|
| A-no-stack | Gleicher Zustand refresht Dauer, stapelt nicht | PASS |
| A-disadvantage-fold | N Nachteilsquellen → disadvantage, d20Count 1 | PASS |
| A-exhaustion-cap | Erschöpfung >3 → Schaden (Erholung), keine Stufe 4+ | PASS |
| A-no-dead-end | Kein dauerhafter Lockout ohne Counter | PASS |
| A-timing | Beginn / Refresh / Ende konsistent | PASS |

## Core-Zustände (einzeln)

| Zustand | Begin | Refresh | Ende | Counter |
|---|---|---|---|---|
| Liegend | ✓ | ✓ | ✓ | Aufstehen (halbe Bewegung) |
| Gegriffen | ✓ | ✓ | ✓ | Entkommen (Hauptaktion vs Manöverwiderstand) |
| Blind | ✓ | ✓ | ✓ | Zustand endet / Heilung / Gegenwirkung |
| Benommen | ✓ | ✓ | ✓ | Ende nächsten eigenen Zugs |
| Verängstigt | ✓ | ✓ | ✓ | Quelle entfernt / Zustand endet |
| Kampfunfähig | ✓ | ✓ | ✓ | Heilung über 0 HP / Stabilisierung |
| Bewusstlos | ✓ | ✓ | ✓ | Heilung / Erwachen |
| Erschöpfung | ✓ | ✓ | ✓ | Ruhe / Erholung reduziert Stufen |
| Verborgen | ✓ | ✓ | ✓ | Wahrnehmung / Angriff offenbart gegenüber Beobachter |
| Gestört | ✓ | ✓ | ✓ | Reparatur / Behebung |
| Deaktiviert | ✓ | ✓ | ✓ | Reparatur / Behebung |

## Pflichtkombinationen

| ID | Titel | Pass | Notes |
|---|---|---|---|
| C1-gegriffen-liegend | Gegriffen + Liegend | PASS | {"movement":0,"halfMoveStandCost":4.5,"counters":["Entkommen (Hauptaktion)","Aufstehen (halbe Bewegung)"],"deadEnd":false} |
| C2-blind-fernkampf | Blind + Fernkampf | PASS | {"attacksVsBlind":"advantage","sightDependent":"disadvantage"} |
| C3-benommen-bereithalten | Benommen + Bereithalten/Reaktion | PASS | {"canReactWhileDazed":false,"nextD20":"disadvantage"} |
| C4-verängstigt-bewegung | Verängstigt + Bewegung | PASS | {"voluntaryApproach":false,"movement":9,"vsSource":"disadvantage"} |
| C5-erschöpfung-1-3 | Erschöpfung 1–3 | PASS | {} |
| C6-bewusstlos-0hp | Bewusstlos bei 0 Gesundheit | PASS | {"zeroHpOnly":"Kampfunfähig","unconsciousImplies":["Kampfunfähig","Liegend","unaware"]} |
| C7-verborgen-multi | Verborgen gegenüber mehreren Beobachtern | PASS | {"hiddenFromA":true,"hiddenFromB":false,"model":"Set<observerId>"} |

## Erschöpfung 1–3 (Detail)

| Stufe | Bewegung | Körperlicher Nachteil | Keine Reaktionen | Erholung½ |
|---:|---:|---|---|---|
| 1 | 6 m | nein | nein | nein |
| 2 | 6 m | ja | nein | nein |
| 3 | 6 m | ja | ja | ja |

## Widerstände (§6.5)

| Widerstand | Wert (Sample) | Zustandsauslöser | OK |
|---|---:|---|---|
| Körper | 14 | Schubsen / körperliche Zustandsauslöser | ✓ |
| Reflex | 13 | Zu-Fall-Bringen → Liegend | ✓ |
| Geist | 13 | Verängstigt / mentale Effekte | ✓ |
| Manöver | 16 | Greifen → Gegriffen; Entkommen | ✓ |

Sample-Figur: Ausdauer 3, Geschick 2, Verstand 2, Stärke 3, Athletik 2, Akrobatik 1, EB 1.

## Vorteil/Nachteil-Folding (§2.5)

- Beispiel 4× Nachteil: mode=disadvantage, d20Count=1, dice=2
- Regel: verbleibende Quellen erhöhen die Würfelzahl nicht weiter.

## Harte K.o.-Kriterien

- Gleicher Zustand stapelt: 0 (nur Dauer-Refresh)
- Extra d20 aus mehreren Nachteilen: 0 (d20Count=1)
- Verborgen globales Boolean: 0
- Erschöpfung Stufe ≥4: 0 (Schaden=Erholung statt Stufe)
- Lockout-Sackgassen: 0
