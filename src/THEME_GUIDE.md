# 🎨 SagaDrive - Corporate Identity Guide

## Overview

SagaDrive verwendet eine **moderne, saubere Corporate Identity** basierend auf dem offiziellen Logo mit **Türkis (Teal)** und **Gold (Amber)** als Hauptfarben.

---

## 🎨 Farbpalette

### Light Mode (Sauberes Weiß)

| Element | Farbe | Hex | Verwendung |
|---------|-------|-----|------------|
| **Background** | Reines Weiß | `#FFFFFF` | Haupthintergrund |
| **Card** | Weiß | `#FFFFFF` | Cards, Panels |
| **Foreground** | Slate-900 | `#0F172A` | Text |
| **Primary** | Türkis/Cyan-600 | `#0891B2` | Primary Buttons, aktive Navigation |
| **Accent** | Gold/Amber | `#E8A641` | Highlights, besondere Features, Hover |
| **Muted** | Slate-50 | `#F8FAFC` | Gedämpfte Hintergründe |
| **Border** | Slate-200 | `#E2E8F0` | Borders |

### Dark Mode (Modernes Dunkel)

| Element | Farbe | Hex | Verwendung |
|---------|-------|-----|------------|
| **Background** | Slate-900 | `#0F172A` | Haupthintergrund |
| **Card** | Slate-800 | `#1E293B` | Cards, Panels |
| **Foreground** | Slate-100 | `#F1F5F9` | Text |
| **Primary** | Cyan-500 | `#06B6D4` | Primary Buttons, aktive Navigation |
| **Accent** | Amber-500 | `#F59E0B` | Highlights, besondere Features |
| **Muted** | Slate-800 | `#1E293B` | Gedämpfte Elemente |
| **Border** | Slate-700 | `#334155` | Borders |

---

## 🌈 CI-Strategie

### Warum Cyan + Gold?

