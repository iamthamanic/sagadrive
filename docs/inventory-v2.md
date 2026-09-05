# Inventory v2 — verbindlicher Spielvertrag

Authoritative product contract for SagaDrive Inventory v2 (Epic #105, closed by #114).
Implementation lives under `src/domains/character/inventory-v2/` (domain),
`src/infrastructure/inventory/` (catalog persistence), and
`src/app/character/inventory/` (Character Editor UI).

## Die 13 Regeln

1. **20 Basis-Inventarplätze** sind der V1/Core-Playtestwert. Jeder Platz ist eine persistierte Position.
2. **1 Stapel = 1 Platz.** `stackLimit` steuert, wie viele Einheiten in einem Stapel liegen dürfen.
3. **Stärke ändert nur die Traglast**, nicht die Platzanzahl: `Traglast = 5 + 2 × Stärke`.
4. **Ausgerüstete Gegenstände** belegen Ausrüstungsplätze, keine Basis-Inventarplätze.
5. **Ausrüstungsplätze:** Kopf, Körper, Accessoire 1, Accessoire 2, Haupthand, Nebenhand, Spezial.
6. **Zweihändige Gegenstände** belegen Haupthand und Nebenhand gleichzeitig (eine Instanz).
7. **Vier Schnellzugriffe** sind Referenzen auf vorhandene Instanzen — kein Extra-Speicher.
8. **Behälter:** Der Behälter selbst belegt einen Basisplatz; Inhalt nutzt Behälterkapazität und zählt weiter zur Last. **Keine verschachtelten Behälter** in V1.
9. **Gegenstandskatalog-Scopes:** Core (universell) · Welt (effektives Weltprofil) · Eigen (Personal, owner-scoped). Katalogsicht folgt der effektiven Welt des Charakters.
10. Der **Charakter-Editor** vergibt/entfernt Besitz — er ist **kein Shop** und gibt die abstrakte Ressourcenstufe 0–5 nicht aus.
11. **„Aus Inventar entfernen“** löscht Besitz vom Charakter; es erzeugt **kein** Boden-Loot / World-Drop.
12. Der **volle Core-Katalog** (35 Definitionen aus #108) ist der universelle V1-Katalog.
13. **Legacy-Migration / Overflow** ist Kompatibilität für alte `ItemDto[]`-Daten — keine normale Core-Erschaffungsregel.

## Kurzüberblick UI

| Oberfläche | Verhalten |
|---|---|
| Desktop (≥640px) | Basisgrid + Ausrüstung/Schnellzugriff nebeneinander ab `lg:` |
| Mobile (<640px) | Segmente **Inventar** \| **Ausrüstung**; Verschieben über Zielplatz-Sheet (kein DnD nötig) |

## Verwandte Dokumente

- Core Rules §10 (`docs/sagadrive core rules.md`) — Lastpunkte, Katalog, Waffenmerkmale
- Domain ops: `src/domains/character/inventory-v2/`
- QA: `.qa/acceptance/inventory-*.md`
