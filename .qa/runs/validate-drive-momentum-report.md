# SagaDrive Drive & Momentum Report (#26)

Deterministische Prüfung von §2.10/§2.11/§2.12 + §16.3. Kein RNG.

- Reroll-Matrix: 60 Zeilen (5 Profile × 3 Modi × 4 Zielwerte)
- Varianten: 4/4 simuliert
- Findings: 0

## Findings
- Reroll-Gewinn monoton (Nachteil > normal > Vorteil), alle Vier-Varianten spielbar, Caps greifen, Deaktivierungs-Abhängigkeiten haben alle Ersatzregeln.

## Drive-Reroll-Wert (§2.10, exakt: 1 − (1 − p)²)

| Profil | Modus | Zielwert | Baseline | Mit Reroll | Gewinn |
|---|---|---:|---:|---:|---:|
| Novize trainiert | normal | 10 | 85.0% | 97.8% | +12.8pp |
| Novize trainiert | normal | 20 | 35.0% | 57.7% | +22.7pp |
| Novize trainiert | advantage | 10 | 97.8% | 99.9% | +2.2pp |
| Novize trainiert | advantage | 20 | 57.8% | 82.1% | +24.4pp |
| Novize trainiert | disadvantage | 10 | 72.3% | 92.3% | +20.0pp |
| Novize trainiert | disadvantage | 20 | 12.3% | 23.0% | +10.7pp |
| Experte trainiert | normal | 10 | 95.0% | 99.8% | +4.7pp |
| Experte trainiert | normal | 20 | 55.0% | 79.8% | +24.8pp |
| Experte trainiert | advantage | 10 | 99.8% | 100.0% | +0.2pp |
| Experte trainiert | advantage | 20 | 79.8% | 95.9% | +16.1pp |
| Experte trainiert | disadvantage | 10 | 90.3% | 99.0% | +8.8pp |
| Experte trainiert | disadvantage | 20 | 30.3% | 51.3% | +21.1pp |

Vollständige Matrix (60 Zeilen) im Report-Verlauf unten.

## Szenen-Flüsse (§2.12-Varianten)

### Standard (beide aktiv)

- Drive final: 4, Momentum final: 0
- Drive-Log: -1 (Reroll Nahkampf) → 2; +1 (Komplikation: Alter Rivale erkennt mich) → 3; +1 (Komplikation: Zweite Komplikation über Cap) → 4
- Momentum-Log: +1 (kritische Zusammenarbeit) → 1; -1 (Koordination: Vorteil für Teamaktion) → 0
- Fail-closed-Ablehnungen: Detail 
  (§2.10)

### Nur Drive

- Drive final: 4, Momentum final: 0
- Drive-Log: -1 (Reroll Nahkampf) → 2; +1 (Komplikation: Alter Rivale erkennt mich) → 3; +1 (Komplikation: Zweite Komplikation über Cap) → 4
- Momentum-Log: —
- Fail-closed-Ablehnungen: Detail Momentum-Quelle Momentum-Ausgabe 
  (§2.10, §2.12, §2.12)

### Nur Momentum

- Drive final: 3, Momentum final: 0
- Drive-Log: —
- Momentum-Log: +1 (kritische Zusammenarbeit) → 1; -1 (Koordination: Vorteil für Teamaktion) → 0
- Fail-closed-Ablehnungen: Reroll Detail Komplikation Cap-Überschuss 
  (§2.12, §2.12, §2.12, §2.12)

### Beide deaktiviert

- Drive final: 3, Momentum final: 0
- Drive-Log: —
- Momentum-Log: —
- Fail-closed-Ablehnungen: Reroll Detail Komplikation Cap-Überschuss Momentum-Quelle Momentum-Ausgabe 
  (§2.12, §2.12, §2.12, §2.12, §2.12, §2.12)

## Deaktivierungs-Abhängigkeiten (§16.3)

| Fähigkeit | Abhängigkeit | Ersatzbegrenzung / Status |
|---|---|---|
| Kampfroutine | none | unabhängig |
| Analyse | momentum | Critical successo erzeugt +1 Momentum — Ersatzbegrenzung: bei deaktiviertem Momentum entfällt der Zusatzeffekt, Kernwirkung (Aufdeckung + Vorteil) bleibt. |
| Koordination | momentum | Gleiches Muster wie Analyse: Helfen bleibt, Momentum-Zusatz entfällt. |
| Feldversorgung | none | unabhängig |
| Improvisation | none | unabhängig |
| Drive-Fähigkeiten-Marker | drive | Ersatzbegrenzung: einmal pro Szene statt Drive-Kosten (ausdrücklich definiert). |

## Vollständige Reroll-Matrix

