# Acceptance — Attribute ↔ abgeleitete Werte (Bracket-Connector)

## Scope

Character Editor → Parameter → Kompetenzen: Klick auf eine Grundattribut-Karte
verbindet sichtbar die davon abhängigen abgeleiteten Werte.

## Acceptance criteria

- [x] Klick auf Attributkarte zeigt nur verbundene abgeleitete Boxen oben (max. 3), Rest darunter ausgegraut
- [x] Bracket-Linien fließen vom Attribut zu den verbundenen Boxen (pro Ziel eine Route)
- [x] Auswahl bleibt beim Nutzen des Wert-Dropdowns; Klick außerhalb / Tab-Wechsel setzt zurück
- [x] Verbundene Boxen: `border-primary` + `bg-primary/5` wie Attributkarte
- [x] Display-Zahl flasht kurz bei Wertänderung
- [x] Dropdown-Optionen mit Extra-Manöverwiderstand: `?`-Tooltip nur in der Liste, nicht im Trigger

## Composition Gate

- Verdict: SKIPPED
- Proof: `.qa/runs/composition-gate-attribute-derived-connector.md`
- Reason: UI-only, kein producer→consumer-Pfad
