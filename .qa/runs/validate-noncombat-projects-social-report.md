# SagaDrive Noncombat / Projects / Social Report (#27)

Deterministische Prüfung von §2.8 + §14.1–14.9 (E1). Kein RNG.

- Pflichtszenarien: 7/7
- Sackgassen: 0
- Freie Zahlenboni (Haltung/Kontakt/Ruf): 0
- Bounds: Ziel3 ≤ 7 Würfe, Ziel5 ≤ 11 Würfe
- Findings: 0

## Findings
- 0 Findings: Fail-Forward ohne Sackgassen; Caps/Bounds eingehalten; keine freien Zahlenboni; Mechaniken unterscheidbar.

## Bounds

| Fortschrittsziel | Max Würfe (Issue #27) | Beobachtet |
|---|---:|---:|
| 3 | 7 | 6 |
| 5 | 11 | 10 |

## Szenarien

### S1-essentielle-recherche — Essentielle Information recherchieren

- Start: Klein-Projekt (Fortschritt 4); essentieller Hinweis nicht hinter Einzelwurf.
- Notes: Fehlschlag → Zeit/Tiefe/Risiko; Hinweis bleibt über Projektroute erreichbar.
- Projekt: 4/4 in 4 Würfen; Fail-Forward=slower-deeper-riskier-route

### S2-gemeinschaftsprojekt — Komplexes Gemeinschaftsprojekt (+ Größen klein/groß)

- Start: Komplex benötigt Fortschritt 8; Cap 3 Checks/Intervall.
- Notes: Weitere Beteiligte unterstützen oder erzählen — keine Extra-Würfe über Cap.
- klein 4/4, komplex 8/8, groß 12/12; Cap-Enforcement=true

### S3-reservierter-nsc — Reservierten NSC zu riskanter Hilfe bewegen

- Start: Haltung Reserviert; Bitte riskant; sozialer Konflikt Ziel 3 & 5.
- Notes: Haltung verschiebt nur Schwierigkeitskategorie — kein freier Zahlenmodifikator.
- Haltung→Ziel: sehr-belastend/25; freeNumberBonus=0
- Ziel3: 3/3 in 6 Würfen; Ziel5: 6/5 in 10 Würfen

### S4-gefahrenpassage — Gefahrenpassage

- Start: Gefährlich vs Zielwert 15; Fertigkeit/Widerstand.
- Notes: Fehlschlag = Schaden/Position — Abenteuer läuft weiter.
- Effekte: crit-success→no-damage; success→half-damage; failure→full-damage; crit-failure→double-or-full-plus-severe

### S5-kontakt — Kontakt nutzen

- Start: Kontakt Fachgebiet=Archive, Zuverlässigkeit=2.
- Notes: Zugang/Info/Ressourcen ja; allgemeiner Würfelbonus nein.
- Zugang ohne=false, mit=true; dieBonus=0

### S6-ruf — Rufwirkung

- Start: Fraktionsruf −2…+2 verschiebt Haltung/Zugang.
- Notes: Ruf → Haltung/Zugang; keine automatischen Würfelwerte.
- Mapping: -2→Feindselig/restricted; -1→Reserviert/restricted; 0→Neutral/public; 1→Offen/trusted-channels; 2→Unterstützend/trusted-channels

### S7-erkundung-zeitdruck — Erkundung unter Zeitdruck

- Start: Rollen Späher, Navigator, Suchender, Sicherung, Unterstützung; Gruppenprobe + Fail-Forward bei Fehlschlag.
- Notes: Fehlschlag ändert Zeit/Position — kein identischer Wiederhol-Wurf.
- Gruppenwert=1 (success); Nav-Fail→time-loss-worse-position

## Unterscheidbarkeit

| Mechanik | Würfe | Outcomes | Fortschrittskurve |
|---|---:|---:|---|
| Einzelprobe | 1 | 1 | single-shot |
| Gruppenprobe | N | 1 aggregiert | aggregated-score |
| Projekt | Intervalle × ≤3 | Fortschrittsschritte | interval-progress |

## Harte K.o.-Kriterien

- Sackgassen durch einzelnen Fehlschlag: 0
- Unbegrenzte Würfe/Intervall (Gemeinschaftsprojekt): 0 (Cap 3 enforced)
- Freie situative Zahlenmodifier (Haltung/Kontakt/Ruf): 0