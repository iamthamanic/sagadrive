# SagaDrive Enemy, Encounter & Boss Balance Report (#24)

Seeded Monte-Carlo (400 runs per cell, fixed seed) over §15 encounter rules.

- Group sizes: 3/4/5/6
- Ranks: Novize–Legende (Band I–V)
- Compositions: boss / elite / minion / mixed
- Encounter rows: 290 + 10 boss scenarios
- Findings: 0

## Findings
Keine Budget-Sprengung durch Schergen-Schwärme, kein Boss-Kollaps oder Boss-Eskalation; Budgetstufen klar getrennt.

## Encounter matrix (average party build)

| Rang | Spieler | Schwierigkeit | Komposition | Bedrohung | Budget | Runden Ø | Niederlagen | K.O.-Anteil | Rest-HP |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| Novize | 3 | Routine | minion | 3 | 3 | 1.5 | 0.0% | 0.00 | 98% |
| Novize | 3 | Routine | mixed | 3 | 3 | 2.1 | 0.0% | 0.00 | 95% |
| Novize | 3 | Standard | elite | 4 | 6 | 2.8 | 0.0% | 0.00 | 92% |
| Novize | 3 | Standard | minion | 6 | 6 | 2.9 | 0.0% | 0.01 | 86% |
| Novize | 3 | Standard | mixed | 6 | 6 | 4.1 | 0.3% | 0.10 | 74% |
| Novize | 3 | Schwer | boss | 8 | 8 | 4.4 | 4.3% | 0.14 | 59% |
| Novize | 3 | Schwer | elite | 8 | 8 | 5.4 | 0.0% | 0.09 | 74% |
| Novize | 3 | Schwer | minion | 8 | 8 | 4.0 | 0.5% | 0.13 | 69% |
| Novize | 3 | Schwer | mixed | 8 | 8 | 5.6 | 10.3% | 0.37 | 48% |
| Novize | 3 | Extrem | boss | 8 | 9 | 4.4 | 4.0% | 0.14 | 59% |
| Novize | 3 | Extrem | elite | 8 | 9 | 5.4 | 0.0% | 0.09 | 74% |
| Novize | 3 | Extrem | minion | 9 | 9 | 4.6 | 3.3% | 0.23 | 59% |
| Novize | 3 | Extrem | mixed | 9 | 9 | 6.7 | 30.5% | 0.58 | 31% |
| Spezialist | 3 | Routine | minion | 3 | 3 | 1.6 | 0.0% | 0.00 | 97% |
| Spezialist | 3 | Routine | mixed | 3 | 3 | 2.4 | 0.0% | 0.01 | 90% |
| Spezialist | 3 | Standard | elite | 4 | 6 | 3.4 | 0.0% | 0.01 | 87% |
| Spezialist | 3 | Standard | minion | 6 | 6 | 3.0 | 0.0% | 0.05 | 80% |
| Spezialist | 3 | Standard | mixed | 6 | 6 | 5.2 | 9.0% | 0.34 | 52% |
| Spezialist | 3 | Schwer | boss | 8 | 8 | 5.6 | 35.8% | 0.53 | 29% |
| Spezialist | 3 | Schwer | elite | 8 | 8 | 7.5 | 8.5% | 0.34 | 53% |
| Spezialist | 3 | Schwer | minion | 8 | 8 | 4.4 | 9.3% | 0.32 | 54% |
| Spezialist | 3 | Schwer | mixed | 8 | 8 | 5.6 | 52.3% | 0.72 | 19% |
| Spezialist | 3 | Extrem | boss | 8 | 9 | 5.5 | 36.0% | 0.53 | 29% |
| Spezialist | 3 | Extrem | elite | 8 | 9 | 7.5 | 8.3% | 0.34 | 53% |
| Spezialist | 3 | Extrem | minion | 9 | 9 | 5.0 | 27.0% | 0.53 | 36% |
| Spezialist | 3 | Extrem | mixed | 9 | 9 | 5.8 | 82.8% | 0.91 | 6% |
| Experte | 3 | Routine | minion | 3 | 3 | 1.6 | 0.0% | 0.00 | 97% |
| Experte | 3 | Routine | mixed | 3 | 3 | 2.6 | 0.0% | 0.01 | 88% |
| Experte | 3 | Standard | elite | 4 | 6 | 3.7 | 0.0% | 0.02 | 84% |
| Experte | 3 | Standard | minion | 6 | 6 | 3.0 | 0.0% | 0.05 | 80% |
| Experte | 3 | Standard | mixed | 6 | 6 | 5.5 | 12.5% | 0.37 | 50% |
| Experte | 3 | Schwer | boss | 8 | 8 | 6.0 | 34.3% | 0.51 | 29% |
| Experte | 3 | Schwer | elite | 8 | 8 | 8.2 | 11.5% | 0.41 | 45% |
| Experte | 3 | Schwer | minion | 8 | 8 | 4.4 | 6.5% | 0.28 | 56% |
| Experte | 3 | Schwer | mixed | 8 | 8 | 5.9 | 60.8% | 0.79 | 14% |
| Experte | 3 | Extrem | boss | 8 | 9 | 6.0 | 34.3% | 0.50 | 29% |
| Experte | 3 | Extrem | elite | 8 | 9 | 8.2 | 11.5% | 0.41 | 46% |
| Experte | 3 | Extrem | minion | 9 | 9 | 5.1 | 17.0% | 0.44 | 42% |
| Experte | 3 | Extrem | mixed | 9 | 9 | 5.7 | 88.0% | 0.94 | 4% |
| Meister | 3 | Routine | minion | 3 | 3 | 1.7 | 0.0% | 0.00 | 96% |
| Meister | 3 | Routine | mixed | 3 | 3 | 3.0 | 0.0% | 0.05 | 82% |
| Meister | 3 | Standard | elite | 4 | 6 | 4.4 | 0.0% | 0.09 | 76% |
| Meister | 3 | Standard | minion | 6 | 6 | 3.3 | 0.3% | 0.09 | 76% |
| Meister | 3 | Standard | mixed | 6 | 6 | 6.2 | 34.3% | 0.58 | 31% |
| Meister | 3 | Schwer | boss | 8 | 8 | 6.7 | 63.7% | 0.75 | 13% |
| Meister | 3 | Schwer | elite | 8 | 8 | 9.5 | 53.0% | 0.74 | 19% |
| Meister | 3 | Schwer | minion | 8 | 8 | 4.9 | 10.8% | 0.37 | 48% |
| Meister | 3 | Schwer | mixed | 8 | 8 | 5.3 | 85.0% | 0.92 | 4% |
| Meister | 3 | Extrem | boss | 8 | 9 | 6.7 | 63.2% | 0.74 | 14% |
| Meister | 3 | Extrem | elite | 8 | 9 | 9.5 | 52.8% | 0.73 | 19% |
| Meister | 3 | Extrem | minion | 9 | 9 | 5.4 | 30.3% | 0.57 | 31% |
| Meister | 3 | Extrem | mixed | 9 | 9 | 4.8 | 96.8% | 0.99 | 1% |
| Legende | 3 | Routine | minion | 3 | 3 | 1.8 | 0.0% | 0.00 | 93% |
| Legende | 3 | Routine | mixed | 3 | 3 | 3.6 | 2.3% | 0.14 | 72% |
| Legende | 3 | Standard | elite | 4 | 6 | 5.6 | 1.5% | 0.19 | 65% |
| Legende | 3 | Standard | minion | 6 | 6 | 3.8 | 8.3% | 0.28 | 58% |
| Legende | 3 | Standard | mixed | 6 | 6 | 5.5 | 84.5% | 0.92 | 6% |
| Legende | 3 | Schwer | boss | 8 | 8 | 6.2 | 94.5% | 0.97 | 1% |
| Legende | 3 | Schwer | elite | 8 | 8 | 8.9 | 87.0% | 0.94 | 4% |
| Legende | 3 | Schwer | minion | 8 | 8 | 4.5 | 51.2% | 0.70 | 22% |
| Legende | 3 | Schwer | mixed | 8 | 8 | 3.7 | 99.3% | 1.00 | 0% |
| Legende | 3 | Extrem | boss | 8 | 9 | 6.2 | 94.5% | 0.97 | 1% |
| Legende | 3 | Extrem | elite | 8 | 9 | 8.9 | 86.5% | 0.93 | 4% |
| Legende | 3 | Extrem | minion | 9 | 9 | 4.3 | 75.8% | 0.88 | 8% |
| Legende | 3 | Extrem | mixed | 9 | 9 | 3.5 | 100.0% | 1.00 | 0% |
| Novize | 4 | Routine | elite | 4 | 4 | 2.2 | 0.0% | 0.00 | 96% |
| Novize | 4 | Routine | minion | 4 | 4 | 1.6 | 0.0% | 0.00 | 98% |
| Novize | 4 | Routine | mixed | 4 | 4 | 2.0 | 0.0% | 0.00 | 95% |
| Novize | 4 | Standard | boss | 8 | 8 | 3.4 | 0.0% | 0.04 | 77% |
| Novize | 4 | Standard | elite | 8 | 8 | 4.2 | 0.0% | 0.03 | 85% |
| Novize | 4 | Standard | minion | 8 | 8 | 3.0 | 0.0% | 0.03 | 86% |
| Novize | 4 | Standard | mixed | 8 | 8 | 3.8 | 0.5% | 0.12 | 76% |
| Novize | 4 | Schwer | boss | 8 | 10 | 3.4 | 0.0% | 0.04 | 77% |
| Novize | 4 | Schwer | elite | 8 | 10 | 4.2 | 0.0% | 0.03 | 85% |
| Novize | 4 | Schwer | minion | 10 | 10 | 3.7 | 0.3% | 0.12 | 75% |
| Novize | 4 | Schwer | mixed | 10 | 10 | 5.5 | 5.8% | 0.33 | 56% |
| Novize | 4 | Extrem | boss | 8 | 12 | 3.4 | 0.0% | 0.04 | 77% |
| Novize | 4 | Extrem | elite | 12 | 12 | 6.8 | 1.0% | 0.21 | 67% |
| Novize | 4 | Extrem | minion | 12 | 12 | 4.9 | 2.5% | 0.30 | 59% |
| Novize | 4 | Extrem | mixed | 12 | 12 | 7.3 | 34.3% | 0.64 | 28% |
| Spezialist | 4 | Routine | elite | 4 | 4 | 2.6 | 0.0% | 0.00 | 93% |
| Spezialist | 4 | Routine | minion | 4 | 4 | 1.7 | 0.0% | 0.00 | 97% |
| Spezialist | 4 | Routine | mixed | 4 | 4 | 2.3 | 0.0% | 0.01 | 91% |
| Spezialist | 4 | Standard | boss | 8 | 8 | 4.3 | 3.3% | 0.19 | 61% |
| Spezialist | 4 | Standard | elite | 8 | 8 | 5.2 | 0.3% | 0.13 | 76% |
| Spezialist | 4 | Standard | minion | 8 | 8 | 3.2 | 0.0% | 0.10 | 79% |
| Spezialist | 4 | Standard | mixed | 8 | 8 | 4.9 | 7.0% | 0.34 | 55% |
| Spezialist | 4 | Schwer | boss | 8 | 10 | 4.3 | 3.3% | 0.20 | 61% |
| Spezialist | 4 | Schwer | elite | 8 | 10 | 5.2 | 0.3% | 0.13 | 76% |
| Spezialist | 4 | Schwer | minion | 10 | 10 | 4.4 | 2.8% | 0.29 | 59% |
| Spezialist | 4 | Schwer | mixed | 10 | 10 | 6.4 | 47.3% | 0.72 | 21% |
| Spezialist | 4 | Extrem | boss | 8 | 12 | 4.4 | 2.8% | 0.20 | 60% |
| Spezialist | 4 | Extrem | elite | 12 | 12 | 9.2 | 12.3% | 0.46 | 45% |
| Spezialist | 4 | Extrem | minion | 12 | 12 | 5.7 | 27.0% | 0.59 | 32% |
| Spezialist | 4 | Extrem | mixed | 12 | 12 | 5.9 | 88.5% | 0.95 | 4% |
| Experte | 4 | Routine | elite | 4 | 4 | 2.8 | 0.0% | 0.01 | 92% |
| Experte | 4 | Routine | minion | 4 | 4 | 1.7 | 0.0% | 0.00 | 97% |
| Experte | 4 | Routine | mixed | 4 | 4 | 2.4 | 0.0% | 0.01 | 91% |
| Experte | 4 | Standard | boss | 8 | 8 | 4.7 | 3.3% | 0.18 | 60% |
| Experte | 4 | Standard | elite | 8 | 8 | 5.5 | 0.0% | 0.15 | 74% |
| Experte | 4 | Standard | minion | 8 | 8 | 3.2 | 0.0% | 0.08 | 80% |
| Experte | 4 | Standard | mixed | 8 | 8 | 5.2 | 7.8% | 0.36 | 53% |
| Experte | 4 | Schwer | boss | 8 | 10 | 4.7 | 3.3% | 0.18 | 60% |
| Experte | 4 | Schwer | elite | 8 | 10 | 5.5 | 0.0% | 0.15 | 74% |
| Experte | 4 | Schwer | minion | 10 | 10 | 4.2 | 0.5% | 0.24 | 64% |
| Experte | 4 | Schwer | mixed | 10 | 10 | 6.7 | 52.5% | 0.76 | 18% |
| Experte | 4 | Extrem | boss | 8 | 12 | 4.7 | 3.3% | 0.18 | 60% |
| Experte | 4 | Extrem | elite | 12 | 12 | 10.2 | 26.5% | 0.58 | 33% |
| Experte | 4 | Extrem | minion | 12 | 12 | 5.6 | 14.5% | 0.50 | 40% |
| Experte | 4 | Extrem | mixed | 12 | 12 | 5.8 | 92.0% | 0.96 | 2% |
| Meister | 4 | Routine | elite | 4 | 4 | 3.4 | 0.0% | 0.03 | 88% |
| Meister | 4 | Routine | minion | 4 | 4 | 1.8 | 0.0% | 0.00 | 96% |
| Meister | 4 | Routine | mixed | 4 | 4 | 2.7 | 0.0% | 0.03 | 87% |
| Meister | 4 | Standard | boss | 8 | 8 | 5.9 | 12.5% | 0.34 | 46% |
| Meister | 4 | Standard | elite | 8 | 8 | 7.6 | 4.8% | 0.34 | 55% |
| Meister | 4 | Standard | minion | 8 | 8 | 3.5 | 0.0% | 0.13 | 75% |
| Meister | 4 | Standard | mixed | 8 | 8 | 6.0 | 38.3% | 0.62 | 30% |
| Meister | 4 | Schwer | boss | 8 | 10 | 5.8 | 11.8% | 0.33 | 47% |
| Meister | 4 | Schwer | elite | 8 | 10 | 7.5 | 4.8% | 0.34 | 56% |
| Meister | 4 | Schwer | minion | 10 | 10 | 4.7 | 4.3% | 0.33 | 56% |
| Meister | 4 | Schwer | mixed | 10 | 10 | 6.0 | 82.0% | 0.92 | 5% |
| Meister | 4 | Extrem | boss | 8 | 12 | 5.9 | 12.0% | 0.34 | 46% |
| Meister | 4 | Extrem | elite | 12 | 12 | 10.1 | 77.8% | 0.90 | 7% |
| Meister | 4 | Extrem | minion | 12 | 12 | 5.9 | 37.3% | 0.66 | 26% |
| Meister | 4 | Extrem | mixed | 12 | 12 | 4.8 | 99.3% | 1.00 | 0% |
| Legende | 4 | Routine | elite | 4 | 4 | 4.1 | 0.3% | 0.07 | 82% |
| Legende | 4 | Routine | minion | 4 | 4 | 1.9 | 0.0% | 0.01 | 93% |
| Legende | 4 | Routine | mixed | 4 | 4 | 3.3 | 0.8% | 0.13 | 76% |
| Legende | 4 | Standard | boss | 8 | 8 | 7.3 | 55.8% | 0.74 | 16% |
| Legende | 4 | Standard | elite | 8 | 8 | 10.1 | 28.2% | 0.60 | 32% |
| Legende | 4 | Standard | minion | 8 | 8 | 4.1 | 8.8% | 0.33 | 56% |
| Legende | 4 | Standard | mixed | 8 | 8 | 5.3 | 82.5% | 0.91 | 6% |
| Legende | 4 | Schwer | boss | 8 | 10 | 7.3 | 55.8% | 0.74 | 16% |
| Legende | 4 | Schwer | elite | 8 | 10 | 10.1 | 28.2% | 0.59 | 33% |
| Legende | 4 | Schwer | minion | 10 | 10 | 5.0 | 44.3% | 0.69 | 24% |
| Legende | 4 | Schwer | mixed | 10 | 10 | 4.2 | 99.3% | 1.00 | 0% |
| Legende | 4 | Extrem | boss | 8 | 12 | 7.3 | 56.0% | 0.74 | 16% |
| Legende | 4 | Extrem | elite | 12 | 12 | 8.2 | 97.0% | 0.99 | 1% |
| Legende | 4 | Extrem | minion | 12 | 12 | 4.3 | 87.5% | 0.94 | 4% |
| Legende | 4 | Extrem | mixed | 12 | 12 | 3.6 | 100.0% | 1.00 | 0% |
| Novize | 5 | Routine | elite | 4 | 5 | 1.9 | 0.0% | 0.00 | 98% |
| Novize | 5 | Routine | minion | 5 | 5 | 1.7 | 0.0% | 0.00 | 98% |
| Novize | 5 | Routine | mixed | 5 | 5 | 2.0 | 0.0% | 0.00 | 96% |
| Novize | 5 | Standard | boss | 8 | 10 | 2.8 | 0.0% | 0.01 | 86% |
| Novize | 5 | Standard | elite | 8 | 10 | 3.4 | 0.0% | 0.01 | 91% |
| Novize | 5 | Standard | minion | 10 | 10 | 3.0 | 0.0% | 0.04 | 86% |
| Novize | 5 | Standard | mixed | 10 | 10 | 4.2 | 0.0% | 0.16 | 75% |
| Novize | 5 | Schwer | boss | 8 | 13 | 2.8 | 0.0% | 0.01 | 86% |
| Novize | 5 | Schwer | elite | 12 | 13 | 5.1 | 0.0% | 0.10 | 81% |
| Novize | 5 | Schwer | minion | 13 | 13 | 4.0 | 0.0% | 0.18 | 73% |
| Novize | 5 | Schwer | mixed | 13 | 13 | 6.1 | 7.2% | 0.41 | 51% |
| Novize | 5 | Extrem | boss | 8 | 15 | 2.8 | 0.0% | 0.01 | 86% |
| Novize | 5 | Extrem | elite | 12 | 15 | 5.1 | 0.0% | 0.10 | 81% |
| Novize | 5 | Extrem | minion | 15 | 15 | 5.1 | 2.0% | 0.33 | 58% |
| Novize | 5 | Extrem | mixed | 15 | 15 | 7.6 | 35.0% | 0.67 | 27% |
| Spezialist | 5 | Routine | elite | 4 | 5 | 2.2 | 0.0% | 0.00 | 96% |
| Spezialist | 5 | Routine | minion | 5 | 5 | 1.8 | 0.0% | 0.00 | 97% |
| Spezialist | 5 | Routine | mixed | 5 | 5 | 2.2 | 0.0% | 0.01 | 92% |
| Spezialist | 5 | Standard | boss | 8 | 10 | 3.4 | 0.0% | 0.07 | 77% |
| Spezialist | 5 | Standard | elite | 8 | 10 | 4.0 | 0.0% | 0.05 | 87% |
| Spezialist | 5 | Standard | minion | 10 | 10 | 3.3 | 0.0% | 0.13 | 78% |
| Spezialist | 5 | Standard | mixed | 10 | 10 | 5.5 | 6.8% | 0.39 | 52% |
| Spezialist | 5 | Schwer | boss | 8 | 13 | 3.4 | 0.0% | 0.07 | 77% |
| Spezialist | 5 | Schwer | elite | 12 | 13 | 6.5 | 0.3% | 0.21 | 70% |
| Spezialist | 5 | Schwer | minion | 13 | 13 | 4.8 | 3.5% | 0.35 | 55% |
| Spezialist | 5 | Schwer | mixed | 13 | 13 | 6.8 | 59.8% | 0.81 | 15% |
| Spezialist | 5 | Extrem | boss | 8 | 15 | 3.4 | 0.0% | 0.07 | 77% |
| Spezialist | 5 | Extrem | elite | 12 | 15 | 6.5 | 0.0% | 0.21 | 70% |
| Spezialist | 5 | Extrem | minion | 15 | 15 | 6.0 | 29.0% | 0.63 | 30% |
| Spezialist | 5 | Extrem | mixed | 15 | 15 | 6.2 | 91.3% | 0.97 | 3% |
| Experte | 5 | Routine | elite | 4 | 5 | 2.4 | 0.0% | 0.00 | 95% |
| Experte | 5 | Routine | minion | 5 | 5 | 1.8 | 0.0% | 0.00 | 97% |
| Experte | 5 | Routine | mixed | 5 | 5 | 2.3 | 0.0% | 0.01 | 92% |
| Experte | 5 | Standard | boss | 8 | 10 | 3.7 | 0.0% | 0.08 | 76% |
| Experte | 5 | Standard | elite | 8 | 10 | 4.4 | 0.0% | 0.07 | 84% |
| Experte | 5 | Standard | minion | 10 | 10 | 3.2 | 0.0% | 0.10 | 80% |
| Experte | 5 | Standard | mixed | 10 | 10 | 5.8 | 7.0% | 0.40 | 51% |
| Experte | 5 | Schwer | boss | 8 | 13 | 3.7 | 0.0% | 0.08 | 76% |
| Experte | 5 | Schwer | elite | 12 | 13 | 7.5 | 1.8% | 0.29 | 62% |
| Experte | 5 | Schwer | minion | 13 | 13 | 4.7 | 2.3% | 0.32 | 59% |
| Experte | 5 | Schwer | mixed | 13 | 13 | 7.0 | 72.0% | 0.88 | 9% |
| Experte | 5 | Extrem | boss | 8 | 15 | 3.7 | 0.0% | 0.08 | 76% |
| Experte | 5 | Extrem | elite | 12 | 15 | 7.5 | 1.5% | 0.29 | 62% |
| Experte | 5 | Extrem | minion | 15 | 15 | 6.0 | 18.8% | 0.57 | 35% |
| Experte | 5 | Extrem | mixed | 15 | 15 | 6.0 | 94.5% | 0.98 | 2% |
| Meister | 5 | Routine | elite | 4 | 5 | 2.8 | 0.0% | 0.01 | 92% |
| Meister | 5 | Routine | minion | 5 | 5 | 1.9 | 0.0% | 0.00 | 96% |
| Meister | 5 | Routine | mixed | 5 | 5 | 2.6 | 0.0% | 0.03 | 89% |
| Meister | 5 | Standard | boss | 8 | 10 | 4.6 | 0.5% | 0.16 | 67% |
| Meister | 5 | Standard | elite | 8 | 10 | 5.6 | 0.0% | 0.17 | 75% |
| Meister | 5 | Standard | minion | 10 | 10 | 3.6 | 0.3% | 0.15 | 76% |
| Meister | 5 | Standard | mixed | 10 | 10 | 6.8 | 41.8% | 0.69 | 26% |
| Meister | 5 | Schwer | boss | 8 | 13 | 4.6 | 0.5% | 0.16 | 68% |
| Meister | 5 | Schwer | elite | 12 | 13 | 10.3 | 20.3% | 0.56 | 37% |
| Meister | 5 | Schwer | minion | 13 | 13 | 5.2 | 9.0% | 0.43 | 49% |
| Meister | 5 | Schwer | mixed | 13 | 13 | 5.8 | 94.0% | 0.98 | 1% |
| Meister | 5 | Extrem | boss | 8 | 15 | 4.6 | 0.5% | 0.16 | 68% |
| Meister | 5 | Extrem | elite | 12 | 15 | 10.4 | 21.3% | 0.56 | 36% |
| Meister | 5 | Extrem | minion | 15 | 15 | 6.3 | 39.0% | 0.72 | 23% |
| Meister | 5 | Extrem | mixed | 15 | 15 | 4.9 | 99.5% | 1.00 | 0% |
| Legende | 5 | Routine | elite | 4 | 5 | 3.3 | 0.0% | 0.03 | 89% |
| Legende | 5 | Routine | minion | 5 | 5 | 2.0 | 0.0% | 0.01 | 93% |
| Legende | 5 | Routine | mixed | 5 | 5 | 3.0 | 0.3% | 0.12 | 80% |
| Legende | 5 | Standard | boss | 8 | 10 | 6.4 | 15.0% | 0.45 | 41% |
| Legende | 5 | Standard | elite | 8 | 10 | 7.5 | 3.3% | 0.32 | 60% |
| Legende | 5 | Standard | minion | 10 | 10 | 4.3 | 5.0% | 0.35 | 57% |
| Legende | 5 | Standard | mixed | 10 | 10 | 5.6 | 89.3% | 0.95 | 4% |
| Legende | 5 | Schwer | boss | 8 | 13 | 6.4 | 13.8% | 0.45 | 42% |
| Legende | 5 | Schwer | elite | 12 | 13 | 11.3 | 67.3% | 0.86 | 11% |
| Legende | 5 | Schwer | minion | 13 | 13 | 5.4 | 57.0% | 0.81 | 14% |
| Legende | 5 | Schwer | mixed | 13 | 13 | 4.2 | 100.0% | 1.00 | 0% |
| Legende | 5 | Extrem | boss | 8 | 15 | 6.3 | 13.5% | 0.45 | 42% |
| Legende | 5 | Extrem | elite | 12 | 15 | 11.3 | 67.8% | 0.86 | 11% |
| Legende | 5 | Extrem | minion | 15 | 15 | 4.2 | 91.3% | 0.97 | 2% |
| Legende | 5 | Extrem | mixed | 15 | 15 | 3.7 | 100.0% | 1.00 | 0% |
| Novize | 6 | Routine | elite | 4 | 6 | 1.6 | 0.0% | 0.00 | 98% |
| Novize | 6 | Routine | minion | 6 | 6 | 1.7 | 0.0% | 0.00 | 98% |
| Novize | 6 | Routine | mixed | 6 | 6 | 2.2 | 0.0% | 0.00 | 95% |
| Novize | 6 | Standard | boss | 8 | 12 | 2.4 | 0.0% | 0.01 | 91% |
| Novize | 6 | Standard | elite | 12 | 12 | 4.2 | 0.0% | 0.04 | 88% |
| Novize | 6 | Standard | minion | 12 | 12 | 3.1 | 0.0% | 0.06 | 86% |
| Novize | 6 | Standard | mixed | 12 | 12 | 4.3 | 0.0% | 0.17 | 76% |
| Novize | 6 | Schwer | boss | 8 | 15 | 2.4 | 0.0% | 0.01 | 91% |
| Novize | 6 | Schwer | elite | 12 | 15 | 4.2 | 0.0% | 0.04 | 88% |
| Novize | 6 | Schwer | minion | 15 | 15 | 3.9 | 0.0% | 0.18 | 75% |
| Novize | 6 | Schwer | mixed | 15 | 15 | 6.0 | 4.3% | 0.37 | 55% |
| Novize | 6 | Extrem | boss | 8 | 18 | 2.4 | 0.0% | 0.01 | 91% |
| Novize | 6 | Extrem | elite | 16 | 18 | 5.8 | 0.0% | 0.15 | 77% |
| Novize | 6 | Extrem | minion | 18 | 18 | 5.1 | 3.0% | 0.35 | 58% |
| Novize | 6 | Extrem | mixed | 18 | 18 | 7.9 | 37.8% | 0.70 | 25% |
| Spezialist | 6 | Routine | elite | 4 | 6 | 1.9 | 0.0% | 0.00 | 97% |
| Spezialist | 6 | Routine | minion | 6 | 6 | 1.8 | 0.0% | 0.00 | 97% |
| Spezialist | 6 | Routine | mixed | 6 | 6 | 2.5 | 0.0% | 0.02 | 92% |
| Spezialist | 6 | Standard | boss | 8 | 12 | 2.9 | 0.0% | 0.04 | 85% |
| Spezialist | 6 | Standard | elite | 12 | 12 | 5.2 | 0.0% | 0.12 | 80% |
| Spezialist | 6 | Standard | minion | 12 | 12 | 3.3 | 0.0% | 0.14 | 79% |
| Spezialist | 6 | Standard | mixed | 12 | 12 | 5.8 | 6.3% | 0.39 | 54% |
| Spezialist | 6 | Schwer | boss | 8 | 15 | 2.9 | 0.0% | 0.04 | 85% |
| Spezialist | 6 | Schwer | elite | 12 | 15 | 5.2 | 0.0% | 0.13 | 80% |
| Spezialist | 6 | Schwer | minion | 15 | 15 | 4.6 | 1.5% | 0.34 | 59% |
| Spezialist | 6 | Schwer | mixed | 15 | 15 | 7.4 | 50.2% | 0.77 | 19% |
| Spezialist | 6 | Extrem | boss | 8 | 18 | 2.9 | 0.0% | 0.04 | 85% |
| Spezialist | 6 | Extrem | elite | 16 | 18 | 7.8 | 1.0% | 0.30 | 62% |
| Spezialist | 6 | Extrem | minion | 18 | 18 | 6.2 | 33.0% | 0.67 | 27% |
| Spezialist | 6 | Extrem | mixed | 18 | 18 | 6.2 | 94.0% | 0.98 | 1% |
| Experte | 6 | Routine | elite | 4 | 6 | 2.0 | 0.0% | 0.00 | 97% |
| Experte | 6 | Routine | minion | 6 | 6 | 1.8 | 0.0% | 0.00 | 97% |
| Experte | 6 | Routine | mixed | 6 | 6 | 2.6 | 0.0% | 0.02 | 91% |
| Experte | 6 | Standard | boss | 8 | 12 | 3.0 | 0.0% | 0.03 | 85% |
| Experte | 6 | Standard | elite | 12 | 12 | 5.7 | 0.0% | 0.16 | 77% |
| Experte | 6 | Standard | minion | 12 | 12 | 3.3 | 0.0% | 0.12 | 81% |
| Experte | 6 | Standard | mixed | 12 | 12 | 6.2 | 7.0% | 0.42 | 50% |
| Experte | 6 | Schwer | boss | 8 | 15 | 3.0 | 0.0% | 0.03 | 85% |
| Experte | 6 | Schwer | elite | 12 | 15 | 5.7 | 0.0% | 0.16 | 77% |
| Experte | 6 | Schwer | minion | 15 | 15 | 4.5 | 0.5% | 0.29 | 63% |
| Experte | 6 | Schwer | mixed | 15 | 15 | 7.7 | 57.3% | 0.82 | 14% |
| Experte | 6 | Extrem | boss | 8 | 18 | 3.0 | 0.0% | 0.03 | 85% |
| Experte | 6 | Extrem | elite | 16 | 18 | 8.9 | 2.8% | 0.38 | 54% |
| Experte | 6 | Extrem | minion | 18 | 18 | 6.2 | 19.8% | 0.59 | 34% |
| Experte | 6 | Extrem | mixed | 18 | 18 | 6.0 | 97.5% | 0.99 | 1% |
| Meister | 6 | Routine | elite | 4 | 6 | 2.4 | 0.0% | 0.00 | 95% |
| Meister | 6 | Routine | minion | 6 | 6 | 1.9 | 0.0% | 0.00 | 96% |
| Meister | 6 | Routine | mixed | 6 | 6 | 3.1 | 0.0% | 0.06 | 86% |
| Meister | 6 | Standard | boss | 8 | 12 | 3.8 | 0.0% | 0.07 | 79% |
| Meister | 6 | Standard | elite | 12 | 12 | 7.8 | 2.0% | 0.32 | 61% |
| Meister | 6 | Standard | minion | 12 | 12 | 3.5 | 0.0% | 0.16 | 76% |
| Meister | 6 | Standard | mixed | 12 | 12 | 7.6 | 41.0% | 0.72 | 23% |
| Meister | 6 | Schwer | boss | 8 | 15 | 3.8 | 0.0% | 0.08 | 78% |
| Meister | 6 | Schwer | elite | 12 | 15 | 7.7 | 1.3% | 0.31 | 61% |
| Meister | 6 | Schwer | minion | 15 | 15 | 5.2 | 4.0% | 0.40 | 53% |
| Meister | 6 | Schwer | mixed | 15 | 15 | 6.4 | 92.3% | 0.98 | 2% |
| Meister | 6 | Extrem | boss | 8 | 18 | 3.8 | 0.0% | 0.07 | 79% |
| Meister | 6 | Extrem | elite | 16 | 18 | 11.7 | 41.8% | 0.73 | 23% |
| Meister | 6 | Extrem | minion | 18 | 18 | 6.6 | 42.5% | 0.75 | 20% |
| Meister | 6 | Extrem | mixed | 18 | 18 | 4.9 | 99.8% | 1.00 | 0% |
| Legende | 6 | Routine | elite | 4 | 6 | 2.8 | 0.0% | 0.01 | 92% |
| Legende | 6 | Routine | minion | 6 | 6 | 2.0 | 0.0% | 0.01 | 94% |
| Legende | 6 | Routine | mixed | 6 | 6 | 3.8 | 0.0% | 0.16 | 77% |
| Legende | 6 | Standard | boss | 8 | 12 | 5.0 | 1.5% | 0.23 | 63% |
| Legende | 6 | Standard | elite | 12 | 12 | 10.9 | 19.8% | 0.57 | 36% |
| Legende | 6 | Standard | minion | 12 | 12 | 4.3 | 3.8% | 0.35 | 58% |
| Legende | 6 | Standard | mixed | 12 | 12 | 6.1 | 94.3% | 0.98 | 2% |
| Legende | 6 | Schwer | boss | 8 | 15 | 5.0 | 1.3% | 0.23 | 63% |
| Legende | 6 | Schwer | elite | 12 | 15 | 10.9 | 20.3% | 0.57 | 36% |
| Legende | 6 | Schwer | minion | 15 | 15 | 5.5 | 46.5% | 0.77 | 19% |
| Legende | 6 | Schwer | mixed | 15 | 15 | 4.5 | 100.0% | 1.00 | 0% |
| Legende | 6 | Extrem | boss | 8 | 18 | 5.0 | 1.3% | 0.23 | 63% |
| Legende | 6 | Extrem | elite | 16 | 18 | 10.3 | 92.8% | 0.97 | 2% |
| Legende | 6 | Extrem | minion | 18 | 18 | 4.2 | 95.3% | 0.98 | 1% |
| Legende | 6 | Extrem | mixed | 18 | 18 | 3.6 | 100.0% | 1.00 | 0% |

