# SagaDrive Weltprofile und Weltmodule

> Stand: 27. August 2026  
> Status: technische und regelmechanische Grundlage für Weltprofile

## Zweck

Ein Weltprofil bündelt Setting- und Regelentscheidungen, die für Abenteuer in derselben Welt gelten sollen. Es ist von einem konkreten Abenteuer, Projekt oder laufenden World-State getrennt.

Der bestehende projektgebundene `world`-Prototyp mit Orten, Ereignissen, Fraktionen, Zeit und Wetter ist deshalb nicht dasselbe wie ein Weltprofil und wird durch diese Grundlage nicht ersetzt.

## Architektur

SagaDrive trennt:

1. **Core** – universelle Grundregeln.
2. **Weltprofil** – Setting- und Regelkonfiguration für eine Welt.
3. **Abenteuer/Projekt** – konkrete Kampagne innerhalb einer Welt.
4. **Charakter** – wird später über seine Abenteuer-/Projektzuordnung von der Weltkonfiguration beeinflusst.

Die Adventure↔World- und Character↔Adventure-Verknüpfung ist noch nicht Bestandteil dieser Ausbaustufe.

## Modulregistry

Weltmodule besitzen stabile IDs. Die Anwendung kennt die verfügbaren Module über eine zentrale Registry. Neue einfache Module werden dort ergänzt, statt neue Sonderfelder an der Weltentität anzulegen.

Persistiert wird eine JSON-Struktur nach diesem Muster:

```json
{
  "species-development": {
    "mode": "explicit"
  }
}
```

Fehlende Einstellungen verwenden den in der Registry definierten Core-Default. Unbekannte Modulkeys werden beim Bearbeiten bekannter Module erhalten, damit neuere Weltprofile nicht durch ältere Clients beschädigt werden.

## Core-Modul: Speziesentwicklung

Stabile Modul-ID:

```text
species-development
```

### Grundmechanismus

Speziesentwicklung beschreibt nachträglich erworbene **permanente körperliche oder strukturelle Veränderungen** einer Figur.

- Die 3 Speziespunkte der Charaktererschaffung bleiben unverändert.
- Normales Level-up vergibt keine zusätzlichen Speziespunkte.
- Eine Entwicklung wird durch eine ausdrücklich benannte Quelle gewährt.
- Eine Quelle vergibt entweder ein konkretes Speziesmerkmal oder ein eigenes Entwicklungsbudget mit zulässigen Merkmalen.
- Entwicklungsbudgets verschiedener Quellen dürfen nicht zusammengelegt werden.
- Nicht verwendete Punkte einer Entwicklung verfallen.
- Standardmäßig gilt weiterhin die Merkmals-Allowlist der Spezies. Eine Quelle kann sie ausdrücklich überschreiben.
- Eine identische Unteroption desselben wiederholbaren Merkmals kann nicht erneut erworben werden.
- Permanente Entwicklungen dokumentieren ihre Quelle und Erwerbsstufe.
- Temporäre Verwandlungen oder Effekte sind keine permanenten Speziesentwicklungen; ihre Merkmale gelten nur über den verursachenden Effekt.

### Modus `explicit` – Explizit

Core-Default.

Nach Charaktererschaffung sind Speziesentwicklungen nur möglich, wenn eine konkrete Regelquelle sie ausdrücklich gewährt. Das Erreichen einer Stufe oder eines Rangs allein erzeugt keine Entwicklung.

Typische Quellen können später sein:

- Mutation oder dauerhafte Transformation,
- besondere Fähigkeit,
- integrierte körperliche Modifikation,
- Weltregel,
- Abenteuerfolge.

### Modus `progressive` – Progressiv

Das Weltprofil erlaubt Speziesentwicklung als regulär verfügbare Progressionsoption.

Der Modus selbst vergibt **noch keine** Punkte. Eine konkrete Welt- oder Regelquelle muss weiterhin festlegen:

- Voraussetzungen,
- Zeitpunkt oder Rang,
- festes Merkmal oder lokales Entwicklungsbudget,
- zulässige Merkmale,
- mögliche Ausnahmen von der normalen Spezies-Allowlist.

Für frei wählbare Entwicklungsquellen gilt als Balance-Richtwert:

| Merkmalswert | Frühester empfohlener Rang |
|---:|---|
| 1 Punkt | Spezialist, Stufe 5+ |
| 2 Punkte | Experte, Stufe 9+ |
| 3 Punkte | Meister, Stufe 13+ |

Ausdrücklich storygebundene konkrete Transformationen können davon abweichen.

### Modus `disabled` – Deaktiviert

Nach Charaktererschaffung sind permanente Speziesentwicklungen in dieser Welt nicht verfügbar.

Temporäre Effekte bleiben möglich, wenn andere Regeln sie erlauben; sie verändern die permanenten Speziesmerkmale nicht.

## Technische Persistenz

Weltprofile werden owner-scoped gespeichert. Die Modulkonfiguration liegt in `world_profiles.modules` als JSONB. Die Datenbank besitzt bewusst keine eigene Spalte pro Weltmodul.

Die aktuelle Ausbaustufe wendet Weltmodule noch nicht auf Charaktere an. Das geschieht erst, sobald Abenteuer eindeutig einem Weltprofil zugeordnet werden und ein Charakter seine effektive Welt über diese Zuordnung erhält.

## Nächster Integrationsschritt

Der nächste sinnvolle Schritt ist:

```text
WorldProfile → Adventure/Project → Character assignment → effective world modules
```

Erst danach darf der Character-/Advancement-Flow beispielsweise `species-development.mode` auswerten.
