# Feature: Character Editor Interaction Polish

## Intent
Der Character Editor soll in den Stats-, Skills- und Inventar-Bereichen nicht nur konsistent aussehen, sondern voll bedienbar sein. Interaktive Elemente muessen ihre Reichweite, Prioritaet und Zustaende klar kommunizieren und die vom Nutzer bearbeiteten Skills/Inventargegenstaende beim Speichern des Charakters mitpersistieren.

## Preconditions
- Die bestehenden SagaDrive-Designregeln gelten: Gold/Amber fuer primaere CTA und aktive Auswahl, Cyan/Teal fuer funktionale Orientierung, Progress und Focus.
- Bestehende Radix/shadcn-Primitives werden wiederverwendet; keine neue UI-Bibliothek oder Dependency.
- Character-DTO und bestehende `abilities`/`inventory`-Felder bleiben die Datenquelle; keine Schema-Migration.
- Character-Owner-Isolation im bestehenden `characterService` bleibt unveraendert.

## Happy Path
- [ ] Stats- und Look-Slider zeigen einen klar sichtbaren kompletten Track mit Rahmen sowie eindeutige Range-, Thumb-, Hover-, Focus- und Drag-Zustaende; Min/Max sind visuell nachvollziehbar.
- [ ] Der Skills-Tab erlaubt Skills hinzuzufuegen und vorhandene Skills zu entfernen; der Remove-CTA funktioniert und leere Zustande geben eine klare naechste Aktion.
- [ ] Der Inventar-Tab erlaubt bis zu 30 Gegenstaende hinzuzufuegen, zeigt belegte Slots klar an und erlaubt Gegenstaende wieder zu entfernen; der Zaehler entspricht dem aktuellen Inhalt.
- [ ] Primaere CTAs verwenden Gold/Amber, sekundaere Aktionen bleiben neutral/Cyan-orientiert und alle Buttons besitzen konsistente Hover-, Pressed-, Focus- und Disabled-Zustaende.
- [ ] Beim Speichern werden die aktuell im Editor gepflegten `abilities` und `inventory` zusammen mit dem Charakter an `characterService.createCharacter` uebergeben und in den vorhandenen Feldern gespeichert.

## Edge Cases
- [ ] Skills oder Inventargegenstaende mit leerem Namen werden nicht angelegt; der Nutzer erhaelt direktes Feedback.
- [ ] Inventar kann 30 Slots nicht ueberschreiten; bei voller Kapazitaet ist Hinzufuegen deaktiviert und der Zustand erklaert.
- [ ] Mengen werden auf mindestens 1 begrenzt; Ability-Kosten koennen nicht negativ sein.
- [ ] Entfernen veraendert nur den lokal bearbeiteten Character-State und keine anderen Charaktere.
- [ ] Destructive Actions bleiben rot; Disabled/invalid/focus States werden nicht von Brand-Gold ueberschrieben.

## Regression
- [ ] Bestehende Character-Info-, Look-, Background- und Notes-Flows bleiben unveraendert.
- [ ] Portrait Upload/Generation und Avatar-Runtime bleiben unveraendert.
- [ ] Keyboard-Bedienung und sichtbare Focus-States der Radix-Primitives bleiben erhalten.
- [ ] Keine neuen Dependencies und keine Datenbankmigration.
- [ ] Typed-strict: alle geaenderten TypeScript-Dateien bleiben ohne `any`, `@ts-ignore`, `@ts-nocheck` oder vergleichbare Type-Escapes.

## Screenshots
Browser-Verifikation gegen die vom Nutzer gelieferten Stats-, Skills- und Inventar-Screenshots erforderlich.

## Implementation Notes
Pending.
