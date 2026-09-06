# Inventory v2 — verbindlicher Spielvertrag

Authoritative product contract for SagaDrive Inventory v2 (Epic #105, closed by #114).
Implementation lives under `src/domains/character/inventory-v2/` (domain),
`src/infrastructure/inventory/` (catalog persistence), and
`src/app/character/inventory/` (Character Editor UI).

**Item definitions** (catalog content) are owned by the Item Domain
(`src/domains/items/**`) and the World `item-catalog` module — Core archetypes,
builtin Standard packs, World-authored defs, and Personal defs. **Item instances**
(possession, slots, stacks, equipment) remain **Character-owned** via Inventory v2
`ItemInstance` state. See `docs/items.md` for taxonomy, packs, assets, and architecture.

## Die 13 Regeln

1. **20 Basis-Inventarplätze** sind der V1/Core-Playtestwert. Jeder Platz ist eine persistierte Position.
2. **1 Stapel = 1 Platz.** `stackLimit` steuert, wie viele Einheiten in einem Stapel liegen dürfen.
3. **Stärke ändert nur die Traglast**, nicht die Platzanzahl: `Traglast = 5 + 2 × Stärke`.
4. **Ausgerüstete Gegenstände** belegen Ausrüstungsplätze, keine Basis-Inventarplätze.
5. **Ausrüstungsplätze:** Kopf, Körper, Accessoire 1, Accessoire 2, Haupthand, Nebenhand, Spezial, Füße.
6. **Zweihändige Gegenstände** belegen Haupthand und Nebenhand gleichzeitig (eine Instanz).
7. **Vier Schnellzugriffe** bleiben Domain-Referenzen (Persistenz / Saves) — **ohne UI** im Charakter-Editor.
8. **Behälter:** Der Behälter selbst belegt einen Basisplatz; Inhalt nutzt Behälterkapazität und zählt weiter zur Last. **Keine verschachtelten Behälter** in V1.
9. **Gegenstandskatalog-Scopes:** Core (universell) · Standard (Builtin-Packs) · Welt (effektives Weltprofil + `item-catalog`) · Eigen (Personal, owner-scoped). Katalogsicht folgt der effektiven Welt des Charakters; Definitionen kommen aus Item-Domain / World Catalog, Instanzen bleiben Character-owned.
10. Der **Charakter-Editor** vergibt/entfernt Besitz — er ist **kein Shop** und gibt die abstrakte Ressourcenstufe 0–5 nicht aus.
11. **„Aus Inventar entfernen“** löscht Besitz vom Charakter; es erzeugt **kein** Boden-Loot / World-Drop.
12. Der **volle Core-Katalog** (36 Definitionen) ist der universelle V1-Katalog.
13. **Legacy-Migration / Overflow** ist Kompatibilität für alte `ItemDto[]`-Daten — keine normale Core-Erschaffungsregel.

## Kurzüberblick UI

| Oberfläche | Verhalten |
|---|---|
| Desktop (≥640px) | Basisgrid + Ausrüstung nebeneinander ab `lg:` |
| Mobile (<640px) | Segmente **Inventar** \| **Ausrüstung**; Verschieben über Zielplatz-Sheet (kein DnD nötig) |
| Add-catalog | Text labels **Core / Standard / Welt / Eigen**; Thumbnails only (kein 3D) |

## Verwandte Dokumente

- Core Rules §5.7 / §10 (`docs/sagadrive core rules.md`) — Werkzeuge, Lastpunkte, Katalog, Waffenmerkmale
- Item architecture: `docs/items.md` — Taxonomie, Packs, World `item-catalog`, Assets, Archive/Fork
- Domain ops: `src/domains/character/inventory-v2/`
- Item domain: `src/domains/items/`
- QA: `.qa/acceptance/inventory-*.md`, `.qa/acceptance/item-epic-acceptance.md`
