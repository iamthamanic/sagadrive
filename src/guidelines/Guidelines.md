# SagaDrive UI Generation Guidelines

Diese Regeln gelten fuer neue und ueberarbeitete SagaDrive-Produktoberflaechen. `src/THEME_GUIDE.md` ist die kanonische Detailreferenz. UI-Primitives unter `src/components/ui/` sind die technische Source of Truth.

## Grundstil

- Produkt-UI, keine Marketing-Landingpage-Aesthetik.
- Dark-first, klar, ruhig, hochwertig und funktional.
- Bestehende Radix/shadcn-Komponenten wiederverwenden statt lokale Sonderloesungen zu bauen.
- Darker Grotesque als UI-Schrift beibehalten.
- Keine zufaelligen Farben ausserhalb der SagaDrive-CI.
- Controls muessen auch ohne Hover oder Focus eindeutig als Controls erkennbar sein.
- Touch Targets fuer wichtige Controls mindestens 44px hoch.

## Brand-Farbrollen

SagaDrive verwendet zwei Markenfarben mit festen semantischen Rollen:

### Gold / Amber: Auswahl und wichtigste Aktion

- Light: `#E8A641`
- Dark: `#F59E0B`
- Aktiver Tab: gefuellter Gold-/Amber-Zustand.
- Primaere CTA: gefuellter Gold-/Amber-Button.
- Level-, Achievement- und Premium-Akzente duerfen ebenfalls Gold verwenden.
- Nicht fuer Fehler-, Disabled- oder normale Information States verwenden.

### Cyan / Teal: Funktion und Orientierung

- Light: `#0891B2`
- Dark: `#06B6D4`
- Keyboard-Focus-Ringe.
- Links und funktionale Navigation.
- Progress und Status, sofern nicht semantisch anders belegt.
- Hover von sekundaeren/Outline/Ghost Actions.
- Inaktive Tabs duerfen bei Hover Cyan anzeigen, aktive Tabs bleiben Gold.

Merksatz: **Gold = ausgewaehlt oder wichtigste Aktion. Cyan = funktionale Orientierung.**

## Buttons

- `Button` ohne Variant ist die primaere CTA und wird Gold/Amber dargestellt.
- Pro Abschnitt nach Moeglichkeit nur eine visuell dominante primaere CTA.
- `outline` fuer sekundaere Aktionen. Neutral im Ruhezustand, Cyan bei Hover/Focus.
- `secondary` fuer untergeordnete gefuellte Aktionen.
- `ghost` fuer tertiaere Aktionen.
- `destructive` bleibt rot und wird niemals durch Brand-Gold ersetzt.
- Keine lokalen `bg-yellow-*`, `bg-blue-*` oder Hex-Hardcodes fuer Standardaktionen.

## Tabs

- Aktiver Tab: `bg-accent text-accent-foreground border-accent`.
- Inaktiver Tab: neutral.
- Hover auf inaktiven Tabs: dezentes Cyan/Teal.
- Focus: sichtbarer Cyan/Teal-Ring.
- Aktive Tabs duerfen auf Hover nicht in eine andere Markenrolle wechseln.

## Forms

- Label immer oberhalb des Controls.
- Input, Textarea und Select haben im Ruhezustand einen sichtbaren 1px-Rahmen.
- Placeholder darf nicht als einziges Label dienen.
- Selects, Inputs und Textareas verwenden dieselbe Border-, Hover- und Focus-Hierarchie.
- Invalid und Disabled States muessen ohne Farbverwechslung erkennbar bleiben.

## Cards und Panels

- Cards nur fuer echte Hierarchie verwenden.
- Standard-Panel: dunkle Surface, subtil sichtbarer Border, sehr zurueckhaltender Shadow.
- Keine Neon-Glows oder zufaelligen Gradient-Effekte.
- Goldene Outlines nur fuer bewusst hervorgehobene Premium-/Achievement-Zustaende.

## Umsetzung

Vor lokalen Styles zuerst die bestehenden Primitives pruefen:

- `src/components/ui/button.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/styles/globals.css`

Wenn eine Regel fuer mehrere Screens gelten soll, wird zuerst das passende Primitive oder Theme-Token angepasst. Keine CharacterEditor-spezifischen Farb-Hardcodes fuer allgemeine Designsystem-Regeln.

## Accessibility

- WCAG AA Kontrast fuer Text und Controls.
- Focus ist immer sichtbar und darf nicht nur ueber Farbe kommuniziert werden.
- Tastaturbedienung der Radix-Primitives erhalten.
- Disabled, invalid, selected und focus muessen voneinander unterscheidbar bleiben.
