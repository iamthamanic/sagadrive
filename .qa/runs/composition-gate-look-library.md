# Composition Gate — look-library

- HEAD_SHA: df328f763bdf5e1d2ab1a59bfa501e4f25ea9f76
- BASE_SHA: 28f6ff94adab6a3083243117b671b9b4e7fe93f2
- Date: 2026-09-27
- Verdict: CLEAR

## Event
Authenticated user opens Bibliothek › Looks, browses owner-scoped LookProfiles, and optionally navigates to canonical create/edit routes or triggers duplicate/archive mutations.

## Hop chain
1. `Library` Looks tab mounts `LookLibraryBrowser` (lazy, visit-gated)
2. `useLookLibrary` → `listLookProfiles` (infrastructure look-service) → Supabase RLS owner list
3. Domain `filterLookLibraryCatalog` filters client-side (search/status/source)
4. Mutate CTAs only when `canMutate` / `canMutateLooks`:
   - Create/Edit → History routes `/looks/create` | `/looks/:id` (stub screens; no in-list editor state machine)
   - Duplicate/Archive → look-service → repository → reload catalog
5. UI labels from domain helpers (`lookStatusLabel`, `lookStyleFamilyLabel`)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | Each user sees only own Looks via RLS; no cross-tenant cards | list via service + RLS; no direct table access from app | pass |
| invalid / missing | Load fail → Error + retry; empty catalog → Empty; missing preview → Fallback; archive/duplicate fail → Error + toast; `canMutate=false` hides mutate CTAs | browser states + hook guards | pass |
| 2 consumers / crash | Concurrent duplicate/archive: each call is discrete write; reload token refreshes list; no shared mutable singleton catalog | hook requestId + reloadToken; service per-call | pass |

## Flags
None.

## Skip reason
n/a