1. **Logo-Konformität**: Beide Farben stammen direkt aus dem offiziellen SagaDrive-Logo
2. **Klare Rollen**:
   - **Cyan (#0891B2)**: Funktionale Aktionen – Buttons, Tabs, Call-to-Actions
   - **Gold (#E8A641)**: Emotionale Akzente – Text-Highlights, Outlines, Hover-States
3. **Emotionale Wirkung**:
   - **Cyan**: Modernität, Klarheit, Vertrauen, Interaktivität
   - **Gold**: Storytelling, Premium, Erfolg, Abenteuer
4. **Differenzierung**: Hebt sich von typischen dunklen Gaming-UIs ab
5. **Enterprise-tauglich**: Professionell genug für ernsthafte Creator
6. **Accessibility**: Hohe Kontraste, WCAG 2.1 AA-konform

### Farbverwendung in der UI (NEUE BALANCE)

| UI-Element | Light Mode | Dark Mode | Verwendung |
|------------|------------|-----------|------------|
| **Buttons** | Cyan `#0891B2` | Cyan `#06B6D4` | Primary Buttons, Call-to-Actions |
| **Button Hover** | Gold `#E8A641` | Amber `#F59E0B` | Button Hover States |
| **Active Tabs** | Cyan | Cyan | Aktiver Tab im Tab-System |
| **Tab Hover** | Gold | Amber | Tab Hover States |
| **Text Highlights** | Gold | Amber | Wichtige Textstellen, Labels |
| **Outlines/Borders** | Gold | Amber | Achievement-Frames, Premium-Cards |
| **Navigation Hover** | Gold | Amber | Sidebar-Item Hover |
| **Special Badges** | Gold Outline | Amber Outline | Level-Badges, Achievements |
| **Cards** | Weiß mit Border | Slate-800 | Standard Content Cards |
| **Progress Bars** | Cyan Fill | Cyan Fill | Task Progress |

---

## 🖋️ Typografie

### Schriftarten

```css
/* Body & Headings */
font-family: 'Darker Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Headings (h1-h6) */
font-weight: 700; /* Bold for hierarchy */
letter-spacing: -0.01em; /* Tight tracking for modern look */
```

**Darker Grotesque**: Moderne Grotesque-Schrift (sans-serif)
- Exzellente Lesbarkeit auf allen Screens
- Moderner, tech-affiner Charakter
- Perfekt für RPG-Tools & digitale Plattformen
- Variable weights (400-900) für flexible Hierarchien
- Tight letter-spacing für zeitgemäßes Design
- Sans-serif passt besser zu App-Interfaces als Serif

---

## 🎭 Design-Prinzipien

### 1. **Sauber & Modern**
- Viel Weißraum (Light Mode) / klare Struktur (Dark Mode)
- Klare Hierarchien
- Minimalistisches Interface mit Fantasy-Akzenten

### 2. **Accessibility First**
- Hoher Kontrast zwischen Text und Hintergrund
- Mindestens 4.5:1 Kontrastverhältnis (WCAG AA)
- Ausreichende Schriftgrößen (16px base)
- Touch-optimierte Targets (min. 44x44px)

### 3. **Modern RPG Platform**
- Sans-Serif Grotesque für professionelle Tool-Ästhetik
- Cyan-Buttons für klare Interaktions-Hierarchie
- Gold-Akzente für emotionale Momente & Premium-Features
- Balance zwischen funktional (Cyan) und emotional (Gold)

### 4. **Mobile-First**
- Bottom Navigation
- Touch-optimierte Controls
- Responsive Breakpoints
- Safe-area Support

---

## 🛠️ CSS-Variablen

Alle Theme-Farben sind als CSS-Variablen definiert:

```css
/* Light Mode */
:root {
  --background: #FFFFFF;
  --foreground: #0F172A;
  --primary: #0891B2;      /* Türkis */
  --accent: #E8A641;       /* Gold */
  /* ... */
}

/* Dark Mode */
.dark {
  --background: #0F172A;
  --foreground: #F1F5F9;
  --primary: #06B6D4;      /* Helleres Türkis */
  --accent: #F59E0B;       /* Helleres Gold */
  /* ... */
}
```

### Verwendung in Components:

```tsx
// Tailwind CSS
<div className="bg-background text-foreground">
  <Button className="bg-primary hover:bg-accent">
    Primary Action
  </Button>
</div>

// Inline CSS
<div style={{ backgroundColor: 'var(--primary)' }}>
  Content
</div>
```

---

## 🎨 Spezial-Effekte

### Subtile Textur

```css
/* Türkis-basierte Kreuz-Textur */
background-image: 
  repeating-linear-gradient(0deg, ...),
  repeating-linear-gradient(90deg, ...);
```

### Modern Shadows

```css
/* Weiche Schatten mit Türkis-Tint */
.ink-shadow {
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(8, 145, 178, 0.08);
}
```

### Custom Scrollbar

```css
/* Themed Scrollbar */
::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
  border-radius: 6px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--primary);
}
```

---

## 🎯 Component-Spezifische Guidelines

### Buttons (NEUE STRATEGIE)
- **Primary (Cyan)**: `bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground`
- **Secondary**: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- **Outline Gold**: `border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground`

### Tabs (NEUE STRATEGIE)
- **Active Tab**: `border-b-2 border-primary text-primary`
- **Tab Hover**: `hover:border-accent hover:text-accent`
- **Inactive Tab**: `text-muted-foreground hover:text-accent`

### Cards
- **Standard**: `bg-card text-card-foreground border-border`
- **Highlighted**: `border-primary/20 hover:border-primary/40`
- **Premium (Gold)**: `border-2 border-accent/50 hover:border-accent`

### Navigation
- **Active**: `bg-primary/10 text-primary border-l-4 border-primary`
- **Hover**: `hover:bg-accent/10 hover:text-accent hover:border-l-4 hover:border-accent`

### Badges & Text Highlights
- **Level (Gold Outline)**: `border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground`
- **Status (Cyan)**: `bg-primary/10 text-primary border-primary/20`
- **Gold Text**: Use `.gold-text` utility class

---

## 🌓 Theme Switching

User können zwischen Hell/Dunkel wechseln:

```tsx
import { useTheme } from './lib/theme-provider';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️ Hell' : '🌙 Dunkel'}
    </button>
  );
}
```

**Location:** Profil & Einstellungen → Darstellung

---

## 🎯 Best Practices

### DO ✅
- **Buttons & Tabs**: Verwende `bg-primary` (Cyan) für alle interaktiven Elemente
- **Hover States**: Wechsle zu Gold (`hover:bg-accent`) für visuelles Feedback
- **Text-Highlights**: Verwende `.gold-text` oder `text-accent` für wichtige Labels
- **Outlines**: Verwende `.gold-outline` für Premium-Cards & Achievements
- **Hierarchie**: Verwende font-weights (400-900) statt unterschiedliche Fonts
- Teste beide Themes (Hell/Dunkel)
- Nutze semantische Farben (`primary`, `accent`, `destructive`)
- **Merke**: Cyan = Funktion, Gold = Emotion

### DON'T ❌
- ❌ Keine Gold-Buttons für Standard-Aktionen (nur Cyan)
- ❌ Keine zufälligen blauen/grünen Töne außerhalb der CI
- ❌ Keine CSS-Farben außerhalb des Systems
- ❌ Keine zu kleinen Schriftgrößen (<14px)
- ❌ Keine zu geringe Kontraste
- ❌ Nicht zu viel Gold (sparsam für emotionale Momente)
- ❌ Keine Serif-Fonts außerhalb von Logo/Branding

---

## 📱 Responsive Considerations

Das Theme ist **vollständig responsive**:

- ✅ Mobile: Touch-optimierte Größen, Bottom Navigation
- ✅ Tablet: Flexible Layouts
- ✅ Desktop: Sidebar + Content
- ✅ 4K: Skaliert perfekt

---

## 🔧 Customization

### Eigene Farbe hinzufügen:

1. **In `/styles/globals.css`:**
```css
:root {
  --my-custom-color: #A0826D;
}

@theme inline {
  --color-my-custom: var(--my-custom-color);
}
```

2. **In Tailwind verwenden:**
```tsx
<div className="bg-my-custom text-white">
  Custom Color!
</div>
```

---

## 🎨 Color Psychology & Usage Strategy

### Cyan (Primary) – Funktionale Rolle
- **Bedeutung**: Klarheit, Interaktivität, Vertrauen, Modernität
- **Use Cases**: 
  - ✅ Alle Buttons (Primary Actions)
  - ✅ Aktive Tabs
  - ✅ Progress Bars
  - ✅ Active Navigation States
- **Gefühl**: Professionell, klickbar, zuverlässig

### Gold (Accent) – Emotionale Rolle
- **Bedeutung**: Premium, Erfolg, Abenteuer, Wertigkeit
- **Use Cases**: 
  - ✅ Hover States (Buttons, Tabs, Links)
  - ✅ Text-Highlights (wichtige Labels)
  - ✅ Outlines (Achievement-Badges, Premium-Cards)
  - ✅ Special Features (Level-System, Unlocks)
- **Gefühl**: Warm, besonders, belohnend

---

## 🚀 Performance

**Optimierungen:**
- ✅ CSS-Variablen (keine JS-Berechnungen)
- ✅ Subtile Texturen (keine großen Images)
- ✅ System-Fonts als Fallback
- ✅ Lazy-loaded Google Fonts
- ✅ Optimierte Schatten (wenige Layers)

---

## 📊 Accessibility Checklist

- ✅ Kontrast Text/Hintergrund: 4.5:1+ (AA)
- ✅ Große Texte: 3:1+ (AA)
- ✅ Touch Targets: 44x44px minimum
- ✅ Focus States: Sichtbarer Ring mit `--ring`
- ✅ Color Blind Safe: Nicht nur Farbe für Information
- ✅ Dark Mode: Reduzierte Helligkeit für Augen

---

## 📚 References

- **Fonts:** [Google Fonts - Darker Grotesque](https://fonts.google.com/specimen/Darker+Grotesque)
- **Colors:** [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- **Accessibility:** [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 🎨 Quick Reference: Neue Farb-Balance

```
┌─────────────────────────────────────────────────────┐
│                 CYAN (#0891B2)                      │
│  ✓ Buttons (Primary Actions)                        │
│  ✓ Aktive Tabs                                      │
│  ✓ Progress Bars                                    │
│  ✓ Call-to-Actions                                  │
│  → Bedeutung: "KLICK MICH" / Funktional             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 GOLD (#E8A641)                      │
│  ✓ Hover States (Buttons, Tabs, Links)             │
│  ✓ Text-Highlights (wichtige Labels)               │
│  ✓ Outlines (Achievements, Premium-Cards)          │
│  ✓ Special Features (Level-Badges)                 │
│  → Bedeutung: "SCHAU HER" / Emotional              │
└─────────────────────────────────────────────────────┘

BEISPIEL:
<Button className="bg-primary hover:bg-accent">
  Cyan → Gold on Hover ✨
</Button>
```

---

## 🆕 Migration Notes (v2.0 - Oktober 2025)

### Font Migration
- **OLD**: Cinzel (Headings) + Quattrocento (Body) – Serif-Fonts für Fantasy-Feeling
- **NEW**: Darker Grotesque (All) – Moderne Grotesque für professionelle Tool-Ästhetik

### Color Balance Migration
- **OLD**: Türkis für alles (Buttons, Tabs, Hover), Gold für Badges
- **NEW**: Cyan für Buttons/Tabs, Gold für Hover/Text/Outlines

### Rationale
- Sans-Serif passt besser zu digitalen RPG-Tools als Fantasy-Serifs
- Klare Farbrollen verbessern UX (Cyan = "Klick mich", Gold = "Schau her")
- Moderner, weniger "old-school Fantasy", mehr "contemporary RPG platform"

---

## 🛠️ Custom Utility Classes (Quick Reference)

```css
/* Text & Outline */
.gold-text              /* Text in Gold/Amber */
.gold-outline           /* 1px Gold border */
.gold-outline-thick     /* 2px Gold border */
.gold-glow              /* Gold shadow effect */

/* Buttons & Tabs */
.cyan-button            /* Cyan background button */
.cyan-button:hover      /* Hover → Gold */
.cyan-tab-active        /* Active tab with cyan border */

/* Achievements */
.achievement-badge      /* Gold outline badge */
.achievement-badge:hover /* Gold filled on hover */

/* Shadows */
.ink-shadow             /* Modern shadow with cyan tint */
.parchment-card         /* Subtle gradient card effect */
```

**Usage Example:**
```tsx
<div className="gold-outline p-4 hover:gold-glow">
  <h3 className="gold-text">Achievement Unlocked!</h3>
  <Button className="cyan-button">Claim Reward</Button>
</div>
```

---

**Designed with 🎨 for SagaDrive - Where Stories Come to Life** ✨🎭🎲
