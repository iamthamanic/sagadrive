# Feature: Brand Interaction Colors

## Intent
SagaDrive soll fuer aktive Auswahlzustaende und primaere CTAs eine eindeutige, wiederverwendbare Farbhierarchie haben, die dem Logo folgt. Cyan/Teal markiert die aktuell ausgewaehlte Option und die wichtigste Aktion. Gold/Amber dient als Hover-Feedback und Premium-Akzent.

## Preconditions
- Die bestehenden SagaDrive-CI-Farben bleiben erhalten: Cyan/Teal und Gold/Amber.
- Bestehende Radix/shadcn-Primitives bleiben die zentrale UI-Basis.
- Keine Produktlogik, Persistenz oder Avatar-Runtime wird veraendert.

## Happy Path
- [x] Aktive Tabs verwenden global Cyan/Teal als gefuellten aktiven Zustand mit ausreichendem Textkontrast.
- [x] Der Standard-Button repraesentiert die primaere CTA und verwendet global Cyan/Teal; Hover wechselt zu Gold/Amber.
- [x] Focus-Ringe bleiben Cyan/Teal.
- [x] Inaktive Tabs und sekundaere Actions nutzen Gold als Hover-Hinweis.
- [x] Der CharacterEditor erbt die Tab- und CTA-Hierarchie ohne lokale Farb-Hardcodes.
- [x] Styleguide und AI/UI-Guidelines dokumentieren dieselben Rollen.

## Edge Cases
- [x] Disabled, destructive und invalid States behalten ihre bestehende semantische Farbe.
- [x] Light und Dark Mode nutzen jeweils die vorhandenen Primary-/Accent-Tokens mit ausreichendem Kontrast.
- [x] Bestehende explizite Button-Varianten wie outline, secondary, destructive und ghost bleiben erhalten.
- [x] Keine neuen Runtime-Dependencies fuer Brand-Farben; Playwright nur als Dev-/QA-Tooling.

## Regression
- [x] Button- und Tab-Komponenten bleiben keyboard-bedienbar und behalten sichtbare Focus-States.
- [x] Bestehende Layouts und Control-Groessen bleiben unveraendert.
- [x] Keine globale Aenderung an Background-, Card-, Input- oder Border-Tokens.

## Implementation Notes
- `src/components/ui/tabs.tsx`: aktive Tabs verwenden `primary` (Cyan/Teal); Hover auf aktiv und inaktiv nutzt `accent` (Gold).
- `src/components/ui/button.tsx`: Default-CTA ist Cyan/Teal; Hover wechselt zu Gold. Outline/Ghost hoveren ebenfalls Gold.
- Docs (`THEME_GUIDE.md`, `Guidelines.md`, `AGENTS.md`) folgen dem Merksatz: Cyan = Auswahl/CTA, Gold = Hover/Premium.
- Keine Produktlogik, Persistenz, Avatar-Runtime, Theme-Basisfarben oder Dependencies wurden geaendert.
