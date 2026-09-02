# AGENTS.md - SagaDrive Self-Host

## Identity
- **Name:** SagaDrive Agent
- **Purpose:** Backend + Frontend Integration Agent
- **Focus:** Self-Hosted TTRPG Platform

## Non-Negotiables
- Security and code reviews **MUST list ALL severities**, including **Low / Info / tech-debt**. Never omit items as “below reporting threshold”, “optional hardening only”, or “not worth listing”. Optional hardening belongs in the findings table as **Severity: Low** (or Info); it may be non-blocking but must remain visible.
- Owner-scoped data stays owner-scoped (RLS + service checks). Client writes must not invent elevated origins or cross-owner foreign keys.

## Project Context
- **Repository:** https://github.com/iamthamanic/sagadrive
- **Branch:** self-host-setup (für Self-Host Backend)
- **Tech Stack:**
  - **Frontend:** React + Vite + TypeScript + Tailwind CSS + Radix UI
  - **Backend:** Supabase Edge Functions (Deno)
  - **Database:** PostgreSQL (Supabase Self-Host)
  - **AI:** Ollama (LLM)
  - **Knowledge Graph:** Neo4j
  - **Cache:** Redis

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SagaDrive Frontend                         │
│                    (React + Vite + TypeScript)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Supabase    │
                    │   (Self-Host) │
                    │   - Auth      │
                    │   - Database  │
                    │   - Storage    │
                    │   - Realtime  │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Edge Function │  │ Edge Function │  │ Edge Function │
│   ai-gm       │  │   lorekeeper   │  │   dm-tools    │
│   (Ollama)    │  │   (Neo4j)      │  │   (Redis)     │
└───────────────┘  └───────────────┘  └───────────────┘
```

## Module Structure

### Frontend Modules
```
src/
├── modules/
│   ├── characters/     # Character management
│   ├── projects/        # Project/Campaign management
│   ├── sessions/        # Session management
│   ├── rulesets/       # Ruleset configuration
│   └── marketplace/     # Template marketplace
├── components/
│   ├── ui/             # Radix UI components
│   ├── CharacterEditor.tsx
│   ├── Dashboard.tsx
│   └── Layout.tsx
├── lib/
│   └── supabase.ts     # Supabase client
└── utils/
    └── supabase/
        └── info.tsx    # Project credentials
```

### Backend Functions
```
supabase/functions/
├── ai-gm/              # AI Game Master
├── dm-tools/           # Dice, Combat, Rules
├── sessions/           # Session Management
├── characters/          # Character CRUD
├── lorekeeper/          # Knowledge Graph
├── world/               # World Management
├── npcs/                # NPC Management
├── bestiary/            # Monster Database
├── spellbook/           # Spell Management
├── items/               # Item Database
├── rulesets/            # Ruleset Configuration (PRIMARY)
├── quests/              # Quest Management
├── marketplace/          # Template Marketplace
├── media/                # Media Upload
└── export/               # Export/Import
```

## UI/UX Rules

### Canonical Design Sources

- `src/THEME_GUIDE.md` is the canonical SagaDrive design-system reference.
- `src/guidelines/Guidelines.md` contains compact AI/Figma-Make generation rules.
- `src/styles/globals.css` and `src/components/ui/` are the technical source of truth.
- Do not introduce local color conventions that conflict with these files.

### Brand Color Roles

1. **Cyan / Teal = selected or most important action**
   - Light: `#0891B2`
   - Dark: `#06B6D4`
   - Primary CTA
   - Active tab / selected segmented control
   - Focus rings, links, navigation, progress/status

2. **Gold / Amber = hover feedback and premium accents**
   - Light: `#E8A641`
   - Dark: `#F59E0B`
   - Hover on primary CTAs and active tabs
   - Hover for secondary, outline and ghost actions
   - Level, achievement, premium accents

3. **Danger**
   - Light: `#EF4444`
   - Dark: `#F87171`
   - Destructive and invalid states only

4. **Surfaces**
   - Background: `#0F172A` in dark mode
   - Surface/Card: `#1E293B` in dark mode
   - Border: `#334155` in dark mode

**Rule:** Cyan = selected or primary action. Gold = hover and premium accent.

### Typography

- UI and headings: `Darker Grotesque`
- Headings: weight 700
- Body/UI: weight 400-600
- Code/data when needed: `JetBrains Mono`
- Do not introduce serif fonts in product UI.

### Spacing

- Base unit: `4px`
- Small: `8px`
- Medium: `16px`
- Large: `24px`
- XLarge: `32px`

### Border Radius

- Buttons/controls: `6-8px`
- Cards: `8-12px`
- Modals: `12px`
- Keep radius hierarchy consistent within a screen.

### Component Patterns

1. **Buttons**
   - Default `Button` is the primary CTA and uses Cyan/Teal; hover uses Gold/Amber.
   - `outline` and `ghost` are secondary/tertiary actions and use Gold on hover.
   - `destructive` remains red.
   - Do not hardcode standard CTA colors in feature components.

