# SagaDrive Travel / Chase / Vehicles Report (#29)

Deterministische Prüfung von §10.4 + §14.2 + §14.10 (E2). Kein RNG.

- Pflichtszenarien: 6/6
- Chase-Sackgassen: 0
- Cross-mode Distanzlogik identisch: true
- Findings: 0

## Findings
- 0 Findings: Distanzleiste ohne Sackgasse; Gleichstand=0 Shift; Reise-Fail-Forward; Maßstab/Schutz/Schwachstelle konsistent; kein Skill-Cherry-Pick.

## Bandbreiten (dokumentiert, kein Pass/Fail-Bound)

| Szenario | Runden bis Ende | Gleichstand-Anteil | Plausible Skills | Handling/Maßstab |
|---|---:|---:|---|---|
| S1-fussverfolgung | 3 | 33% | Athletik, Akrobatik, Überleben | n/a |
| S2-fahrzeug-urban | 4 | 25% | Fortbewegungsmittel, Wahrnehmung | pursuerHandling=2 > quarryHandling=0 |
| S3-reise-navigation | n/a | n/a | Überleben, Wahrnehmung | n/a |
| S4-fahrzeug-vs-fahrzeug | 3 | 0% | Fortbewegungsmittel | attackerHandling=1, targetHandling=0 |
| S5-person-vs-fahrzeug | n/a | n/a | Nahkampf, Fernkampf | n/a (person attacker) |
| S6-schwachstelle | n/a | n/a | Fernkampf, Handwerk | n/a |

## Szenarien

### S1-fussverfolgung — Fußverfolgung

- Start: Distanz 2; approach=sprint; skills=Athletik
- Notes: Gleichstand→0 Shift; Krit vs Fail→2; Ende eingeholt; Mount-Clone identische Distanzlogik
- Regelzustand danach: direct-conflict
- Chase: ended=caught, distance=0, rounds=3, ties=1
- Shifts: R1:tie/0; R2:pursuer/-1; R3:pursuer/-2

### S2-fahrzeug-urban — Fahrzeugverfolgung (urban)

- Start: Distanz 2; Urban Bike Handling 2 vs Cargo Van Handling 0
- Notes: Fortbewegungsmittel+Handling; Gleichstand; urban drive approach
- Regelzustand danach: direct-conflict
- Chase: ended=caught, distance=0, rounds=4, ties=1
- Shifts: R1:quarry/1; R2:tie/0; R3:pursuer/-2; R4:pursuer/-1

### S3-reise-navigation — Längere Reise mit Navigationsfehler

- Start: hours=6, supplies=3, position=trail-fork
- Notes: Fail→time-loss; next=adapt-route; crit→bad-position
- Regelzustand danach: chase-ready
- Reise-Fail: type=time-loss, hours=10, next=adapt-route, retry=false

### S4-fahrzeug-vs-fahrzeug — Fahrzeug gegen Fahrzeug

- Start: Interceptor Maßstab 1 vs Armored Courier Maßstab 1
- Notes: Strukturtreffer applied=7 (Schutz/Dr); Chase escape rounds=3
- Regelzustand danach: travel-resume
- Chase: ended=escaped, distance=5, rounds=3, ties=0
- Shifts: R1:quarry/1; R2:quarry/1; R3:quarry/2
- Struktur: applied=7, halved=false, impossible=false, gap=0

### S5-person-vs-fahrzeug — Person gegen Fahrzeug ohne Anti-Fahrzeug-Wirkung

- Start: Person Maßstab 0 vs Patrol Car Maßstab 1, raw 8, Schutz 3
- Notes: halved=true, applied=2; structure-gap2 impossible=true
- Regelzustand danach: direct-conflict-ineffective-structure
- Struktur: applied=2, halved=true, impossible=false, gap=1

### S6-schwachstelle — Definierte Schwachstelle

- Start: Person vs Patrol Car; trait=exposed-radiator; raw 8
- Notes: weak applied=5 vs no-exception=2; structure-with-weak=8
- Regelzustand danach: direct-conflict-effective-structure
- Schwachstelle applied=5 vs ohne=2; gap2+weak applied=8

## Cross-Mode Distanzlogik

- Foot distance=0/caught; Mount=0/caught; Vehicle=0/caught
- Identisch: true

## Harte K.o.-Kriterien

- Chase-Sackgassen: 0
- Gleichstand verändert Distanz: 0 (asserted in S1/S2)
- ≥2 Maßstabsstufen ohne Ausnahme → 0 Strukturschaden (S5)
- Reise-Fail nie Wiederholungswurf (S3)
- Kein Skill-Cherry-Pick (S1 unjustified Fernkampf rejected)
