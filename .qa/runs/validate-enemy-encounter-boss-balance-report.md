# SagaDrive Enemy, Encounter & Boss Balance Report (#24)

Seeded Monte-Carlo (400 runs per cell, fixed seed) over §15 encounter rules.

- Group sizes: 3/4/5/6
- Ranks: Novize–Legende (Band I–V)
- Compositions: boss / elite / standard / mixed
- Encounter rows: 315 + 10 boss scenarios
- Findings: 0

## Findings
Keine Budget-Sprengung durch Standard-Schwärme, kein Boss-Kollaps oder Boss-Eskalation; Budgetstufen klar getrennt.

## Encounter matrix (average party build)

| Rang | Spieler | Schwierigkeit | Komposition | Bedrohung | Budget | Runden Ø | Niederlagen | K.O.-Anteil | Rest-HP |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| Novize | 3 | Routine | elite | 2 | 3 | 2.3 | 0.0% | 0.00 | 89% |
| Novize | 3 | Routine | standard | 3 | 3 | 4.6 | 0.0% | 0.08 | 77% |
| Novize | 3 | Routine | mixed | 3 | 3 | 3.6 | 0.0% | 0.01 | 79% |
| Novize | 3 | Standard | boss | 4 | 6 | 3.4 | 0.0% | 0.03 | 74% |
| Novize | 3 | Standard | elite | 6 | 6 | 6.6 | 31.3% | 0.49 | 28% |
| Novize | 3 | Standard | standard | 6 | 6 | 7.9 | 79.0% | 0.89 | 7% |
| Novize | 3 | Standard | mixed | 6 | 6 | 8.0 | 59.8% | 0.76 | 16% |
| Novize | 3 | Schwer | boss | 4 | 8 | 3.4 | 0.0% | 0.02 | 74% |
| Novize | 3 | Schwer | elite | 8 | 8 | 5.9 | 89.0% | 0.94 | 2% |
| Novize | 3 | Schwer | standard | 8 | 8 | 5.0 | 100.0% | 1.00 | 0% |
| Novize | 3 | Schwer | mixed | 8 | 8 | 5.3 | 98.5% | 0.99 | 0% |
| Novize | 3 | Extrem | boss | 4 | 9 | 3.4 | 0.0% | 0.02 | 74% |
| Novize | 3 | Extrem | elite | 8 | 9 | 6.0 | 89.0% | 0.94 | 2% |
| Novize | 3 | Extrem | standard | 9 | 9 | 4.3 | 100.0% | 1.00 | 0% |
| Novize | 3 | Extrem | mixed | 9 | 9 | 4.4 | 100.0% | 1.00 | 0% |
| Spezialist | 3 | Routine | elite | 2 | 3 | 2.7 | 0.0% | 0.00 | 83% |
| Spezialist | 3 | Routine | standard | 3 | 3 | 6.0 | 4.8% | 0.27 | 59% |
| Spezialist | 3 | Routine | mixed | 3 | 3 | 4.4 | 0.5% | 0.10 | 67% |
| Spezialist | 3 | Standard | boss | 4 | 6 | 4.3 | 3.3% | 0.16 | 55% |
| Spezialist | 3 | Standard | elite | 6 | 6 | 5.9 | 86.0% | 0.91 | 4% |
| Spezialist | 3 | Standard | standard | 6 | 6 | 5.4 | 98.5% | 0.99 | 0% |
| Spezialist | 3 | Standard | mixed | 6 | 6 | 6.1 | 93.8% | 0.98 | 1% |
| Spezialist | 3 | Schwer | boss | 4 | 8 | 4.4 | 3.0% | 0.16 | 55% |
| Spezialist | 3 | Schwer | elite | 8 | 8 | 3.9 | 100.0% | 1.00 | 0% |
| Spezialist | 3 | Schwer | standard | 8 | 8 | 3.7 | 100.0% | 1.00 | 0% |
| Spezialist | 3 | Schwer | mixed | 8 | 8 | 3.8 | 100.0% | 1.00 | 0% |
| Spezialist | 3 | Extrem | boss | 4 | 9 | 4.3 | 3.3% | 0.16 | 55% |
| Spezialist | 3 | Extrem | elite | 8 | 9 | 3.9 | 100.0% | 1.00 | 0% |
| Spezialist | 3 | Extrem | standard | 9 | 9 | 3.2 | 100.0% | 1.00 | 0% |
| Spezialist | 3 | Extrem | mixed | 9 | 9 | 3.2 | 100.0% | 1.00 | 0% |
| Experte | 3 | Routine | elite | 2 | 3 | 2.9 | 0.0% | 0.01 | 81% |
| Experte | 3 | Routine | standard | 3 | 3 | 6.7 | 6.3% | 0.33 | 52% |
| Experte | 3 | Routine | mixed | 3 | 3 | 4.7 | 0.8% | 0.11 | 65% |
| Experte | 3 | Standard | boss | 4 | 6 | 4.7 | 4.5% | 0.19 | 53% |
| Experte | 3 | Standard | elite | 6 | 6 | 5.7 | 90.3% | 0.94 | 2% |
| Experte | 3 | Standard | standard | 6 | 6 | 4.8 | 99.5% | 1.00 | 0% |
| Experte | 3 | Standard | mixed | 6 | 6 | 5.2 | 98.5% | 0.99 | 0% |
| Experte | 3 | Schwer | boss | 4 | 8 | 4.7 | 5.5% | 0.20 | 52% |
| Experte | 3 | Schwer | elite | 8 | 8 | 3.9 | 100.0% | 1.00 | 0% |
| Experte | 3 | Schwer | standard | 8 | 8 | 3.4 | 100.0% | 1.00 | 0% |
| Experte | 3 | Schwer | mixed | 8 | 8 | 3.4 | 100.0% | 1.00 | 0% |
| Experte | 3 | Extrem | boss | 4 | 9 | 4.7 | 6.0% | 0.20 | 52% |
| Experte | 3 | Extrem | elite | 8 | 9 | 3.9 | 100.0% | 1.00 | 0% |
| Experte | 3 | Extrem | standard | 9 | 9 | 3.0 | 100.0% | 1.00 | 0% |
| Experte | 3 | Extrem | mixed | 9 | 9 | 3.1 | 100.0% | 1.00 | 0% |
| Meister | 3 | Routine | elite | 2 | 3 | 3.4 | 0.8% | 0.04 | 72% |
| Meister | 3 | Routine | standard | 3 | 3 | 7.7 | 39.5% | 0.64 | 26% |
| Meister | 3 | Routine | mixed | 3 | 3 | 6.1 | 10.5% | 0.33 | 44% |
| Meister | 3 | Standard | boss | 4 | 6 | 5.8 | 18.8% | 0.41 | 34% |
| Meister | 3 | Standard | elite | 6 | 6 | 4.6 | 98.8% | 0.99 | 0% |
| Meister | 3 | Standard | standard | 6 | 6 | 3.8 | 100.0% | 1.00 | 0% |
| Meister | 3 | Standard | mixed | 6 | 6 | 3.9 | 99.8% | 1.00 | 0% |
| Meister | 3 | Schwer | boss | 4 | 8 | 5.8 | 19.3% | 0.41 | 34% |
| Meister | 3 | Schwer | elite | 8 | 8 | 3.3 | 100.0% | 1.00 | 0% |
| Meister | 3 | Schwer | standard | 8 | 8 | 2.8 | 100.0% | 1.00 | 0% |
| Meister | 3 | Schwer | mixed | 8 | 8 | 2.9 | 100.0% | 1.00 | 0% |
| Meister | 3 | Extrem | boss | 4 | 9 | 5.8 | 19.8% | 0.42 | 34% |
| Meister | 3 | Extrem | elite | 8 | 9 | 3.3 | 100.0% | 1.00 | 0% |
| Meister | 3 | Extrem | standard | 9 | 9 | 2.5 | 100.0% | 1.00 | 0% |
| Meister | 3 | Extrem | mixed | 9 | 9 | 2.5 | 100.0% | 1.00 | 0% |
| Legende | 3 | Routine | elite | 2 | 3 | 4.2 | 5.0% | 0.16 | 56% |
| Legende | 3 | Routine | standard | 3 | 3 | 7.5 | 75.8% | 0.87 | 8% |
| Legende | 3 | Routine | mixed | 3 | 3 | 6.8 | 52.3% | 0.67 | 18% |
| Legende | 3 | Standard | boss | 4 | 6 | 6.4 | 68.0% | 0.81 | 9% |
| Legende | 3 | Standard | elite | 6 | 6 | 3.4 | 100.0% | 1.00 | 0% |
| Legende | 3 | Standard | standard | 6 | 6 | 3.2 | 100.0% | 1.00 | 0% |
| Legende | 3 | Standard | mixed | 6 | 6 | 3.2 | 100.0% | 1.00 | 0% |
| Legende | 3 | Schwer | boss | 4 | 8 | 6.4 | 67.8% | 0.81 | 9% |
| Legende | 3 | Schwer | elite | 8 | 8 | 2.6 | 100.0% | 1.00 | 0% |
| Legende | 3 | Schwer | standard | 8 | 8 | 2.5 | 100.0% | 1.00 | 0% |
| Legende | 3 | Schwer | mixed | 8 | 8 | 2.5 | 100.0% | 1.00 | 0% |
| Legende | 3 | Extrem | boss | 4 | 9 | 6.4 | 67.5% | 0.81 | 9% |
| Legende | 3 | Extrem | elite | 8 | 9 | 2.6 | 100.0% | 1.00 | 0% |
| Legende | 3 | Extrem | standard | 9 | 9 | 2.2 | 100.0% | 1.00 | 0% |
| Legende | 3 | Extrem | mixed | 9 | 9 | 2.3 | 100.0% | 1.00 | 0% |
| Novize | 4 | Routine | boss | 4 | 4 | 2.6 | 0.0% | 0.00 | 86% |
| Novize | 4 | Routine | elite | 4 | 4 | 3.3 | 0.0% | 0.01 | 81% |
| Novize | 4 | Routine | standard | 4 | 4 | 4.7 | 0.0% | 0.10 | 79% |
| Novize | 4 | Routine | mixed | 4 | 4 | 3.9 | 0.0% | 0.04 | 82% |
| Novize | 4 | Standard | boss | 4 | 8 | 2.6 | 0.0% | 0.00 | 85% |
| Novize | 4 | Standard | elite | 8 | 8 | 7.5 | 26.0% | 0.53 | 28% |
| Novize | 4 | Standard | standard | 8 | 8 | 8.4 | 83.5% | 0.93 | 5% |
| Novize | 4 | Standard | mixed | 8 | 8 | 8.8 | 65.8% | 0.84 | 11% |
| Novize | 4 | Schwer | boss | 4 | 10 | 2.6 | 0.0% | 0.01 | 86% |
| Novize | 4 | Schwer | elite | 10 | 10 | 6.7 | 89.0% | 0.95 | 2% |
| Novize | 4 | Schwer | standard | 10 | 10 | 5.6 | 99.8% | 1.00 | 0% |
| Novize | 4 | Schwer | mixed | 10 | 10 | 5.9 | 99.3% | 1.00 | 0% |
| Novize | 4 | Extrem | boss | 4 | 12 | 2.6 | 0.0% | 0.01 | 86% |
| Novize | 4 | Extrem | elite | 12 | 12 | 4.9 | 99.0% | 0.99 | 0% |
| Novize | 4 | Extrem | standard | 12 | 12 | 4.3 | 100.0% | 1.00 | 0% |
| Novize | 4 | Extrem | mixed | 12 | 12 | 4.4 | 100.0% | 1.00 | 0% |
| Spezialist | 4 | Routine | boss | 4 | 4 | 3.2 | 0.0% | 0.06 | 75% |
| Spezialist | 4 | Routine | elite | 4 | 4 | 4.1 | 0.5% | 0.09 | 68% |
| Spezialist | 4 | Routine | standard | 4 | 4 | 6.0 | 2.8% | 0.25 | 63% |
| Spezialist | 4 | Routine | mixed | 4 | 4 | 4.8 | 0.8% | 0.13 | 69% |
| Spezialist | 4 | Standard | boss | 4 | 8 | 3.2 | 0.0% | 0.05 | 76% |
| Spezialist | 4 | Standard | elite | 8 | 8 | 6.2 | 89.0% | 0.95 | 2% |
| Spezialist | 4 | Standard | standard | 8 | 8 | 5.4 | 99.3% | 1.00 | 0% |
| Spezialist | 4 | Standard | mixed | 8 | 8 | 5.7 | 98.0% | 0.99 | 1% |
| Spezialist | 4 | Schwer | boss | 4 | 10 | 3.2 | 0.0% | 0.05 | 76% |
| Spezialist | 4 | Schwer | elite | 10 | 10 | 4.4 | 99.8% | 1.00 | 0% |
| Spezialist | 4 | Schwer | standard | 10 | 10 | 4.0 | 100.0% | 1.00 | 0% |
| Spezialist | 4 | Schwer | mixed | 10 | 10 | 4.1 | 100.0% | 1.00 | 0% |
| Spezialist | 4 | Extrem | boss | 4 | 12 | 3.2 | 0.0% | 0.05 | 76% |
| Spezialist | 4 | Extrem | elite | 12 | 12 | 3.5 | 100.0% | 1.00 | 0% |
| Spezialist | 4 | Extrem | standard | 12 | 12 | 3.3 | 100.0% | 1.00 | 0% |
| Spezialist | 4 | Extrem | mixed | 12 | 12 | 3.3 | 100.0% | 1.00 | 0% |
| Experte | 4 | Routine | boss | 4 | 4 | 3.5 | 0.0% | 0.05 | 74% |
| Experte | 4 | Routine | elite | 4 | 4 | 4.4 | 0.8% | 0.13 | 65% |
| Experte | 4 | Routine | standard | 4 | 4 | 7.0 | 6.3% | 0.36 | 53% |
| Experte | 4 | Routine | mixed | 4 | 4 | 5.5 | 1.5% | 0.22 | 62% |
| Experte | 4 | Standard | boss | 4 | 8 | 3.5 | 0.0% | 0.05 | 74% |
| Experte | 4 | Standard | elite | 8 | 8 | 6.2 | 93.3% | 0.97 | 2% |
| Experte | 4 | Standard | standard | 8 | 8 | 4.7 | 100.0% | 1.00 | 0% |
| Experte | 4 | Standard | mixed | 8 | 8 | 5.0 | 99.3% | 1.00 | 0% |
| Experte | 4 | Schwer | boss | 4 | 10 | 3.5 | 0.0% | 0.05 | 74% |
| Experte | 4 | Schwer | elite | 10 | 10 | 4.2 | 100.0% | 1.00 | 0% |
| Experte | 4 | Schwer | standard | 10 | 10 | 3.6 | 100.0% | 1.00 | 0% |
| Experte | 4 | Schwer | mixed | 10 | 10 | 3.7 | 100.0% | 1.00 | 0% |
| Experte | 4 | Extrem | boss | 4 | 12 | 3.5 | 0.0% | 0.05 | 74% |
| Experte | 4 | Extrem | elite | 12 | 12 | 3.4 | 100.0% | 1.00 | 0% |
| Experte | 4 | Extrem | standard | 12 | 12 | 3.0 | 100.0% | 1.00 | 0% |
| Experte | 4 | Extrem | mixed | 12 | 12 | 3.1 | 100.0% | 1.00 | 0% |
| Meister | 4 | Routine | boss | 4 | 4 | 4.3 | 0.5% | 0.14 | 63% |
| Meister | 4 | Routine | elite | 4 | 4 | 5.7 | 5.8% | 0.27 | 50% |
| Meister | 4 | Routine | standard | 4 | 4 | 8.5 | 39.8% | 0.67 | 26% |
| Meister | 4 | Routine | mixed | 4 | 4 | 7.1 | 12.5% | 0.42 | 43% |
| Meister | 4 | Standard | boss | 4 | 8 | 4.3 | 0.8% | 0.15 | 63% |
| Meister | 4 | Standard | elite | 8 | 8 | 4.6 | 99.8% | 1.00 | 0% |
| Meister | 4 | Standard | standard | 8 | 8 | 3.8 | 100.0% | 1.00 | 0% |
| Meister | 4 | Standard | mixed | 8 | 8 | 3.9 | 100.0% | 1.00 | 0% |
| Meister | 4 | Schwer | boss | 4 | 10 | 4.3 | 0.8% | 0.14 | 63% |
| Meister | 4 | Schwer | elite | 10 | 10 | 3.5 | 100.0% | 1.00 | 0% |
| Meister | 4 | Schwer | standard | 10 | 10 | 3.1 | 100.0% | 1.00 | 0% |
| Meister | 4 | Schwer | mixed | 10 | 10 | 3.0 | 100.0% | 1.00 | 0% |
| Meister | 4 | Extrem | boss | 4 | 12 | 4.3 | 0.8% | 0.14 | 63% |
| Meister | 4 | Extrem | elite | 12 | 12 | 3.0 | 100.0% | 1.00 | 0% |
| Meister | 4 | Extrem | standard | 12 | 12 | 2.5 | 100.0% | 1.00 | 0% |
| Meister | 4 | Extrem | mixed | 12 | 12 | 2.5 | 100.0% | 1.00 | 0% |
| Legende | 4 | Routine | boss | 4 | 4 | 5.9 | 16.3% | 0.45 | 36% |
| Legende | 4 | Routine | elite | 4 | 4 | 7.0 | 47.5% | 0.69 | 19% |
| Legende | 4 | Routine | standard | 4 | 4 | 8.0 | 79.8% | 0.90 | 7% |
| Legende | 4 | Routine | mixed | 4 | 4 | 7.8 | 52.3% | 0.73 | 18% |
| Legende | 4 | Standard | boss | 4 | 8 | 5.9 | 16.5% | 0.46 | 36% |
| Legende | 4 | Standard | elite | 8 | 8 | 3.5 | 100.0% | 1.00 | 0% |
| Legende | 4 | Standard | standard | 8 | 8 | 3.3 | 100.0% | 1.00 | 0% |
| Legende | 4 | Standard | mixed | 8 | 8 | 3.3 | 100.0% | 1.00 | 0% |
| Legende | 4 | Schwer | boss | 4 | 10 | 5.8 | 16.8% | 0.46 | 36% |
| Legende | 4 | Schwer | elite | 10 | 10 | 2.8 | 100.0% | 1.00 | 0% |
| Legende | 4 | Schwer | standard | 10 | 10 | 2.6 | 100.0% | 1.00 | 0% |
| Legende | 4 | Schwer | mixed | 10 | 10 | 2.7 | 100.0% | 1.00 | 0% |
| Legende | 4 | Extrem | boss | 4 | 12 | 5.9 | 17.3% | 0.46 | 36% |
| Legende | 4 | Extrem | elite | 12 | 12 | 2.4 | 100.0% | 1.00 | 0% |
| Legende | 4 | Extrem | standard | 12 | 12 | 2.2 | 100.0% | 1.00 | 0% |
| Legende | 4 | Extrem | mixed | 12 | 12 | 2.3 | 100.0% | 1.00 | 0% |
| Novize | 5 | Routine | boss | 4 | 5 | 2.2 | 0.0% | 0.00 | 90% |
| Novize | 5 | Routine | elite | 4 | 5 | 2.7 | 0.0% | 0.00 | 88% |
| Novize | 5 | Routine | standard | 5 | 5 | 4.8 | 0.0% | 0.12 | 79% |
| Novize | 5 | Routine | mixed | 5 | 5 | 4.1 | 0.0% | 0.07 | 81% |
| Novize | 5 | Standard | boss | 4 | 10 | 2.2 | 0.0% | 0.00 | 90% |
| Novize | 5 | Standard | elite | 10 | 10 | 8.0 | 34.0% | 0.62 | 25% |
| Novize | 5 | Standard | standard | 10 | 10 | 8.5 | 89.3% | 0.96 | 3% |
| Novize | 5 | Standard | mixed | 10 | 10 | 9.1 | 77.3% | 0.90 | 7% |
| Novize | 5 | Schwer | boss | 4 | 13 | 2.3 | 0.0% | 0.00 | 90% |
| Novize | 5 | Schwer | elite | 12 | 13 | 7.5 | 84.8% | 0.93 | 4% |
| Novize | 5 | Schwer | standard | 13 | 13 | 5.2 | 100.0% | 1.00 | 0% |
| Novize | 5 | Schwer | mixed | 13 | 13 | 5.5 | 100.0% | 1.00 | 0% |
| Novize | 5 | Extrem | boss | 4 | 15 | 2.3 | 0.0% | 0.00 | 90% |
| Novize | 5 | Extrem | elite | 14 | 15 | 5.5 | 98.5% | 0.99 | 0% |
| Novize | 5 | Extrem | standard | 15 | 15 | 4.3 | 100.0% | 1.00 | 0% |
| Novize | 5 | Extrem | mixed | 15 | 15 | 4.5 | 100.0% | 1.00 | 0% |
| Spezialist | 5 | Routine | boss | 4 | 5 | 2.7 | 0.0% | 0.02 | 84% |
| Spezialist | 5 | Routine | elite | 4 | 5 | 3.3 | 0.0% | 0.04 | 80% |
| Spezialist | 5 | Routine | standard | 5 | 5 | 6.3 | 2.3% | 0.28 | 63% |
| Spezialist | 5 | Routine | mixed | 5 | 5 | 5.3 | 1.3% | 0.19 | 69% |
| Spezialist | 5 | Standard | boss | 4 | 10 | 2.7 | 0.0% | 0.02 | 84% |
| Spezialist | 5 | Standard | elite | 10 | 10 | 6.3 | 93.5% | 0.97 | 1% |
| Spezialist | 5 | Standard | standard | 10 | 10 | 5.5 | 100.0% | 1.00 | 0% |
| Spezialist | 5 | Standard | mixed | 10 | 10 | 5.9 | 99.8% | 1.00 | 0% |
| Spezialist | 5 | Schwer | boss | 4 | 13 | 2.7 | 0.0% | 0.02 | 84% |
| Spezialist | 5 | Schwer | elite | 12 | 13 | 4.7 | 100.0% | 1.00 | 0% |
| Spezialist | 5 | Schwer | standard | 13 | 13 | 3.8 | 100.0% | 1.00 | 0% |
| Spezialist | 5 | Schwer | mixed | 13 | 13 | 3.9 | 100.0% | 1.00 | 0% |
| Spezialist | 5 | Extrem | boss | 4 | 15 | 2.7 | 0.0% | 0.02 | 84% |
| Spezialist | 5 | Extrem | elite | 14 | 15 | 3.8 | 100.0% | 1.00 | 0% |
| Spezialist | 5 | Extrem | standard | 15 | 15 | 3.3 | 100.0% | 1.00 | 0% |
| Spezialist | 5 | Extrem | mixed | 15 | 15 | 3.3 | 100.0% | 1.00 | 0% |
| Experte | 5 | Routine | boss | 4 | 5 | 2.8 | 0.0% | 0.02 | 83% |
| Experte | 5 | Routine | elite | 4 | 5 | 3.5 | 0.0% | 0.04 | 79% |
| Experte | 5 | Routine | standard | 5 | 5 | 7.1 | 6.3% | 0.36 | 55% |
| Experte | 5 | Routine | mixed | 5 | 5 | 5.8 | 0.5% | 0.23 | 64% |
| Experte | 5 | Standard | boss | 4 | 10 | 2.8 | 0.0% | 0.02 | 83% |
| Experte | 5 | Standard | elite | 10 | 10 | 6.1 | 94.8% | 0.98 | 1% |
| Experte | 5 | Standard | standard | 10 | 10 | 4.8 | 100.0% | 1.00 | 0% |
| Experte | 5 | Standard | mixed | 10 | 10 | 5.0 | 100.0% | 1.00 | 0% |
| Experte | 5 | Schwer | boss | 4 | 13 | 2.8 | 0.0% | 0.02 | 83% |
| Experte | 5 | Schwer | elite | 12 | 13 | 4.5 | 100.0% | 1.00 | 0% |
| Experte | 5 | Schwer | standard | 13 | 13 | 3.5 | 100.0% | 1.00 | 0% |
| Experte | 5 | Schwer | mixed | 13 | 13 | 3.6 | 100.0% | 1.00 | 0% |
| Experte | 5 | Extrem | boss | 4 | 15 | 2.8 | 0.0% | 0.02 | 83% |
| Experte | 5 | Extrem | elite | 14 | 15 | 3.8 | 100.0% | 1.00 | 0% |
| Experte | 5 | Extrem | standard | 15 | 15 | 3.1 | 100.0% | 1.00 | 0% |
| Experte | 5 | Extrem | mixed | 15 | 15 | 3.1 | 100.0% | 1.00 | 0% |
| Meister | 5 | Routine | boss | 4 | 5 | 3.4 | 0.0% | 0.06 | 76% |
| Meister | 5 | Routine | elite | 4 | 5 | 4.4 | 0.5% | 0.13 | 69% |
| Meister | 5 | Routine | standard | 5 | 5 | 9.0 | 41.0% | 0.69 | 26% |
| Meister | 5 | Routine | mixed | 5 | 5 | 7.8 | 17.3% | 0.49 | 40% |
| Meister | 5 | Standard | boss | 4 | 10 | 3.4 | 0.0% | 0.06 | 77% |
| Meister | 5 | Standard | elite | 10 | 10 | 4.7 | 99.5% | 1.00 | 0% |
| Meister | 5 | Standard | standard | 10 | 10 | 3.8 | 100.0% | 1.00 | 0% |
| Meister | 5 | Standard | mixed | 10 | 10 | 3.9 | 100.0% | 1.00 | 0% |
| Meister | 5 | Schwer | boss | 4 | 13 | 3.4 | 0.0% | 0.06 | 77% |
| Meister | 5 | Schwer | elite | 12 | 13 | 3.8 | 100.0% | 1.00 | 0% |
| Meister | 5 | Schwer | standard | 13 | 13 | 2.9 | 100.0% | 1.00 | 0% |
| Meister | 5 | Schwer | mixed | 13 | 13 | 3.0 | 100.0% | 1.00 | 0% |
| Meister | 5 | Extrem | boss | 4 | 15 | 3.4 | 0.0% | 0.06 | 77% |
| Meister | 5 | Extrem | elite | 14 | 15 | 3.2 | 100.0% | 1.00 | 0% |
| Meister | 5 | Extrem | standard | 15 | 15 | 2.5 | 100.0% | 1.00 | 0% |
| Meister | 5 | Extrem | mixed | 15 | 15 | 2.6 | 100.0% | 1.00 | 0% |
| Legende | 5 | Routine | boss | 4 | 5 | 4.4 | 1.5% | 0.23 | 60% |
| Legende | 5 | Routine | elite | 4 | 5 | 6.0 | 9.0% | 0.37 | 46% |
| Legende | 5 | Routine | standard | 5 | 5 | 8.3 | 81.5% | 0.92 | 6% |
| Legende | 5 | Routine | mixed | 5 | 5 | 8.4 | 57.8% | 0.79 | 15% |
| Legende | 5 | Standard | boss | 4 | 10 | 4.5 | 1.3% | 0.23 | 60% |
| Legende | 5 | Standard | elite | 10 | 10 | 3.5 | 100.0% | 1.00 | 0% |
| Legende | 5 | Standard | standard | 10 | 10 | 3.3 | 100.0% | 1.00 | 0% |
| Legende | 5 | Standard | mixed | 10 | 10 | 3.3 | 100.0% | 1.00 | 0% |
| Legende | 5 | Schwer | boss | 4 | 13 | 4.5 | 1.3% | 0.24 | 59% |
| Legende | 5 | Schwer | elite | 12 | 13 | 3.0 | 100.0% | 1.00 | 0% |
| Legende | 5 | Schwer | standard | 13 | 13 | 2.6 | 100.0% | 1.00 | 0% |
| Legende | 5 | Schwer | mixed | 13 | 13 | 2.5 | 100.0% | 1.00 | 0% |
| Legende | 5 | Extrem | boss | 4 | 15 | 4.5 | 1.3% | 0.24 | 59% |
| Legende | 5 | Extrem | elite | 14 | 15 | 2.5 | 100.0% | 1.00 | 0% |
| Legende | 5 | Extrem | standard | 15 | 15 | 2.2 | 100.0% | 1.00 | 0% |
| Legende | 5 | Extrem | mixed | 15 | 15 | 2.2 | 100.0% | 1.00 | 0% |
| Novize | 6 | Routine | boss | 4 | 6 | 2.0 | 0.0% | 0.00 | 93% |
| Novize | 6 | Routine | elite | 6 | 6 | 3.3 | 0.0% | 0.02 | 83% |
| Novize | 6 | Routine | standard | 6 | 6 | 4.8 | 0.0% | 0.12 | 80% |
| Novize | 6 | Routine | mixed | 6 | 6 | 4.2 | 0.0% | 0.08 | 83% |
| Novize | 6 | Standard | boss | 4 | 12 | 2.0 | 0.0% | 0.00 | 93% |
| Novize | 6 | Standard | elite | 12 | 12 | 8.5 | 34.8% | 0.67 | 23% |
| Novize | 6 | Standard | standard | 12 | 12 | 8.5 | 88.8% | 0.96 | 3% |
| Novize | 6 | Standard | mixed | 12 | 12 | 9.4 | 80.8% | 0.93 | 6% |
| Novize | 6 | Schwer | boss | 4 | 15 | 2.0 | 0.0% | 0.00 | 93% |
| Novize | 6 | Schwer | elite | 14 | 15 | 8.1 | 80.8% | 0.92 | 4% |
| Novize | 6 | Schwer | standard | 15 | 15 | 5.5 | 100.0% | 1.00 | 0% |
| Novize | 6 | Schwer | mixed | 15 | 15 | 5.8 | 99.8% | 1.00 | 0% |
| Novize | 6 | Extrem | boss | 4 | 18 | 1.9 | 0.0% | 0.00 | 93% |
| Novize | 6 | Extrem | elite | 18 | 18 | 4.9 | 100.0% | 1.00 | 0% |
| Novize | 6 | Extrem | standard | 18 | 18 | 4.3 | 100.0% | 1.00 | 0% |
| Novize | 6 | Extrem | mixed | 18 | 18 | 4.4 | 100.0% | 1.00 | 0% |
| Spezialist | 6 | Routine | boss | 4 | 6 | 2.3 | 0.0% | 0.01 | 89% |
| Spezialist | 6 | Routine | elite | 6 | 6 | 4.2 | 0.0% | 0.13 | 71% |
| Spezialist | 6 | Routine | standard | 6 | 6 | 6.4 | 1.8% | 0.29 | 64% |
| Spezialist | 6 | Routine | mixed | 6 | 6 | 5.5 | 0.8% | 0.21 | 70% |
| Spezialist | 6 | Standard | boss | 4 | 12 | 2.3 | 0.0% | 0.01 | 88% |
| Spezialist | 6 | Standard | elite | 12 | 12 | 6.5 | 97.0% | 0.99 | 1% |
| Spezialist | 6 | Standard | standard | 12 | 12 | 5.4 | 100.0% | 1.00 | 0% |
| Spezialist | 6 | Standard | mixed | 12 | 12 | 5.7 | 100.0% | 1.00 | 0% |
| Spezialist | 6 | Schwer | boss | 4 | 15 | 2.3 | 0.0% | 0.01 | 88% |
| Spezialist | 6 | Schwer | elite | 14 | 15 | 4.9 | 99.8% | 1.00 | 0% |
| Spezialist | 6 | Schwer | standard | 15 | 15 | 4.0 | 100.0% | 1.00 | 0% |
| Spezialist | 6 | Schwer | mixed | 15 | 15 | 4.1 | 100.0% | 1.00 | 0% |
| Spezialist | 6 | Extrem | boss | 4 | 18 | 2.3 | 0.0% | 0.01 | 89% |
| Spezialist | 6 | Extrem | elite | 18 | 18 | 3.6 | 100.0% | 1.00 | 0% |
| Spezialist | 6 | Extrem | standard | 18 | 18 | 3.3 | 100.0% | 1.00 | 0% |
| Spezialist | 6 | Extrem | mixed | 18 | 18 | 3.3 | 100.0% | 1.00 | 0% |
| Experte | 6 | Routine | boss | 4 | 6 | 2.4 | 0.0% | 0.01 | 88% |
| Experte | 6 | Routine | elite | 6 | 6 | 4.5 | 0.0% | 0.16 | 69% |
| Experte | 6 | Routine | standard | 6 | 6 | 7.2 | 3.5% | 0.36 | 57% |
| Experte | 6 | Routine | mixed | 6 | 6 | 6.0 | 0.5% | 0.25 | 65% |
| Experte | 6 | Standard | boss | 4 | 12 | 2.4 | 0.0% | 0.01 | 88% |
| Experte | 6 | Standard | elite | 12 | 12 | 6.1 | 96.3% | 0.99 | 1% |
| Experte | 6 | Standard | standard | 12 | 12 | 4.8 | 100.0% | 1.00 | 0% |
| Experte | 6 | Standard | mixed | 12 | 12 | 5.0 | 100.0% | 1.00 | 0% |
| Experte | 6 | Schwer | boss | 4 | 15 | 2.4 | 0.0% | 0.01 | 88% |
| Experte | 6 | Schwer | elite | 14 | 15 | 4.7 | 100.0% | 1.00 | 0% |
| Experte | 6 | Schwer | standard | 15 | 15 | 3.7 | 100.0% | 1.00 | 0% |
| Experte | 6 | Schwer | mixed | 15 | 15 | 3.8 | 100.0% | 1.00 | 0% |
| Experte | 6 | Extrem | boss | 4 | 18 | 2.4 | 0.0% | 0.01 | 88% |
| Experte | 6 | Extrem | elite | 18 | 18 | 3.5 | 100.0% | 1.00 | 0% |
| Experte | 6 | Extrem | standard | 18 | 18 | 3.1 | 100.0% | 1.00 | 0% |
| Experte | 6 | Extrem | mixed | 18 | 18 | 3.1 | 100.0% | 1.00 | 0% |
| Meister | 6 | Routine | boss | 4 | 6 | 2.9 | 0.0% | 0.02 | 84% |
| Meister | 6 | Routine | elite | 6 | 6 | 5.9 | 1.5% | 0.30 | 56% |
| Meister | 6 | Routine | standard | 6 | 6 | 9.3 | 35.8% | 0.68 | 27% |
| Meister | 6 | Routine | mixed | 6 | 6 | 8.3 | 16.0% | 0.50 | 40% |
| Meister | 6 | Standard | boss | 4 | 12 | 2.9 | 0.0% | 0.02 | 84% |
| Meister | 6 | Standard | elite | 12 | 12 | 4.8 | 100.0% | 1.00 | 0% |
| Meister | 6 | Standard | standard | 12 | 12 | 3.8 | 100.0% | 1.00 | 0% |
| Meister | 6 | Standard | mixed | 12 | 12 | 4.0 | 100.0% | 1.00 | 0% |
| Meister | 6 | Schwer | boss | 4 | 15 | 2.9 | 0.0% | 0.02 | 84% |
| Meister | 6 | Schwer | elite | 14 | 15 | 3.9 | 100.0% | 1.00 | 0% |
| Meister | 6 | Schwer | standard | 15 | 15 | 3.0 | 100.0% | 1.00 | 0% |
| Meister | 6 | Schwer | mixed | 15 | 15 | 3.1 | 100.0% | 1.00 | 0% |
| Meister | 6 | Extrem | boss | 4 | 18 | 2.9 | 0.0% | 0.03 | 84% |
| Meister | 6 | Extrem | elite | 18 | 18 | 3.0 | 100.0% | 1.00 | 0% |
| Meister | 6 | Extrem | standard | 18 | 18 | 2.6 | 100.0% | 1.00 | 0% |
| Meister | 6 | Extrem | mixed | 18 | 18 | 2.6 | 100.0% | 1.00 | 0% |
| Legende | 6 | Routine | boss | 4 | 6 | 3.6 | 0.0% | 0.13 | 73% |
| Legende | 6 | Routine | elite | 6 | 6 | 7.9 | 44.5% | 0.72 | 20% |
| Legende | 6 | Routine | standard | 6 | 6 | 8.7 | 83.0% | 0.93 | 5% |
| Legende | 6 | Routine | mixed | 6 | 6 | 9.2 | 59.5% | 0.82 | 14% |
| Legende | 6 | Standard | boss | 4 | 12 | 3.6 | 0.0% | 0.13 | 73% |
| Legende | 6 | Standard | elite | 12 | 12 | 3.5 | 100.0% | 1.00 | 0% |
| Legende | 6 | Standard | standard | 12 | 12 | 3.3 | 100.0% | 1.00 | 0% |
| Legende | 6 | Standard | mixed | 12 | 12 | 3.3 | 100.0% | 1.00 | 0% |
| Legende | 6 | Schwer | boss | 4 | 15 | 3.6 | 0.0% | 0.13 | 73% |
| Legende | 6 | Schwer | elite | 14 | 15 | 3.0 | 100.0% | 1.00 | 0% |
| Legende | 6 | Schwer | standard | 15 | 15 | 2.7 | 100.0% | 1.00 | 0% |
| Legende | 6 | Schwer | mixed | 15 | 15 | 2.7 | 100.0% | 1.00 | 0% |
| Legende | 6 | Extrem | boss | 4 | 18 | 3.6 | 0.0% | 0.13 | 72% |
| Legende | 6 | Extrem | elite | 18 | 18 | 2.4 | 100.0% | 1.00 | 0% |
| Legende | 6 | Extrem | standard | 18 | 18 | 2.2 | 100.0% | 1.00 | 0% |
| Legende | 6 | Extrem | mixed | 18 | 18 | 2.2 | 100.0% | 1.00 | 0% |

