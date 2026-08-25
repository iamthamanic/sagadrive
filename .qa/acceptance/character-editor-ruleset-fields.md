# Feature: Character Editor Ruleset Fields

## Intent
Der CharacterEditor soll den Charakternamen direkt oberhalb der 3D-Vorschau zeigen und die regelabhaengigen Charakterfelder ueber ein neues Dropdown `Regelset` steuern. SagaDrive Core bleibt der Default. Dungeons & Dragons 5.5e verwendet die offiziellen 2024/5.5e Charakterbausteine statt der SagaDrive-spezifischen Felder.

## Preconditions
- Bestehender CharacterEditor, AvatarRuntime, CTA-System und Tabs bleiben strukturell erhalten.
- `SagaDrive Core` ist beim Oeffnen des Editors vorausgewaehlt.
- D&D 5.5e entspricht dem von D&D Beyond seit 2026 so bezeichneten 2024-Regelstand.
- D&D 5.5e Charaktererstellung verwendet fuer diesen Slice `Klasse`, `Spezies` und `Hintergrund`; `Setting` und `Essenzprofil` haben dort kein direktes Charakterfeld und werden ausgeblendet.
- Die bestehende Persistenz fuer `class` und `race` bleibt unveraendert. Ein stabiles persistentes Ruleset-/Background-Feld wird in diesem UI-Slice nicht erfunden, weil `ruleset_id` im Schema eine UUID-Referenz ohne im Repo fest verdrahtete offizielle Datensaetze ist und kein separates strukturiertes Background-Feld existiert.

## Ruleset Mapping

### SagaDrive Core
- Archetyp: Kaempfer, Denker, Heiler, Rebell, Diplomat
- Rasse: Mensch, Elf, Zwerg, Halbling, Ork, Cyborg, Alien
- Setting: Fantasy, Real, Sci-Fi, Custom
- Essenzprofil: Koerperlich, Mental, Spirituell, Paktbasiert, Technologisch

### Dungeons & Dragons 5.5e
- Klasse: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
- Spezies: Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling
- Hintergrund: Acolyte, Artisan, Charlatan, Criminal, Entertainer, Farmer, Guard, Guide, Hermit, Merchant, Noble, Sage, Sailor, Scribe, Soldier, Wayfarer
- Kein Character-Setting-Feld in diesem Flow
- Kein Essenzprofil in diesem Flow

## Happy Path
- [ ] Links ueber der 3D-Vorschau steht der aktuelle Charaktername beziehungsweise `Unbenannt`; die Texte `Live 3D Vorschau` und `Ziehen zum Drehen, Mausrad zum Zoomen` sind dort entfernt.
- [ ] Direkt unter `Beschreibung` steht das Dropdown `Regelset` mit `SagaDrive Core` als Default und `Dungeons & Dragons 5.5e` als zweiter Option.
- [ ] Bei `SagaDrive Core` werden die bestehenden Felder Archetyp, Rasse, Setting und Essenzprofil mit ihren bisherigen Optionen angezeigt.
- [ ] Bei `Dungeons & Dragons 5.5e` werden stattdessen Klasse, Spezies und Hintergrund mit den definierten 5.5e-Core-Optionen angezeigt; Setting und Essenzprofil sind nicht sichtbar.
- [ ] Wechsel des Regelsets bereinigt inkompatible Auswahlwerte, Save-Validierung und Preview-Zusammenfassung verwenden die Terminologie des aktiven Regelsets.

## Edge Cases
- [ ] Ein Wechsel von D&D 5.5e zu SagaDrive Core hinterlaesst keinen D&D-Class-/Background-Wert in den SagaDrive-Feldern.
- [ ] Ein Wechsel von SagaDrive Core zu D&D 5.5e hinterlaesst kein SagaDrive-Setting oder Essenzprofil in der D&D-Zusammenfassung.
- [ ] D&D-Spezies ohne eigenes Avatar-Preset verwenden den vorhandenen neutralen Avatar-Fallback und blockieren den Editor nicht.
- [ ] `Custom Setting` erscheint nur fuer SagaDrive Core und nur wenn `Setting = Custom` ist.
- [ ] Typed-strict: alle geaenderten TypeScript-Dateien bleiben ohne `any`, `@ts-ignore`, `@ts-nocheck` oder vergleichbare Type-Escapes.

## Regression
- [ ] Portrait, Look, Stats, Skills, BG, Inventar und Notes bleiben funktional unveraendert.
- [ ] Bestehende Gold/Cyan Interaction-Hierarchie bleibt erhalten.
- [ ] Kein neues UI-Framework, keine neue Dependency und keine Datenbankmigration.

## Screenshots
Browser-Verifikation fuer SagaDrive-Core-Info-Tab, D&D-5.5e-Info-Tab und linke Avatar-Card erforderlich.

## Implementation Notes
Pending.
