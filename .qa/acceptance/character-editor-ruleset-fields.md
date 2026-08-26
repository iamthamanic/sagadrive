# Feature: Character Editor Ruleset Fields

## Intent
Der CharacterEditor soll den Charakternamen direkt oberhalb der 3D-Vorschau zeigen und die regelabhaengigen Charakterfelder ueber ein Dropdown `Regelset` steuern. SagaDrive Core bleibt der Default. Dungeons & Dragons 5.5e verwendet die 5.5e-Charakterbausteine statt der SagaDrive-spezifischen Felder. Das gewaehlte Regelset und der D&D-Hintergrund muessen beim Speichern erhalten bleiben.

## Preconditions
- Bestehender CharacterEditor, AvatarRuntime, CTA-System und Tabs bleiben strukturell erhalten.
- `SagaDrive Core` ist beim Oeffnen des Editors vorausgewaehlt.
- D&D 5.5e Charaktererstellung verwendet fuer diesen Slice `Klasse`, `Spezies` und `Hintergrund`; `Setting` und `Essenzprofil` haben dort kein direktes Charakterfeld und werden ausgeblendet.
- `class` und `race` bleiben die bestehenden Gameplay-Felder fuer Archetyp/Klasse und Rasse/Spezies.
- Der stabile Editor-Regelset-Key wird separat als `ruleset_key` gespeichert, da `ruleset_id` weiterhin ein optionaler UUID-Verweis auf katalogisierte Rulesets ist.
- Der D&D-5.5e-Hintergrund wird separat als `dnd_background` gespeichert und nicht mit der freien `background_story` vermischt.

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
- [x] Links ueber der 3D-Vorschau steht der aktuelle Charaktername beziehungsweise `Unbenannt`; die Texte `Live 3D Vorschau` und `Ziehen zum Drehen, Mausrad zum Zoomen` sind dort entfernt.
- [x] Direkt unter `Beschreibung` steht das Dropdown `Regelset` mit `SagaDrive Core` als Default und `Dungeons & Dragons 5.5e` als zweiter Option.
- [x] Bei `SagaDrive Core` werden die bestehenden Felder Archetyp, Rasse, Setting und Essenzprofil mit ihren bisherigen Optionen angezeigt.
- [x] Bei `Dungeons & Dragons 5.5e` werden stattdessen Klasse, Spezies und Hintergrund mit den definierten 5.5e-Core-Optionen angezeigt; Setting und Essenzprofil sind nicht sichtbar.
- [x] Wechsel des Regelsets bereinigt inkompatible Auswahlwerte, Save-Validierung und Preview-Zusammenfassung verwenden die Terminologie des aktiven Regelsets.
- [x] Save persistiert `ruleset_key`; D&D 5.5e persistiert zusaetzlich `dnd_background` separat von der Hintergrundgeschichte.

## Edge Cases
- [x] Ein Wechsel von D&D 5.5e zu SagaDrive Core hinterlaesst keinen D&D-Class-/Background-Wert in den SagaDrive-Feldern.
- [x] Ein Wechsel von SagaDrive Core zu D&D 5.5e hinterlaesst kein SagaDrive-Setting oder Essenzprofil in der D&D-Zusammenfassung.
- [x] D&D-Spezies ohne eigenes Avatar-Preset verwenden den vorhandenen neutralen Avatar-Fallback und blockieren den Editor nicht.
- [x] `Custom Setting` erscheint nur fuer SagaDrive Core und nur wenn `Setting = Custom` ist.
- [x] Alt-Characters ohne `ruleset_key` werden als `sagadrive-core` gelesen; SagaDrive-Core-Saves tragen keinen alten `dnd_background` weiter.
- [x] Typed-strict: alle geaenderten TypeScript-Dateien bleiben ohne `any`, `@ts-ignore`, `@ts-nocheck` oder vergleichbare Type-Escapes.

## Regression
- [x] Portrait, Look, Stats, Skills, BG, Inventar und Notes bleiben funktional unveraendert.
- [x] Bestehende Cyan/Gold Interaction-Hierarchie bleibt erhalten.
- [x] Keine neue UI-Library oder Frontend-Dependency.
- [x] Datenbankaenderung erfolgt rueckwaertskompatibel ueber `supabase/migrations/005_character_ruleset_metadata.sql`.

## Screenshots
- `.qa/evidence/feat-character-studio-avatar/02-info-sagadrive-core.png`
- `.qa/evidence/feat-character-studio-avatar/03-info-dnd-5-5e.png`
- Playwright `e2e/character-editor.spec.ts`

## Implementation Notes
- Ruleset-spezifische Character-Creation-Definitionen liegen zentral in `src/modules/rulesets/characterCreation.ts`.
- `src/components/CharacterEditor.tsx` rendert die Felder anhand des aktiven Regelsets, setzt inkompatible lokale Auswahlwerte beim Wechsel zurueck und gibt `ruleset_key`/`dnd_background` an den Character-Service weiter.
- `src/modules/characters/services/character.service.ts` normalisiert Altwerte auf SagaDrive Core und persistiert D&D-Hintergrund nur fuer `dnd-5.5e`.
- `supabase/migrations/005_character_ruleset_metadata.sql` ist Teil des dokumentierten Deploy-Contracts.
- D&D-Spezies greifen weiterhin auf die vorhandene Avatar-Race-Aufloesung zu; unbekannte Spezies landen im neutralen Humanoid-Fallback.
- `scripts/character-editor-regression-check.mjs` sperrt die Persistenz- und Runtime-Regressions als Test-Gate-Contract ab.
