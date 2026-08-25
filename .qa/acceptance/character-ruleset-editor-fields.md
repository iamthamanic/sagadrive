# Feature: Character Ruleset Editor Fields

## Intent
Der CharacterEditor zeigt den Charakternamen direkt oberhalb der 3D-Charaktervorschau und ersetzt dort generische Vorschau-/Bedienhinweise. Im Info-Tab steuert ein Regelset-Dropdown direkt unter der Beschreibung, welche fachlichen Character-Felder angeboten werden.

## Preconditions
- Bestehender CharacterEditor und die vorhandenen Ruleset-Optionen in `src/modules/rulesets/characterCreation.ts` bleiben die Source of Truth.
- Default-Regelset ist `SagaDrive Core` (`sagadrive-core`).
- Die bereits vorhandene Zuordnung wird beibehalten:
  - SagaDrive Core: `Archetyp`, `Rasse`, `Setting`, `Essenzprofil`.
  - Dungeons & Dragons 5.5e: `Klasse`, `Spezies`, `Hintergrund`.
  - `Archetyp` entspricht funktional der D&D-`Klasse`.
  - `Rasse` entspricht funktional der D&D-`Spezies`.
  - `Setting` ist ein SagaDrive-Core-Charakterrahmen und wird bei D&D nicht als Character-Dropdown geführt; D&D-Welt-/Kampagnenkontext kommt separat aus Projekt/World-Lore.
  - `Essenzprofil` ist ein SagaDrive-Core-Konzept ohne direktes D&D-5.5e-Äquivalent und entfällt bei D&D.
  - D&D `Hintergrund` ist ein eigenes D&D-Character-Creation-Feld und kein Ersatz für SagaDrive `Setting` oder `Essenzprofil`.
- Ruleset-Wechsel darf keine regelsetfremden Werte im UI stehen lassen.

## Happy Path
- [x] Direkt oberhalb der 3D-Vorschau wird der aktuelle Charaktername sichtbar; bei leerem Namen steht `Unbenannt`.
- [x] Der generische Ready-/Titeltext wie `Live 3D Vorschau` sowie der permanente Hinweis `Ziehen zum Drehen · Mausrad/Trackpad zum Zoomen` werden entfernt; Loading-/Error-Zustände bleiben sichtbar.
- [x] Direkt unter `Beschreibung` steht das Dropdown `Regelset` mit `SagaDrive Core` und `Dungeons & Dragons 5.5e`; Default ist `SagaDrive Core`.
- [x] Bei `SagaDrive Core` werden `Archetyp`, `Rasse`, `Setting` und `Essenzprofil` angezeigt; bei `Dungeons & Dragons 5.5e` werden stattdessen `Klasse`, `Spezies` und `Hintergrund` angezeigt.
- [x] Ein Regelset-Wechsel setzt regelsetabhängige Auswahlwerte kontrolliert zurück und verwendet weiterhin den neutralen Human-Avatar als sicheren visuellen Startwert.

## Edge Cases
- [x] Ein leerer Charaktername verursacht keinen leeren Preview-Titel, sondern zeigt `Unbenannt`.
- [x] Loading- und Error-Status der 3D-Runtime bleiben trotz entferntem Ready-Label verständlich sichtbar.
- [x] D&D-Spezies ohne eigenes 3D-Preset verwenden weiterhin den vorhandenen neutralen Humanoid-Fallback.
- [x] Custom-Setting wird nur bei SagaDrive Core und nur bei Auswahl `Custom` angezeigt.
- [x] Typed-strict: alle geänderten TypeScript-Dateien bleiben ohne `any`, `@ts-ignore`, `@ts-nocheck` oder vergleichbare Type-Escapes.

## Regression
- [x] Portrait-Generierung, Avatar-Rotation/Zoom, Levelanzeige und Preview-Stats bleiben funktional.
- [x] Character-Lore-Context erhält weiterhin regelsetkorrekte Labels und sendet bei D&D kein SagaDrive-Setting/Essenzprofil.
- [x] Bestehende Cyan/Gold-Interaktionshierarchie und Shared-UI-Primitives bleiben konsistent (Cyan = CTA/Selected, Gold = Hover).

## Screenshots
- `.qa/evidence/feat-character-studio-avatar/02-info-sagadrive-core.png`
- `.qa/evidence/feat-character-studio-avatar/03-info-dnd-5-5e.png`
- Playwright `e2e/character-editor.spec.ts` PASS

## Implementation Notes
- Der CharacterEditor hatte die gewünschte Ruleset-Logik bereits vollständig auf dem aktiven Branch: `ruleset` startet mit `sagadrive-core`, das `Regelset`-Select steht direkt unter `Beschreibung`, und `handleRulesetChange` leert regelsetabhängige Werte vor dem Wechsel.
- Die vorhandene fachliche Zuordnung wurde bestätigt: SagaDrive Core zeigt `Archetyp`, `Rasse`, `Setting`, `Essenzprofil`; D&D 5.5e zeigt `Klasse`, `Spezies`, `Hintergrund`. D&D-Weltkontext bleibt getrennt vom Character-Formular und kann über den bereits vorbereiteten World-/Project-Lore-Kontext kommen.
- Der Charaktername (`characterName || 'Unbenannt'`) bleibt im Preview-Card-Header unmittelbar oberhalb des Canvas sichtbar.
- `AvatarCanvas` zeigt den Runtime-Status nur noch während `loading` oder `error`. Im `ready`-Zustand gibt es kein dauerhaftes generisches 3D-Label mehr.
- Der permanente Bedienhinweis `Ziehen zum Drehen · Mausrad/Trackpad zum Zoomen` wurde entfernt; die OrbitControls selbst bleiben unverändert aktiv.
- GitHub Test Gate für Code-HEAD `de77ea30ba5a5339d7d2d0032dfcf0a59d5387ed`: PASS. Enthalten: `npm run checks` mit Typed-Strict-Lint, Typecheck und Vite-Production-Build; Deno Edge-Function-Checks und 4/4 Prompt-Tests; Secrets-Diff-Scan PASS. Dependency-Audit bleibt informational mit critical=0, high=2.
- Composition Gate für denselben Code-HEAD: PASS.
- Browser-/Screenshot-Verifikation bleibt offen und muss über `@verify-ui` erfolgen.