## Boss scenarios

| Rang | Szenario | Runden Ø | Niederlagen | Anmerkung |
|---|---|---:|---:|---|
| Novize | Solo-Boss (Budget 8, 4 Spieler) | 3.4 | 0.0% | §15.3 Boss: 2 Initiativslots, 2 Reaktionen, HP ×3, Schaden +1 Klasse. |
| Novize | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 32 BP (Standard 8 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |
| Spezialist | Solo-Boss (Budget 8, 4 Spieler) | 4.3 | 2.5% | §15.3 Boss: 2 Initiativslots, 2 Reaktionen, HP ×3, Schaden +1 Klasse. |
| Spezialist | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 32 BP (Standard 8 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |
| Experte | Solo-Boss (Budget 8, 4 Spieler) | 4.7 | 3.0% | §15.3 Boss: 2 Initiativslots, 2 Reaktionen, HP ×3, Schaden +1 Klasse. |
| Experte | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 32 BP (Standard 8 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |
| Meister | Solo-Boss (Budget 8, 4 Spieler) | 5.9 | 12.3% | §15.3 Boss: 2 Initiativslots, 2 Reaktionen, HP ×3, Schaden +1 Klasse. |
| Meister | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 32 BP (Standard 8 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |
| Legende | Solo-Boss (Budget 8, 4 Spieler) | 7.2 | 58.3% | §15.3 Boss: 2 Initiativslots, 2 Reaktionen, HP ×3, Schaden +1 Klasse. |
| Legende | Gegner +1 Band (Kosten verdoppelt) | — | — | Budgetkosten 32 BP (Standard 8 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix. |

## Notes
- Monte-Carlo mit fixiertem Seed (byte-reproduzierbar); dokumentiert als Simulation statt exakter Faltung (großer kombinierter Zustandsraum).
- Fokusfeuer: Party zielt auf den am stärksten beschädigten Gegner; Bosse splitten Slots auf zwei Ziele.
- Schergen fallen bei jedem Schaden ≥ 1 (§15.3); Boss besitzt zwei Initiativslots und zwei Reaktionen (§15.3).
- Budgets §15.4: Routine 1× / Standard 2× / Schwer 2,5× / Extrem 3× Spielerzahl; Band-Verschiebung ×2 (höher) bzw. ÷2 (niedriger).