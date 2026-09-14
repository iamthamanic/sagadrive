# Design: NPCs & Kreaturen V1 — UI/UX

<!-- finalized with user on 2026-09-14 -->

## Intent
SagaDrive erhält innerhalb der bestehenden Bibliothek einen neuen Bereich **NPCs & Kreaturen**. Nutzer sollen gewöhnliche NPCs/Kreaturen in wenigen Schritten als kompakten Statblock anlegen können, ohne den vollständigen CharacterEditor durchlaufen zu müssen. Gleichzeitig bleibt jede Figur grundsätzlich zu einem vollständigen spielbaren Charakter ausbaubar.

## Information Architecture

Library tabs, exact order:

```text
Charaktere | NPCs & Kreaturen | Abenteuer | Welten | Items
```

Die äußere Bibliothek-/Sidebar-Struktur bleibt unverändert. Der neue Bereich nutzt den bestehenden `EntityBrowser`-Ansatz und die kanonischen SagaDrive-UI-Primitives.

## User-facing terminology
- `compact` wird in der UI **Statblock** genannt.
- `full` wird in der UI **Charakterbogen** genannt.
- Interne Begriffe dürfen `compact/full` bleiben.
- `Standard / Elite / Boss` heißt in der UI **Kampfrolle** und beschreibt nicht erzählerische Wichtigkeit.
- Level 1–20 bleibt **Stufe**.
- Level-Band heißt für NPC/Kreaturen **Machtgrad**:
  - 1–4 Gering
  - 5–8 Mittel
  - 9–12 Hoch
  - 13–16 Extrem
  - 17–20 Legendär

## Library Browser

Header:
- Titel: `NPCs & Kreaturen`
- Primary CTA: `+ Neu`
- Suche nach Name, Typ, Tag

Primary filter row:
- `Alle`
- `NPCs`
- `Kreaturen`

Secondary filters:
- Welt
- Kategorie
- Stufe/Machtgrad
- Kampfrolle
- Darstellung: Statblock / Charakterbogen
- Quelle: Core / Pack / Welt / Eigen

V1 categories:
- NPC
- Tier
- Kreatur
- Konstrukt
- Untot
- Geist
- Sonstige

Freie Tags ergänzen Kategorien; keine umfangreiche feste Taxonomie in V1.

### Card/list metadata
Jede Card zeigt in klarer Hierarchie:
1. Portrait/Thumbnail
2. Name
3. Kategorie
4. `Stufe N · Machtgrad X`
5. falls Statblock: `Standard|Elite|Boss · <Kampfprofil>` oder `Nichtkämpferisch`
6. `Statblock` oder `Charakterbogen`
7. Quelle/Welt nur sekundär

Row/card actions:
- Öffnen
- Bearbeiten
- Duplizieren
- Zur Welt hinzufügen, wenn relevant
- Bei generischer Vorlage: `Charakter daraus erstellen`
- Bei konkretem Statblock: `Als vollständigen Charakter ausbauen`
- Bei Full NPC: `Spieler zuweisen`, wenn in Kampagnenkontext verfügbar

## Empty state
Text: `Noch keine NPCs oder Kreaturen angelegt.`
Primary CTA: `Erste Figur erstellen`
Secondary help: erklärt kurz, dass ein Statblock für schnelle GM-Nutzung gedacht ist und später zu einem Charakterbogen ausgebaut werden kann.

## Create Flow

### Step 1 — Was möchtest du erstellen?
Two large selectable cards:
- **NPC** — Personen und individuelle Figuren
- **Kreatur** — Tiere, Monster, Konstrukte und andere Wesen

`Weiter` erst aktiv nach Auswahl. Keine Dropdown-first UI.

### Step 2 — Wie möchtest du starten?
Default selected:
- **Schnell erstellen** — kompakter spielbereiter Statblock

Alternative:
- **Vollständiger Charakter** — kompletter SagaDrive-Charakterbogen

Vollständiger Charakter routet in den bestehenden CharacterEditor/Creation Flow und setzt die Rolle/Quelle passend, statt einen zweiten Full-Editor zu bauen.

### Quick Create minimum
Required:
- Name
- Kategorie
- Stufe 1–20
- Kampfprofil: Nichtkämpferisch / Ausgewogen / Zäh / Offensiv / Mobil / Fernkampf / Kontrolle & Support
- Kampfrolle: Standard / Elite / Boss, außer Nichtkämpferisch defaultet/verbirgt Standard
- Welt/Quelle optional

Beside/under level show derived Machtgrad automatically.

Primary CTA: `Erstellen`
Secondary: `Abbrechen`

No raw HP/Defense/skill math in Quick Create.

## Editor

Desktop uses two-column composition:
- left: edit controls
- right: sticky/live Statblock preview

Top structure:
```text
<Name>                                    Speichern
Grundlagen | Werte | Kampf | Details
```

### Grundlagen
- Name
- Portrait
- NPC/Kreatur
- Kategorie
- kurze Beschreibung
- Welt/Quelle
- Stufe + derived Machtgrad
- Kampfrolle
- Kampfprofil

