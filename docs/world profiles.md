# SagaDrive Weltprofile und Weltmodule

> Stand: 27. August 2026  
> Status: Weltprofile + Abenteuer-/Charakterkontext

## Zweck

Ein Weltprofil bündelt Setting- und Regelentscheidungen, die für Abenteuer in derselben Welt gelten sollen. Es ist von einem konkreten Abenteuer, Projekt oder laufenden World-State getrennt.

Der bestehende projektgebundene `world`-Prototyp mit Orten, Ereignissen, Fraktionen, Zeit und Wetter ist deshalb nicht dasselbe wie ein Weltprofil und wird nicht ersetzt.

## Architektur

SagaDrive trennt vier Ebenen:

1. **Core** – universelle Grundregeln.
2. **WorldProfile** – Setting- und Regelkonfiguration für eine Welt.
3. **Adventure/Project** – konkrete Kampagne mit genau einem aktiven WorldProfile-Kontext.
4. **Character participation** – ein Charakter nimmt über `project_members.character_id` an einem Abenteuer teil und erhält dadurch dessen effektive Weltregeln.

Der zentrale Datenfluss lautet:

```text
SagaDrive Core
      ↓
WorldProfile
      ↓ projects.world_profile_id
Adventure / Project
      ↓ project_members.character_id
Character participation
      ↓
EffectiveWorldConfig
```

Ein Charakter bekommt **keine globale `world_profile_id`**. Derselbe Charakter kann in mehreren Abenteuern vorkommen, deshalb wird seine aktive Welt immer über `(projectId, characterId)` bestimmt.

## Legacy-`world_id` bleibt getrennt

`projects.world_id` existierte bereits vor den WorldProfiles und wird unter anderem vom Character-Lore-Kontext verwendet. Diese ID hat eine andere Bedeutung und wird weder migriert noch als WorldProfile-FK wiederverwendet.

Für Regelwelten existiert ausschließlich:

```text
projects.world_profile_id → world_profiles.id
```

Damit kann keine bestehende Lore-/Campaign-State-Identität still umgedeutet werden.

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

Fehlende Einstellungen verwenden den Registry-Core-Default. Unbekannte Modulkeys werden beim Bearbeiten bekannter Module erhalten, damit neuere Weltprofile nicht durch ältere Clients beschädigt werden.

## Core-Modul: Speziesentwicklung

Stabile Modul-ID: `species-development`.

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
- Temporäre Verwandlungen oder Effekte sind keine permanenten Speziesentwicklungen.

### `explicit` – Explizit

Core-Default. Nach Charaktererschaffung sind Speziesentwicklungen nur möglich, wenn eine konkrete Regelquelle sie ausdrücklich gewährt. Das Erreichen einer Stufe oder eines Rangs allein erzeugt keine Entwicklung.

### `progressive` – Progressiv

Das Weltprofil erlaubt Speziesentwicklung als regulär verfügbare Progressionsoption. Der Modus selbst vergibt **keine** Punkte; eine konkrete Welt- oder Regelquelle muss weiterhin Voraussetzungen, Zeitpunkt, Budget/Merkmal und zulässige Optionen festlegen.

### `disabled` – Deaktiviert

Im aktiven Kontext dieser Welt können keine **neuen** permanenten Speziesentwicklungen erworben werden.

Wichtig: `disabled` löscht keine bereits erworbenen permanenten Merkmale. Ein Charakter, der beispielsweise in einer früheren Welt `Enge Resistenz: Strahlung` dauerhaft erworben hat, behält dieses Merkmal beim Wechsel in ein Abenteuer einer `disabled`-Welt. Die neue Welt beschränkt nur zukünftigen Erwerb.

## Adventure → WorldProfile

Neue Abenteuer verlangen im UI und Service ein WorldProfile. Persistiert wird nur dessen ID auf dem Projekt: `projects.world_profile_id`.

Bestehende Legacy-Projekte dürfen nach Migration zunächst `NULL` behalten. Sie haben solange keinen effektiven Regelwelt-Kontext, bis der GM eine Welt zuweist.

Die Datenbank erzwingt zwei Dinge:

1. der FK muss auf ein existierendes `world_profiles`-Objekt zeigen,
2. das Weltprofil muss dem GM des Projekts gehören.

Für spätere Änderungen existiert die serverseitige RPC `set_project_world_profile`. Ein Browser kann damit kein fremdes Weltprofil an ein eigenes Projekt hängen.

## Character participation

Die Charakterzuordnung bleibt auf der bestehenden Projektmitgliedschaft: `project_members(project_id, user_id, character_id, status)`.

Beim Beitritt wählt der Spieler einen eigenen Charakter. Die bestehende RPC `set_my_project_character` bleibt die einzige Self-Service-Operation zum Wechsel des eigenen Teilnahme-Charakters und verifiziert Character-Ownership serverseitig.

Es gibt absichtlich **keinen** neuen `characters.world_profile_id`- oder `characters.world_id`-Wert.

## EffectiveWorldConfig

Regelverbraucher verwenden `resolveEffectiveWorldConfigForParticipation(projectId, characterId)`.

Der Resolver prüft:

1. aktuellen authentifizierten User,
2. aktive Mitgliedschaft im angegebenen Projekt,
3. dass `characterId` exakt der Character-ID dieser Mitgliedschaft entspricht,
4. `projects.world_profile_id`,
5. Zugriff auf das zugewiesene WorldProfile,
6. Normalisierung der Module über die Registry.

Ergebnis enthält `projectId`, `characterId`, `worldProfileId`, `worldName`, `modules`, `speciesDevelopmentMode` und `source: 'project-world-profile'`.

Damit gibt es genau eine Ableitungsrichtung und keine konkurrierende Weltkopie auf dem Charakter.

## Zugriff und RLS

WorldProfiles bleiben owner-editierbar. Zusätzlich dürfen aktive Projektteilnehmer das **dem Projekt zugewiesene** WorldProfile lesen. Das ist erforderlich, damit ein Spieler seine effektiven Regeln auswerten kann.

Die Erweiterung gilt nur für `SELECT`. Erstellen, Bearbeiten und Löschen bleiben beim Owner des WorldProfiles.

## Migrationen

Für diesen Stand zusätzlich erforderlich:

```text
008_world_profiles.sql
009_project_world_profiles.sql
```

`008` erstellt die owner-scoped Weltprofile. `009` ergänzt `projects.world_profile_id`, die GM/Owner-Invariante, die sichere Assignment-RPC und den Read-Zugriff aktiver Projektteilnehmer.

## Noch nicht enthalten

- automatische Speziespunkte oder Mutationen durch `progressive`,
- frei konfigurierbare Progressionsschwellen,
- rückwirkende Veränderung persistierter Charaktermerkmale durch Weltwechsel,
- Ablösung des Legacy-`projects.world_id` oder der alten `world`-Edge-Function,
- ein globaler Weltzustand direkt am Charakter.
