# Composition Gate — npc-creature-library-browser

- HEAD_SHA: PLACEHOLDER_HEAD_UPDATE_AFTER_COMMIT
- BASE_SHA: 9224ce86b250feb1aaf5035440229812a4983df2
- Date: 2026-09-14
- Verdict: CLEAR

## Event

User opens `Bibliothek → NPCs & Kreaturen`, searches/filters definition records, opens a read-only Statblock, or taps the create stub CTA.

## Hop chain

1. Library tab compose (`Library.tsx` lazy visit) → `NpcCreatureLibraryBrowser` / `useNpcCreatureLibrary`
2. Infrastructure facade `listNpcCreatureDefinitions` → repository → `npc_creature_definitions` + RLS
3. Domain pure `filterNpcCreatureLibraryCatalog` / `deriveNpcCreaturePower` (`computeCompactStatblockBenchmarks`)
4. `EntityBrowser` / `EntityBrowserCard` render + `NpcCreatureStatblockView` dialog
5. Create CTA stub toast (creator journey reserved for #198)

Cardinality: one catalog list per visit; open Statblock is read-only (no write hop).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each signed-in user sees only RLS-visible Personal/World definitions | list via session + RLS; filter is UX only | pass |
| Invalid/missing | Catalog load failure or empty/filter miss stays inside browser | Error+Retry; empty CTA; filter reset | pass |
| Two consumers / crash | Library shell + npc-creatures slice; Characters/Items tabs unaffected | Lazy mount; no shared mutable catalog state | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |
