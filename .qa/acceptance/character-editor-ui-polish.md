# Feature: Character Editor UI Polish

## Intent
Der Character Editor soll wie eine hochwertige SagaDrive-Produktoberflaeche wirken. Besonders Dropdowns und Form Controls muessen auch im Ruhezustand klar als interaktive Eingabeflaechen erkennbar sein, ohne den bestehenden Dark-/Light-Theme- und Radix/shadcn-Stil zu brechen.

## Preconditions
- Der bestehende CharacterEditor-Flow, Avatar-State und Save-Verhalten bleiben funktional unveraendert.
- Bestehende Radix/shadcn-Primitives werden weiterverwendet; keine neue UI-Bibliothek wird eingefuehrt.
- Die bestehende SagaDrive-Farbwelt und responsive Struktur bleiben erhalten.

## Happy Path
- [ ] Select-Trigger besitzen auch ohne Hover/Focus einen sichtbaren, kontrastreichen 1px-Rahmen und eine klar abgegrenzte Surface.
- [ ] Input, Textarea und Select wirken im CharacterEditor wie ein konsistentes Control-System mit einheitlicher Hoehe, Radius, Border-, Hover- und Focus-Hierarchie.
- [ ] Die Info-Ansicht hat klarere Feldgruppen und visuelle Hierarchie, ohne zusaetzliche Klicks oder neue Produktlogik.
- [ ] Tabs, Karten und Abschnittsabstaende wirken ruhiger und professioneller; aktive Zustande bleiben eindeutig.
- [ ] Desktop und Mobile behalten vollstaendige Bedienbarkeit, sichtbare Keyboard-Focus-States und mindestens 44px hohe Haupt-Controls.

## Edge Cases
- [ ] Placeholder-Zustaende sind genauso klar umrandet wie ausgewaehlte Select-Werte.
- [ ] Disabled/invalid/focus Zustande bleiben unterscheidbar und werden nicht vom neuen Border-Styling ueberschrieben.
- [ ] Lange Select-Werte bleiben einzeilig und schneiden kontrolliert ab.
- [ ] Der Custom-Setting-Input passt sich ohne Layout-Sprung in die bestehende Grid-Struktur ein.
- [ ] Keine Aenderung an Character-Persistenz, Avatar-Runtime, Uploads oder Supabase-Aufrufen.

## Regression
- [ ] Bestehende Tabs und Formularwerte funktionieren unveraendert.
- [ ] Kein neues Dependency und keine globale Theme-Umschaltung.
- [ ] CharacterEditor bleibt mit der bestehenden mobilen Einspaltenansicht nutzbar.

## Screenshots
Browser-Verifikation gegen den vom Nutzer gelieferten CharacterEditor-Screenshot erforderlich.

## Implementation Notes
Pending.
