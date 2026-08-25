# Feature: Brand Interaction Colors

## Intent
SagaDrive soll fuer aktive Auswahlzustaende und primaere CTAs eine eindeutige, wiederverwendbare Farbhierarchie haben. Gold/Amber markiert die aktuell ausgewaehlte Option und die wichtigste Aktion. Cyan/Teal bleibt die funktionale Sekundaerfarbe fuer Fokus, Links, Fortschritt und untergeordnete Interaktion.

## Preconditions
- Die bestehenden SagaDrive-CI-Farben bleiben erhalten: Cyan/Teal und Gold/Amber.
- Bestehende Radix/shadcn-Primitives bleiben die zentrale UI-Basis.
- Keine Produktlogik, Persistenz oder Avatar-Runtime wird veraendert.

## Happy Path
- [ ] Aktive Tabs verwenden global Gold/Amber als gefuellten aktiven Zustand mit ausreichendem Textkontrast.
- [ ] Der Standard-Button repraesentiert die primaere CTA und verwendet global Gold/Amber; sekundaere Aktionen bleiben Outline/Secondary/Cyan-orientiert.
- [ ] Focus-Ringe und funktionale Interaktionshinweise bleiben Cyan/Teal, damit Auswahl und Fokus visuell getrennte Rollen behalten.
- [ ] Der CharacterEditor erbt die neue Tab- und CTA-Hierarchie ohne lokale Farb-Hardcodes.
- [ ] Der kanonische Styleguide und die AI/UI-Guidelines dokumentieren dieselben Rollen, sodass neue Screens diese Konvention standardmaessig verwenden.

## Edge Cases
- [ ] Disabled, destructive und invalid States behalten ihre bestehende semantische Farbe und werden nicht durch Gold ueberschrieben.
- [ ] Light und Dark Mode nutzen jeweils die vorhandenen Accent-/Primary-Tokens mit ausreichendem Kontrast.
- [ ] Inaktive Tabs bleiben neutral und erhalten nur bei Hover/Fokus funktionale Cyan-Hinweise.
- [ ] Bestehende explizite Button-Varianten wie outline, secondary, destructive und ghost bleiben erhalten.
- [ ] Keine neuen Dependencies werden eingefuehrt.

## Regression
- [ ] Button- und Tab-Komponenten bleiben keyboard-bedienbar und behalten sichtbare Focus-States.
- [ ] Bestehende Layouts und Control-Groessen bleiben unveraendert.
- [ ] Keine globale Aenderung an Background-, Card-, Input- oder Border-Tokens.

## Implementation Notes
Pending.
