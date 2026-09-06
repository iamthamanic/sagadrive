# Composition Gate — item-library-browser

- HEAD_SHA: WORKTREE
- Date: 2026-09-06
- Verdict: CLEAR

## Event

User opens `Bibliothek → Items`, searches/filters definitions, opens an item or creates a new one via shell URLs.

## Hop chain

Library tab compose → `ItemLibraryBrowser` / `useItemLibrary` → `loadLibraryItemCatalog` (infra) → Core + builtin-standard (local) + `listLibraryPersistedRecords` (RLS) → pure `filterItemLibraryCatalog` → list/grid render → `navigateToItem` / `onNavigate('item-create')` → History routes (#133)

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One signed-in user catalog | RLS scopes Personal/World; Core/builtin local read-only | pass |
| invalid / missing | Catalog load error | Error + Retry; empty search → reset filters | pass |
| 2 consumers | Library compose + Items slice | Library only mounts slice; filters pure in domain | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (UI → facade → RLS/local catalogs → pure filter → shell navigate)
