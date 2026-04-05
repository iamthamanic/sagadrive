# AGENTS.md - MakeMySaga Self-Host

## Identity
- **Name:** MakeMySaga Agent
- **Purpose:** Backend + Frontend Integration Agent
- **Focus:** Self-Hosted TTRPG Platform

## Project Context
- **Repository:** https://github.com/iamthamanic/Makemysaga
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
│                     MakeMySaga Frontend                         │
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

### Design Principles

1. **Consistent Color Scheme**
   - Primary: `#3B82F6` (Blue)
   - Secondary: `#10B981` (Green)
   - Danger: `#EF4444` (Red)
   - Background: `#0F172A` (Dark)
   - Surface: `#1E293B` (Dark Surface)

2. **Typography**
   - Headings: `Inter` or `Plus Jakarta Sans`
   - Body: `Inter`
   - Code: `JetBrains Mono`

3. **Spacing**
   - Base unit: `4px`
   - Small: `8px`
   - Medium: `16px`
   - Large: `24px`
   - XLarge: `32px`

4. **Border Radius**
   - Buttons: `6px`
   - Cards: `8px`
   - Modals: `12px`

5. **Shadows**
   - Small: `0 1px 2px rgba(0,0,0,0.05)`
   - Medium: `0 4px 6px rgba(0,0,0,0.1)`
   - Large: `0 10px 15px rgba(0,0,0,0.15)`

### Component Patterns

1. **CharacterEditor** (Primary UI)
   - Card-based layout
   - Tab navigation (Details, Appearance, Attributes, Background)
   - Real-time validation
   - Portrait upload
   - Attribute sliders

2. **Dashboard** (Navigation Hub)
   - Project cards
   - Quick actions
   - Recent sessions
   - Notifications

3. **Forms**
   - Label above input
   - Error messages below input
   - Required fields marked with `*`
   - Help text in smaller font below

4. **Tables**
   - Sortable columns
   - Search/filter
   - Pagination
   - Row actions (edit, delete, view)

5. **Modals**
   - Overlay with backdrop blur
   - Close button (X) top-right
   - Title with separator
   - Actions at bottom

### Responsive Design

1. **Mobile First**
   - Single column on mobile
   - Two columns on tablet
   - Three columns on desktop

2. **Breakpoints**
   - Mobile: `< 640px`
   - Tablet: `640px - 1024px`
   - Desktop: `> 1024px`

3. **Touch Targets**
   - Minimum `44px` height
   - Minimum `44px` width

### Accessibility

1. **ARIA Labels**
   - All interactive elements labeled
   - Screen reader support
   - Keyboard navigation

2. **Color Contrast**
   - WCAG AA minimum
   - Text: `4.5:1`
   - UI: `3:1`

3. **Focus States**
   - Visible focus ring
   - Tab order logical
   - Skip links

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

**Primary:** MakeMySaga Rulesets (Custom)
**Supplement:** Open5e API (D&D 5e SRD)

```typescript
// Use MakeMySaga ruleset as primary
const { data: mmsRuleset } = await supabase
  .from('rulesets')
  .select('*')
  .eq('id', 'mms-custom')
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
1. Primary: MakeMySaga custom rules
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