| Profil | Modus | Zielwert | Baseline | Mit Reroll | Gewinn |
|---|---|---:|---:|---:|---:|
| Novize trainiert | normal | 10 | 85.0% | 97.8% | +12.8pp |
| Novize trainiert | normal | 15 | 60.0% | 84.0% | +24.0pp |
| Novize trainiert | normal | 20 | 35.0% | 57.7% | +22.7pp |
| Novize trainiert | normal | 25 | 10.0% | 19.0% | +9.0pp |
| Novize trainiert | advantage | 10 | 97.8% | 99.9% | +2.2pp |
| Novize trainiert | advantage | 15 | 84.0% | 97.4% | +13.4pp |
| Novize trainiert | advantage | 20 | 57.8% | 82.1% | +24.4pp |
| Novize trainiert | advantage | 25 | 19.0% | 34.4% | +15.4pp |
| Novize trainiert | disadvantage | 10 | 72.3% | 92.3% | +20.0pp |
| Novize trainiert | disadvantage | 15 | 36.0% | 59.0% | +23.0pp |
| Novize trainiert | disadvantage | 20 | 12.3% | 23.0% | +10.7pp |
| Novize trainiert | disadvantage | 25 | 1.0% | 2.0% | +1.0pp |
| Spezialist trainiert | normal | 10 | 95.0% | 99.8% | +4.7pp |
| Spezialist trainiert | normal | 15 | 70.0% | 91.0% | +21.0pp |
| Spezialist trainiert | normal | 20 | 45.0% | 69.8% | +24.8pp |
| Spezialist trainiert | normal | 25 | 20.0% | 36.0% | +16.0pp |
| Spezialist trainiert | advantage | 10 | 99.8% | 100.0% | +0.2pp |
| Spezialist trainiert | advantage | 15 | 91.0% | 99.2% | +8.2pp |
| Spezialist trainiert | advantage | 20 | 69.8% | 90.8% | +21.1pp |
| Spezialist trainiert | advantage | 25 | 36.0% | 59.0% | +23.0pp |
| Spezialist trainiert | disadvantage | 10 | 90.3% | 99.0% | +8.8pp |
| Spezialist trainiert | disadvantage | 15 | 49.0% | 74.0% | +25.0pp |
| Spezialist trainiert | disadvantage | 20 | 20.3% | 36.4% | +16.1pp |
| Spezialist trainiert | disadvantage | 25 | 4.0% | 7.8% | +3.8pp |
| Experte trainiert | normal | 10 | 95.0% | 99.8% | +4.7pp |
| Experte trainiert | normal | 15 | 80.0% | 96.0% | +16.0pp |
| Experte trainiert | normal | 20 | 55.0% | 79.8% | +24.8pp |
| Experte trainiert | normal | 25 | 30.0% | 51.0% | +21.0pp |
| Experte trainiert | advantage | 10 | 99.8% | 100.0% | +0.2pp |
| Experte trainiert | advantage | 15 | 96.0% | 99.8% | +3.8pp |
| Experte trainiert | advantage | 20 | 79.8% | 95.9% | +16.1pp |
| Experte trainiert | advantage | 25 | 51.0% | 76.0% | +25.0pp |
| Experte trainiert | disadvantage | 10 | 90.3% | 99.0% | +8.8pp |
| Experte trainiert | disadvantage | 15 | 64.0% | 87.0% | +23.0pp |
| Experte trainiert | disadvantage | 20 | 30.3% | 51.3% | +21.1pp |
| Experte trainiert | disadvantage | 25 | 9.0% | 17.2% | +8.2pp |
| Meister trainiert | normal | 10 | 95.0% | 99.8% | +4.7pp |
| Meister trainiert | normal | 15 | 90.0% | 99.0% | +9.0pp |
| Meister trainiert | normal | 20 | 65.0% | 87.8% | +22.8pp |
| Meister trainiert | normal | 25 | 40.0% | 64.0% | +24.0pp |
| Meister trainiert | advantage | 10 | 99.8% | 100.0% | +0.2pp |
| Meister trainiert | advantage | 15 | 99.0% | 100.0% | +1.0pp |
| Meister trainiert | advantage | 20 | 87.8% | 98.5% | +10.7pp |
| Meister trainiert | advantage | 25 | 64.0% | 87.0% | +23.0pp |
| Meister trainiert | disadvantage | 10 | 90.3% | 99.0% | +8.8pp |
| Meister trainiert | disadvantage | 15 | 81.0% | 96.4% | +15.4pp |
| Meister trainiert | disadvantage | 20 | 42.3% | 66.6% | +24.4pp |
| Meister trainiert | disadvantage | 25 | 16.0% | 29.4% | +13.4pp |
| Legende trainiert | normal | 10 | 95.0% | 99.8% | +4.7pp |
| Legende trainiert | normal | 15 | 95.0% | 99.8% | +4.7pp |
| Legende trainiert | normal | 20 | 75.0% | 93.8% | +18.8pp |
| Legende trainiert | normal | 25 | 50.0% | 75.0% | +25.0pp |
| Legende trainiert | advantage | 10 | 99.8% | 100.0% | +0.2pp |
| Legende trainiert | advantage | 15 | 99.8% | 100.0% | +0.2pp |
| Legende trainiert | advantage | 20 | 93.8% | 99.6% | +5.9pp |
| Legende trainiert | advantage | 25 | 75.0% | 93.8% | +18.8pp |
| Legende trainiert | disadvantage | 10 | 90.3% | 99.0% | +8.8pp |
| Legende trainiert | disadvantage | 15 | 90.3% | 99.0% | +8.8pp |
| Legende trainiert | disadvantage | 20 | 56.3% | 80.9% | +24.6pp |
| Legende trainiert | disadvantage | 25 | 25.0% | 43.8% | +18.8pp |