2. **Tabs**
   - Active tab is filled Cyan/Teal with `primary-foreground` text.
   - Inactive tabs are neutral.
   - Inactive hover uses Gold/Amber.
   - Active tabs may shift to Gold on hover.
   - Keyboard focus uses Cyan/Teal.

3. **Forms**
   - Label above input.
   - Input, Textarea and Select have a visible border at rest.
   - Error messages below input.
   - Required fields marked with `*` when required by the flow.
   - Help text in smaller muted text below.
   - Important controls should target at least `44px` height.

4. **CharacterEditor**
   - Card-based layout.
   - Tab navigation.
   - Live avatar preview.
   - Real-time validation.
   - Portrait upload/generation.
   - Attribute sliders.
   - General styling comes from shared UI primitives, not CharacterEditor-only overrides.

5. **Dashboard**
   - Project cards.
   - Quick actions.
   - Recent sessions.
   - Notifications.

6. **Tables**
   - Sortable columns.
   - Search/filter.
   - Pagination.
   - Row actions (edit, delete, view).

7. **Modals**
   - Overlay with backdrop blur when appropriate.
   - Close button top-right.
   - Clear title and action hierarchy.

### Responsive Design

1. **Mobile First**
   - Single column on mobile.
   - Two columns on tablet where useful.
   - Three columns on desktop only when content benefits.

2. **Breakpoints**
   - Mobile: `< 640px`
   - Tablet: `640px - 1024px`
   - Desktop: `> 1024px`

3. **Touch Targets**
   - Minimum `44px` height for primary controls.
   - Minimum `44px` width for icon-only primary controls.

### Accessibility

1. **ARIA Labels**
   - All interactive elements labeled.
   - Screen reader support.
   - Keyboard navigation.

2. **Color Contrast**
   - WCAG AA minimum.
   - Text: `4.5:1`.
   - UI boundaries: `3:1` where applicable.

3. **Focus States**
   - Visible Cyan/Teal focus ring.
   - Logical tab order.
   - Selected, focus, disabled and invalid states remain distinguishable.

## Integration Rules

### Frontend → Backend

1. **Supabase Client**
   ```typescript
   // src/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
   const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
   
   export const supabase = createClient(supabaseUrl, supabaseKey);
   ```

2. **Edge Functions**
   ```typescript
   // Call Edge Function
   const { data, error } = await supabase.functions.invoke('ai-gm', {
     body: { sessionId, action, context }
   });
   ```

3. **Database Queries**
   ```typescript
   // Use existing patterns
   const { data, error } = await supabase
     .from('characters')
     .select('*')
     .eq('owner_user_id', userId);
   ```

### Rulesets Integration

**Primary:** SagaDrive Rulesets (Custom)
**Supplement:** Open5e API (D&D 5e SRD)

```typescript
// Use SagaDrive ruleset as primary
const { data: mmsRuleset } = await supabase
  .from('rulesets')
  .select('*')
  .eq('id', 'sagadrive-custom')
  .single();

// Enrich with Open5e data
const open5eSpells = await fetch('https://api.open5e.com/spells/');

// Merge in ruleset function
const ruleset = {
  ...mmsRuleset,
  spells: [...mmsRuleset.spells, ...open5eSpells],
};
```

### State Management

1. **React Query** for server state
2. **Zustand** for client state
3. **React Hook Form** for forms

## Development Workflow

### Before Starting
1. Read `SOUL.md` (who I am)
2. Read `USER.md` (who is Ben)
3. Read `memory/YYYY-MM-DD.md` (recent context)

### When Adding Features
1. Check existing patterns in `src/modules/`
2. Follow module structure (index, hooks, types, services)
3. Use existing UI components from `src/components/ui/`
4. Test with Edge Functions

### When Integrating Backend
1. Update Edge Functions first
2. Update frontend services
3. Update TypeScript types
4. Test end-to-end

### When Adding Rulesets
1. Primary: SagaDrive custom rules
2. Supplement: Open5e API data
3. Merge in `rulesets` function
4. No full replacement

## Testing Checklist

### Frontend
- [ ] Components render correctly
- [ ] Forms validate input
- [ ] Navigation works
- [ ] Responsive on all breakpoints
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

### Backend
- [ ] All Edge Functions respond
- [ ] Health endpoints work
- [ ] CORS headers correct
- [ ] Error handling works
- [ ] JSON responses valid

### Integration
- [ ] Frontend connects to Edge Functions
- [ ] Supabase client works
- [ ] Auth flow works
- [ ] Realtime subscriptions work
- [ ] File uploads work

## Next Steps

### Priority 1: Frontend Integration
1. Update `src/lib/supabase.ts` to point to self-host URL
2. Update Edge Function URLs in services
3. Test character creation flow
4. Test session management

### Priority 2: Rulesets Enhancement
1. Add Open5e integration to `rulesets` function
2. Create merge logic for custom + SRD data
3. Update frontend ruleset service
4. Test ruleset selection

### Priority 3: UI/UX Polish
1. Ensure consistent styling
2. Add loading states
3. Add error boundaries
4. Add success/error toasts