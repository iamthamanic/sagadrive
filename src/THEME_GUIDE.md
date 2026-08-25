# SagaDrive Corporate Identity and UI Theme Guide

## Status

Diese Datei ist die kanonische Designsystem-Referenz fuer SagaDrive. Fuer AI-/Figma-Make-Generierung gilt zusaetzlich `src/guidelines/Guidelines.md`. Die technische Source of Truth sind die Theme-Tokens in `src/styles/globals.css` und die Primitives unter `src/components/ui/`.

## Design Read

SagaDrive ist eine moderne TTRPG-Produktoberflaeche mit dunklen, ruhigen Surfaces und zwei Markenfarben aus dem Logo. Die UI soll professionell und werkzeugartig wirken, nicht wie eine Marketing-Landingpage oder ein generisches Gaming-Dashboard.

## Farbpalette

### Light Mode

| Rolle | Farbe | Hex |
|---|---|---|
| Background | White | `#FFFFFF` |
| Card | White | `#FFFFFF` |
| Foreground | Slate-900 | `#0F172A` |
| Brand Functional | Cyan-600 | `#0891B2` |
| Brand Action / Selection | Gold | `#E8A641` |
| Muted | Slate-50 | `#F8FAFC` |
| Border | Slate-200 | `#E2E8F0` |
| Danger | Red-500 | `#EF4444` |

### Dark Mode

| Rolle | Farbe | Hex |
|---|---|---|
| Background | Slate-900 | `#0F172A` |
| Card | Slate-800 | `#1E293B` |
| Foreground | Slate-100 | `#F1F5F9` |
| Brand Functional | Cyan-500 | `#06B6D4` |
| Brand Action / Selection | Amber-500 | `#F59E0B` |
| Muted | Slate-800 | `#1E293B` |
| Border | Slate-700 | `#334155` |
| Danger | Red-400 | `#F87171` |

## Verbindliche Farbrollen

### Gold / Amber

Gold steht fuer **ausgewaehlt** oder **wichtigste Aktion**.

Verwendung:
- Primaere CTA
- aktiver Tab
- ausgewaehlte Segmented-Control-Option
- Level- und Achievement-Akzente
- bewusst hervorgehobene Premium-Zustaende

Nicht verwenden fuer:
- Destructive Actions
- Disabled States
- normale Links
- reine Focus-Indikation
- zufaellige Dekoration

### Cyan / Teal

Cyan steht fuer **funktionale Orientierung**.

Verwendung:
- Keyboard-Focus-Ringe
- Links
- funktionale Navigation
- Progress und Status
- Hover von sekundaeren, Outline- und Ghost-Actions
- Hover von inaktiven Tabs

### Merksatz

**Gold = ausgewaehlt oder wichtigste Aktion. Cyan = funktionale Orientierung.**

Diese Regel ersetzt die alte Zuordnung, bei der Cyan gleichzeitig fuer primaere CTAs und aktive Tabs verwendet wurde.

## Theme-Tokens

Die vorhandenen Basis-Tokens bleiben bestehen:

```css
:root {
  --primary: #0891B2;
  --primary-foreground: #FFFFFF;
  --accent: #E8A641;
  --accent-foreground: #0F172A;
}

.dark {
  --primary: #06B6D4;
  --primary-foreground: #0F172A;
  --accent: #F59E0B;
  --accent-foreground: #0F172A;
}
```

Semantische Verwendung:
- `primary` = Cyan/Teal, funktionale Interaktion
- `accent` = Gold/Amber, primaere Aktion und aktiver Auswahlzustand

Keine neuen Hex-Hardcodes in Feature-Komponenten, wenn ein semantischer Theme-Token existiert.

## Typografie

SagaDrive verwendet Darker Grotesque fuer UI und Headings.