### Werte
Default mode is generated values with compact summary:
`Automatisch aus: Stufe N · <Machtgrad> · <Rolle> · <Profil>`

Action: `Werte manuell anpassen`

Advanced mode exposes:
- sechs Attribute
- relevante Skills only; zero-rank skills not shown by default
- Gesundheit
- Verteidigung
- Körper / Reflex / Geist / Manöver
- Bewegung
- Schutz

When a user overrides a generated value:
- show recommended/generated value beside it
- show warning only when outside allowed/recommended range
- never silently clamp a saved explicit value unless invalid data would result

### Kampf
- primary attacks/actions
- reactions
- signature abilities
- Elite-/Boss-Impulse options only when role requires them
- Boss Wendepunkt only for Boss
- resistances, weaknesses, immunities
- damage tags

### Details
- Sinne
- Verhalten/Taktik
- Loot/Inventory links
- Tags
- Notes
- Relations/lore hooks if existing shared primitives support them

## Live Statblock
The preview is the at-table GM view and must remain concise:
- identity + portrait
- HP / Defense / Protection / Movement
- Körper / Reflex / Geist / Manöver
- six attributes
- only relevant trained skills
- attacks/actions
- signature abilities/passives
- role-specific impulse/wendepunkt blocks when applicable

No full Character Creation history, archetype progression history or zero-value skill noise in Statblock view.

## Promotion / conversion UX

### Generic template -> new character
Action: `Charakter daraus erstellen`
- creates a new character identity from the template
- preserves concept, category/species-like traits, portrait/lore suggestions
- original template remains unchanged
- opens CharacterEditor with unresolved legal choices highlighted

### Concrete statblock -> same identity full
Action: `Als vollständigen Charakter ausbauen`
- same identity remains
- conversion assistant shows which compact values map directly and which require legal character choices
- no silent illegal Full build
- completes in existing CharacterEditor

### Full NPC -> player control
Action in campaign context: `Spieler zuweisen`
- controller changes independently from identity and sheet mode
- temporary controller override must not convert role or duplicate character

## Definition vs Instance
- Library item = reusable definition/template or unique persistent figure definition
- Adventure/session occurrence = instance
- instance owns current HP, conditions, temporary controller and encounter-local state
- changes to a definition must not silently rewrite live instance state

## World Catalog UX
A World module `npc-creature-catalog` mirrors the existing item-catalog mental model:
- Built-in/Core packs
- World-enabled packs
- explicit includes/excludes
- world definitions
- personal definitions where allowed

World UI shows pack toggles and a list of world-owned figures/templates; definitions are referenced, not embedded duplicates.

## Responsive
Follow `AGENTS.md`/THEME_GUIDE:
- Mobile first
- <640 px: single column; preview becomes separate `Vorschau` tab/sheet, no squeezed two-column editor
- 640–1024: one-column editor with collapsible preview or wide split when space permits
- >1024: two-column editor with live sticky preview
- primary and icon-only interactive targets >=44 px

EntityBrowser keeps its established mobile carousel/list behavior where already implemented; do not create a second browser pattern.

## Visual system
Reuse shared UI and canonical SagaDrive tokens:
- Cyan/Teal = active/selected/primary CTA
- Gold/Amber = hover/premium accent
- red only destructive/invalid
- Darker Grotesque UI typography; JetBrains Mono only for dense mechanical data when beneficial
- cards 8–12 px radius; controls 6–8 px
- no local feature-specific color palette

## Accessibility
- WCAG AA contrast
- visible cyan focus ring
- complete keyboard navigation
- labels for all inputs and icon buttons
- selected/disabled/invalid states not color-only
- screen-reader names for tabs, segmented controls, filter actions and row actions
- live generated numbers should not spam screen readers on every keystroke; announce meaningful validation/state changes only

## Loading / error / destructive states
- Skeleton/loading state inside browser/editor region, not whole-app blanking
- repository/load failure offers retry and preserves current tab
- unsaved editor changes warn before destructive navigation
- delete uses confirmation and clearly distinguishes deleting a reusable definition from removing an instance from an adventure
- save failure keeps local form state

## Architecture/UI reuse
- Domain/rules: `src/domains/**`, no React/Supabase
- Persistence/network: `src/infrastructure/**`
- User journeys: `src/app/**`
- shared generic presentation only in `src/shared/ui/**`
- Library uses existing `EntityBrowser`/card primitives rather than a parallel browser
- Full-character editing reuses existing CharacterEditor rather than creating a new one
- no `src/modules/**`, `src/components/**`, generic feature dumping roots or direct Supabase calls from app/domain

## Verification expectations
UI-facing issues require:
- desktop + mobile browser/editor coverage
- keyboard/focus coverage
- empty/loading/error states
- generated values and Advanced overrides
- no regression to existing Library tabs
- visual proof via `verify-ui` before review/PR

## Related design
- `.qa/design/npc-creature-power-framework.md`
- `.qa/design/npc-creature-benchmarks.md`
- `.qa/design/library-entity-browsers.md`
- `src/THEME_GUIDE.md`
- `AGENTS.md`