## Boss scenarios

| Rang | Szenario | Runden Ø | Niederlagen | Anmerkung |
|---|---|---:|---:|---|
| Novize | Solo-Boss (Budget 4, 4 Spieler) | 2.7 | 0.0% | §15.4 Boss: HP ×2,5, 2 Impulse/Runde, kein Blanket-+1 Angriff/DEF. |
| Novize | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 8 BP (Standard 4 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |
| Spezialist | Solo-Boss (Budget 4, 4 Spieler) | 3.2 | 0.0% | §15.4 Boss: HP ×2,5, 2 Impulse/Runde, kein Blanket-+1 Angriff/DEF. |
| Spezialist | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 8 BP (Standard 4 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |
| Experte | Solo-Boss (Budget 4, 4 Spieler) | 3.4 | 0.0% | §15.4 Boss: HP ×2,5, 2 Impulse/Runde, kein Blanket-+1 Angriff/DEF. |
| Experte | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 8 BP (Standard 4 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |
| Meister | Solo-Boss (Budget 4, 4 Spieler) | 4.3 | 0.5% | §15.4 Boss: HP ×2,5, 2 Impulse/Runde, kein Blanket-+1 Angriff/DEF. |
| Meister | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 8 BP (Standard 4 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |
| Legende | Solo-Boss (Budget 4, 4 Spieler) | 5.8 | 20.8% | §15.4 Boss: HP ×2,5, 2 Impulse/Runde, kein Blanket-+1 Angriff/DEF. |
| Legende | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 8 BP (Standard 4 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |

## Notes
- Monte-Carlo mit fixiertem Seed (byte-reproduzierbar); dokumentiert als Simulation statt exakter Faltung (großer kombinierter Zustandsraum).
- Fokusfeuer: Party zielt auf den am stärksten beschädigten Gegner; Elite/Boss feuern Impulse nach Party-Zügen.
- Kampfrolle ändert nur HP und Impulse (§15.4); kein Blanket-+1 Angriff/DEF; kein Scherge/Minion.
- Budgets §15.5: Routine 1× / Standard 2× / Schwer 2,5× / Extrem 3× Spielerzahl; Band-Verschiebung ×2 (höher) bzw. ÷2 (niedriger).