```css
font-family: 'Darker Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

- Headings: 700
- UI-Labels: 500 bis 600
- Body: 400 bis 500
- Keine zusaetzlichen Serif-Fonts in der Produkt-UI

## Komponentenregeln

### Buttons

Der `Button`-Default ist die primaere CTA.

- Primary CTA: `bg-accent text-accent-foreground hover:bg-accent/90`
- Outline: neutraler Rahmen, Cyan bei Hover/Focus
- Secondary: neutrale gefuellte Surface
- Ghost: neutral, Cyan bei Hover
- Link: Cyan
- Destructive: Rot

`variant="accent"` bleibt fuer bestehende Aufrufer als kompatibler Alias fuer die Gold-CTA erhalten. Neue primaere CTAs sollen den Default-Button verwenden.

Regeln:
- Nach Moeglichkeit eine visuell dominante primaere CTA pro Abschnitt.
- Eine sekundaere Aktion darf nicht dieselbe visuelle Dominanz wie die primaere CTA haben.
- Keine lokalen gelben oder blauen Button-Hardcodes.

### Tabs

- Active: `bg-accent text-accent-foreground border-accent`
- Inactive: neutral
- Inactive Hover: `text-primary`, dezenter Cyan-Hintergrund oder Cyan-Border
- Focus: Cyan-Ring ueber `primary` / `ring`
- Aktiver Tab bleibt beim Hover Gold

Aktive Tabs muessen auf den ersten Blick als Auswahlzustand erkennbar sein und duerfen nicht nur ueber Textfarbe kommuniziert werden.

### Inputs, Textareas und Selects

- Label steht oberhalb des Controls.
- Controls besitzen auch im Ruhezustand einen sichtbaren 1px-Rahmen.
- Standardhoehe wichtiger Controls mindestens 44px, soweit der konkrete Component-Kontext dies vorsieht.
- Hover verstaerkt Border/Surface subtil.
- Focus verwendet Cyan/Teal.
- Invalid bleibt Rot.
- Disabled bleibt neutral und deutlich reduziert.

### Cards und Panels

- Standard: `bg-card text-card-foreground` mit subtil sichtbarem Border.
- Shadow nur zur echten Hierarchie, nicht als Dekoration.
- Keine Neon-Glows auf Standard-Panels.
- Goldene Borders nur fuer Premium-/Achievement-Zustaende.

### Navigation

- Active Navigation: Cyan-orientiert, sofern es sich um Navigation und nicht um einen Auswahl-Tab handelt.
- Hover: dezentes Cyan.
- Tabs sind eine eigene Auswahlkomponente und folgen der Gold-Active-Regel.

## Interaction Hierarchy

```text
Primaere CTA              -> Gold
Aktive Auswahl / Tab      -> Gold
Sekundaere Aktion         -> Neutral / Outline
Sekundaer-Hover           -> Cyan
Link / Navigation         -> Cyan
Focus Ring                -> Cyan
Progress / Status         -> Cyan
Achievement / Level       -> Gold
Destructive               -> Rot
Disabled                  -> Neutral
```

## Accessibility

- Textkontrast mindestens WCAG AA.
- UI-Boundaries und Focus-Indikatoren muessen sichtbar bleiben.
- Selected, focus, disabled und invalid duerfen nicht nur durch denselben Farbwechsel unterschieden werden.
- Radix-Keyboard-Navigation und Focus-Management nicht ueberschreiben.
- Touch Targets fuer wichtige Produktaktionen mindestens 44x44px, sofern die Komponente nicht bewusst kompakt ist.

## Responsive Product UI

- Mobile first.
- Mehrspaltige Editor-Layouts unter 768px auf eine Spalte reduzieren.
- Keine horizontal abgeschnittenen Tabs oder Form Controls.
- Labels und Helper-Text bleiben lesbar und springen nicht in Controls hinein.

## Umsetzung fuer neue Screens

1. Bestehendes Primitive unter `src/components/ui/` pruefen.
2. Theme-Tokens aus `src/styles/globals.css` verwenden.
3. Allgemeine Designsystem-Regeln im Primitive oder Theme loesen, nicht lokal im Feature.
4. `src/guidelines/Guidelines.md` bei AI-/Figma-Make-Generierung beachten.
5. Neue lokale Hex-Farben nur einfuehren, wenn sie eine neue semantische Rolle haben und im Guide dokumentiert werden.

## Do

- Gold fuer primaere CTA und aktive Auswahl verwenden.
- Cyan fuer Focus, Links, Navigation und funktionale Rueckmeldung verwenden.
- Controls mit klarer Affordance bauen.
- Eine ruhige Dark-Product-UI erhalten.
- Light und Dark Mode gemeinsam pruefen.

## Don't

- Cyan und Gold ohne feste Rolle gegeneinander austauschen.
- Aktive Tabs neutral lassen.
- Jede Aktion als Gold-CTA darstellen.
- Destructive oder Invalid States mit Brand-Gold ueberschreiben.
- Feature-spezifische Farb-Hardcodes fuer allgemeine Komponentenregeln einfuehren.
- Neue UI-Libraries neben Radix/shadcn einfuehren, nur um Styling zu loesen.

## Quick Reference

```text
GOLD / AMBER
- Primary CTA
- Active tab
- Selected state
- Achievement / Level

CYAN / TEAL
- Focus
- Links
- Navigation
- Progress / Status
- Secondary hover
```
