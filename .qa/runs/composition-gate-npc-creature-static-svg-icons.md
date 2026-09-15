# Composition Gate — npc-creature-static-svg-icons

- HEAD_SHA: WORKTREE
- BASE_SHA: b95db171ea8d9b857a406ac0190c6fbf8847f1f4
- Date: 2026-09-15
- Verdict: CLEAR

## Event

Builtin NPC/creature catalog definitions resolve `iconKey` to a static public SVG under `/assets/npc-creatures/{slug}.svg`, displayed as Library card thumbnails. Personal/world definitions without `iconKey` keep initials fallback.

## Hop chain

`buildBuiltinNpcCreature` sets `iconKey` (id dots→hyphens) → domain `buildNpcCreatureIconPublicSrc` → Vite public `/assets/npc-creatures/{slug}.svg` → `NpcCreatureLibraryBrowser` `EntityBrowserCard` `imageUrl` as `<img src>` (never inline SVG). Offline authoring: `scripts/generate-builtin-npc-creature-icons.mjs` + manifest; optional PNG sources gitignored.

Cardinality: one SVG per builtin slug (19). Missing SVG → `onError` initials in EntityBrowserCard.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Shared static assets; no per-user write | Public SVG paths; no Storage/RLS for static icons | pass |
| Invalid/missing | Missing iconKey or 404 SVG → initials | `buildNpcCreatureIconPublicSrc` null / img onError → imageFallback | pass |
| Two consumers / crash | Library cards only for now; regenerating SVGs | Same committed path; sanitize rejects script/foreignObject | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (multi-hop: domain iconKey → public SVG → library UI)
