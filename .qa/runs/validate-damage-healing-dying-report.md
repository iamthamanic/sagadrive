# SagaDrive Damage, Healing & Dying Validation Report (#23)

Exact damage distributions (§8.1/§8.2), protection matrix (§8.3), dying state machine (§8.5), massive damage (§8.6), recovery (§8.8), difficulty modules (§16.4).

- Bands: Novize / Experte / Legende
- Scenario rows: 720
- Findings: 0

## Findings
Keine toten oder dominanten Schutz-/Schadens-Kombinationen; Sterbe- und Erholungskurven konsistent.

## Representative curves (mittlere Ausdauer)

| Band | Szenario | Messgröße | Wert | Detail |
|---|---|---|---|---|
| Novize | Unbewaffnet vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Novize | Unbewaffnet vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Novize | Unbewaffnet vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Novize | Unbewaffnet vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Novize | Unbewaffnet vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Novize | Unbewaffnet vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Novize | Unbewaffnet vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 2 |
| Novize | Unbewaffnet vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Novize | Unbewaffnet vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Novize | Unbewaffnet vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 3 |
| Novize | Unbewaffnet vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 2 |
| Novize | Unbewaffnet vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Novize | Unbewaffnet vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 5 |
| Novize | Unbewaffnet vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 4 |
| Novize | Unbewaffnet vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 3 |
| Novize | Leicht vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Novize | Leicht vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Novize | Leicht vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Novize | Leicht vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Novize | Leicht vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Novize | Leicht vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Novize | Leicht vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 2 |
| Novize | Leicht vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Novize | Leicht vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Novize | Leicht vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 3 |
| Novize | Leicht vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 2 |
| Novize | Leicht vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Novize | Leicht vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 5 |
| Novize | Leicht vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 4 |
| Novize | Leicht vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 3 |
| Novize | Standard vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Novize | Standard vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Novize | Standard vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Novize | Standard vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Novize | Standard vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Novize | Standard vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Novize | Standard vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 2 |
| Novize | Standard vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Novize | Standard vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Novize | Standard vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 3 |
| Novize | Standard vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 2 |
| Novize | Standard vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Novize | Standard vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 5 |
| Novize | Standard vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 4 |
| Novize | Standard vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 3 |
| Novize | Schwer vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Novize | Schwer vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Novize | Schwer vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Novize | Schwer vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Novize | Schwer vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Novize | Schwer vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Novize | Schwer vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 2 |
| Novize | Schwer vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Novize | Schwer vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Novize | Schwer vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 3 |
| Novize | Schwer vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 2 |
| Novize | Schwer vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Novize | Schwer vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 5 |
| Novize | Schwer vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 4 |
| Novize | Schwer vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 3 |
| Novize | Extrem vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Novize | Extrem vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Novize | Extrem vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Novize | Extrem vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Novize | Extrem vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Novize | Extrem vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Novize | Extrem vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 2 |
| Novize | Extrem vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Novize | Extrem vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Novize | Extrem vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 3 |
| Novize | Extrem vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 2 |
| Novize | Extrem vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Novize | Extrem vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 5 |
| Novize | Extrem vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 4 |
| Novize | Extrem vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 3 |
| Novize | Sterbend (Heroisch, stabil bei 0) | Todeswahrscheinlichkeit über Todeswürfe | 0.00% | §16.4: Sterbend nur durch kritischen Treffer oder ausdrücklich tödliche Gefahr. |
| Novize | Sterbend (Standard, Start 1) | Todeswahrscheinlichkeit | 19.25% | Todeswürfe: d20+Ausd(3)+EB(1) vs ZW 15 |
| Novize | Sterbend (Hart, Start 2) | Todeswahrscheinlichkeit | 47.50% | Todeswürfe: d20+Ausd(3)+EB(1) vs ZW 15 |
| Novize | Erholung | Gesundheit pro Ruhephase | Verschnaufpause 4 / Medizinisch 8 / Volle Ruhe voll | Erholungswert 4 (§6.6) |
| Novize | Massiver Schaden (§8.6) | Sofort-Tod ab 40 Schaden (Krit) | 0.00% | aktuelle + maximale Gesundheit bei vollem Leben |
| Experte | Unbewaffnet vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Experte | Unbewaffnet vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Experte | Unbewaffnet vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Experte | Unbewaffnet vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Experte | Unbewaffnet vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Experte | Unbewaffnet vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Experte | Unbewaffnet vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 2 |
| Experte | Unbewaffnet vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Experte | Unbewaffnet vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Experte | Unbewaffnet vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 3 |
| Experte | Unbewaffnet vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 2 |
| Experte | Unbewaffnet vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Experte | Unbewaffnet vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 5 |
| Experte | Unbewaffnet vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 4 |
| Experte | Unbewaffnet vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 3 |
| Experte | Leicht vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Experte | Leicht vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Experte | Leicht vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Experte | Leicht vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Experte | Leicht vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Experte | Leicht vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Experte | Leicht vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 2 |
| Experte | Leicht vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Experte | Leicht vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Experte | Leicht vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 3 |
| Experte | Leicht vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 2 |
| Experte | Leicht vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Experte | Leicht vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 5 |
| Experte | Leicht vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 4 |
| Experte | Leicht vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 3 |
| Experte | Standard vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Experte | Standard vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Experte | Standard vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Experte | Standard vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Experte | Standard vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Experte | Standard vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Experte | Standard vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 2 |
| Experte | Standard vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Experte | Standard vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Experte | Standard vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 3 |
| Experte | Standard vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 2 |
| Experte | Standard vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Experte | Standard vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 5 |
| Experte | Standard vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 4 |
| Experte | Standard vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 3 |
| Experte | Schwer vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Experte | Schwer vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Experte | Schwer vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Experte | Schwer vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Experte | Schwer vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Experte | Schwer vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Experte | Schwer vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 2 |
| Experte | Schwer vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Experte | Schwer vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Experte | Schwer vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 3 |
| Experte | Schwer vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 2 |
| Experte | Schwer vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Experte | Schwer vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 5 |
| Experte | Schwer vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 4 |
| Experte | Schwer vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 3 |
| Experte | Extrem vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Experte | Extrem vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Experte | Extrem vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Experte | Extrem vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Experte | Extrem vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Experte | Extrem vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Experte | Extrem vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 2 |
| Experte | Extrem vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Experte | Extrem vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Experte | Extrem vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 3 |
| Experte | Extrem vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 2 |
| Experte | Extrem vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Experte | Extrem vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 5 |
| Experte | Extrem vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 4 |
| Experte | Extrem vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 3 |
| Experte | Sterbend (Heroisch, stabil bei 0) | Todeswahrscheinlichkeit über Todeswürfe | 0.00% | §16.4: Sterbend nur durch kritischen Treffer oder ausdrücklich tödliche Gefahr. |
| Experte | Sterbend (Standard, Start 1) | Todeswahrscheinlichkeit | 11.76% | Todeswürfe: d20+Ausd(3)+EB(3) vs ZW 15 |
| Experte | Sterbend (Hart, Start 2) | Todeswahrscheinlichkeit | 33.82% | Todeswürfe: d20+Ausd(3)+EB(3) vs ZW 15 |
| Experte | Erholung | Gesundheit pro Ruhephase | Verschnaufpause 6 / Medizinisch 12 / Volle Ruhe voll | Erholungswert 6 (§6.6) |
| Experte | Massiver Schaden (§8.6) | Sofort-Tod ab 48 Schaden (Krit) | 0.00% | aktuelle + maximale Gesundheit bei vollem Leben |
| Legende | Unbewaffnet vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Legende | Unbewaffnet vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Legende | Unbewaffnet vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Legende | Unbewaffnet vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Legende | Unbewaffnet vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Legende | Unbewaffnet vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Legende | Unbewaffnet vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 2 |
| Legende | Unbewaffnet vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Legende | Unbewaffnet vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 0 |
| Legende | Unbewaffnet vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 3 |
| Legende | Unbewaffnet vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 2 |
| Legende | Unbewaffnet vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 1 |
| Legende | Unbewaffnet vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 5 |
| Legende | Unbewaffnet vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 4 |
| Legende | Unbewaffnet vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 3.50 / Ø krit 6.00 nach Schutz 3 |
| Legende | Leicht vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Legende | Leicht vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Legende | Leicht vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Legende | Leicht vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Legende | Leicht vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Legende | Leicht vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Legende | Leicht vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 2 |
| Legende | Leicht vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Legende | Leicht vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 0 |
| Legende | Leicht vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 3 |
| Legende | Leicht vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 2 |
| Legende | Leicht vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 1 |
| Legende | Leicht vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 5 |
| Legende | Leicht vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 4 |
| Legende | Leicht vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 4.50 / Ø krit 8.00 nach Schutz 3 |
| Legende | Standard vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Legende | Standard vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Legende | Standard vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Legende | Standard vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Legende | Standard vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Legende | Standard vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Legende | Standard vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 2 |
| Legende | Standard vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Legende | Standard vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 0 |
| Legende | Standard vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 3 |
| Legende | Standard vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 2 |
| Legende | Standard vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 1 |
| Legende | Standard vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 5 |
| Legende | Standard vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 4 |
| Legende | Standard vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 6.50 / Ø krit 11.00 nach Schutz 3 |
| Legende | Schwer vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Legende | Schwer vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Legende | Schwer vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Legende | Schwer vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Legende | Schwer vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Legende | Schwer vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Legende | Schwer vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 2 |
| Legende | Schwer vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Legende | Schwer vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 0 |
| Legende | Schwer vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 3 |
| Legende | Schwer vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 2 |
| Legende | Schwer vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 1 |
| Legende | Schwer vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 5 |
| Legende | Schwer vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 4 |
| Legende | Schwer vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 8.50 / Ø krit 14.00 nach Schutz 3 |
| Legende | Extrem vs Schutz 0 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Legende | Extrem vs Schutz 0 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Legende | Extrem vs Schutz 0 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Legende | Extrem vs Schutz 1 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Legende | Extrem vs Schutz 1 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Legende | Extrem vs Schutz 1 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Legende | Extrem vs Schutz 2 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 2 |
| Legende | Extrem vs Schutz 2 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Legende | Extrem vs Schutz 2 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 0 |
| Legende | Extrem vs Schutz 3 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 3 |
| Legende | Extrem vs Schutz 3 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 2 |
| Legende | Extrem vs Schutz 3 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 1 |
| Legende | Extrem vs Schutz 5 | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 5 |
| Legende | Extrem vs Schutz 5 (Dr 1) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 4 |
| Legende | Extrem vs Schutz 5 (Dr 2) | Treffer-Chance (Schaden ≥ Gesundheit) | 0.00% | Ø normal 10.50 / Ø krit 17.00 nach Schutz 3 |
| Legende | Sterbend (Heroisch, stabil bei 0) | Todeswahrscheinlichkeit über Todeswürfe | 0.00% | §16.4: Sterbend nur durch kritischen Treffer oder ausdrücklich tödliche Gefahr. |
| Legende | Sterbend (Standard, Start 1) | Todeswahrscheinlichkeit | 7.10% | Todeswürfe: d20+Ausd(3)+EB(5) vs ZW 15 |
| Legende | Sterbend (Hart, Start 2) | Todeswahrscheinlichkeit | 21.04% | Todeswürfe: d20+Ausd(3)+EB(5) vs ZW 15 |
| Legende | Erholung | Gesundheit pro Ruhephase | Verschnaufpause 8 / Medizinisch 16 / Volle Ruhe voll | Erholungswert 8 (§6.6) |
| Legende | Massiver Schaden (§8.6) | Sofort-Tod ab 56 Schaden (Krit) | 0.00% | aktuelle + maximale Gesundheit bei vollem Leben |

## Notes
- Exakte Faltung der Würfelformen; kein Samplingfehler.
- Krit verdoppelt nur Würfel, nicht feste Boni (§8.2).
- Schutz reduziert Schaden flach, Durchdringung senkt Schutz zuerst.
- Sterbewurf d20 + Ausdauer + EB vs ZW 15 (§8.5); Hart startet bei Sterbend 2 (§16.4).
- Medizinische Versorgung ersetzt Verschnaufpause-Heilung (2 × Erholung), nicht additiv (§8.8).