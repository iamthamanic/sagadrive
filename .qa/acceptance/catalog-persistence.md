# Feature: Inventory v2 — Catalog persistence & effective world-profile resolution

Issue: #107 (Parent: #105, Depends on: #106) · Slug: `catalog-persistence`

## Intent
Authoritative source/resolution layer for Core, World and Personal item
definitions, plus a deterministic effective world profile for a character —
without redesigning Adventure/World ownership. Downstream issues (#108–#114)
consume the catalog through an application/repository boundary and must not
query the table directly.

## Preconditions
- `src/domains/**` stays free of React, Supabase, `/components/`, `/app/` and
  `/infrastructure/` imports (enforced by `scripts/architecture-boundary-check.mjs`).
- `ItemDefinition` / `ItemDefinitionScope` contracts from #106 are consumed unchanged.
- Existing `world_profiles`, `projects`, `characters`, `project_members` and the
  `current_user_is_active_project_member` helper are reused; none is redesigned.
- Before this ticket no column linked a character or an adventure to a world
  profile — the two new nullable `world_profile_id` columns are the minimal adapter.

## Happy Path
- [x] `resolveEffectiveWorldProfileId` applies `adventureWorldProfileId ?? characterWorldProfileId ?? null`; a blank string is treated as unbound.
- [x] The catalog exposes all active Core definitions, active World definitions of the effective profile, and active Personal definitions of the signed-in user — nothing else.
- [x] World and Personal definitions persist with a stable id, scope, ownership, the `ItemDefinition` payload, active/archived status and audit timestamps.
- [x] Updating or archiving a definition never changes its id, scope, owner or world profile (database trigger).
- [x] Archiving removes a definition from the Add catalog while owned instances keep resolving it.
- [x] Core definitions live in the repository as a versioned static source, are read-only at runtime and are invisible to the persistence layer.
- [x] `src/infrastructure/inventory/item-catalog-service.ts` is the boundary the character UI consumes.

## Edge Cases
- [x] A world definition whose `worldProfileId` differs from the effective profile is invisible in both the Add catalog and the owned-instance lookup.
- [x] A character with no effective world profile receives Core + Personal only, never default World definitions.
- [x] A Personal definition of another user is neither listed nor resolvable.
- [x] A record missing its owner (Personal) or its world profile (World) is never visible.
- [x] An archived definition of another world or user stays unresolvable.
- [x] A corrupt or out-of-contract payload degrades to "one missing item" (`parseItemDefinition` returns `null`) instead of failing the whole catalog read.
- [x] A payload cannot override the identity columns — `id` and `scope` come from the columns, so a Personal row cannot present itself as a World entry.
- [x] Non-contract values (unknown type/slots, load/cost/protection out of range, non-text traits, invalid stack limit) are dropped or clamped, and a container always ends up with at least one capacity position.
- [x] Deleting a world profile that still has item definitions is refused (`ON DELETE RESTRICT` + German error in `deleteWorldProfile`); cascade hard-delete is not a removal path.
- [x] Binding `projects.world_profile_id` or `characters.world_profile_id` requires edit authority on that world profile, so a GM cannot point an adventure at another user's world and read its definitions.
- [x] Adventure resolution prefers `characters.project_id` when set, otherwise active `project_members` rows for the character — the join/character-selection path does not sync `characters.project_id`.
- [x] Core definitions are deep-frozen; mutating a returned entry cannot corrupt later catalog loads.

## Regression
- [x] `npm run test-gate` stays green, including the existing inventory-v2 domain, character-editor, presets, background, avatar and rules validations.
- [x] `scripts/architecture-boundary-check.mjs` passes — domain stays pure, infrastructure stays free of React/app imports.

## Security Coverage
`AGENTS.md` Non-Negotiables, applied to this ticket:

| Item | Coverage |
|------|----------|
| Owner-scoped data stays owner-scoped | Personal definitions are readable/writable only for `owner_user_id = auth.uid()`; the owner is derived from the authenticated session in the repository, never from client input. |
| World scope enforced server-side, not only in React | Every filter in the repository is a duplicate of an RLS policy. Read uses `current_user_can_read_world_profile`, write uses `current_user_can_edit_world_profile`. Client filtering alone is never the control. |
| World mutation follows existing world-editor authorization | `current_user_can_edit_world_profile` is the owner model of `world_profiles` (`wp.owner_user_id = auth.uid()`); insert/update policies bind World writes to it. Both helpers `REVOKE ALL ... FROM PUBLIC, anon` and `GRANT EXECUTE ... TO authenticated`. |
| Read authority deliberately wider than write | Adventure GM (`projects.gm_user_id`) and active members (`current_user_is_active_project_member`) may read the world's items — otherwise a player could never see the World items their own adventure runs on. Write stays owner-only. |
| Input validation at trust boundaries | `parseItemDefinition` validates every persisted payload; identity comes from columns; UUIDs are asserted before entering a PostgREST filter string. |
| No hard delete | The table has no DELETE policy; archiving is the only removal path, so an owned `ItemInstance` always resolves its definition. |
| Identity immutability | `id`, `scope`, `owner_user_id`, `world_profile_id` are immutable via `trg_inventory_item_definitions_no_retarget`. |
| World binding is an authorization grant | `trg_projects_world_profile_binding` / `trg_characters_world_profile_binding` reject `world_profile_id` unless `current_user_can_edit_world_profile` — a GM cannot point an adventure at another user's world to read its definitions. |
| No cascade hard-delete of definitions | `inventory_item_definitions.world_profile_id` is `ON DELETE RESTRICT` so deleting a world profile cannot bypass the missing DELETE policy and strand owned instances. |
| Write-path payload validation | `assertWritablePayload` runs `parseItemDefinition` before INSERT/UPDATE so a bad draft cannot turn a previously valid definition into an unresolvable row. |
| All severities reported | `@review-ticket` findings are listed below including Low/Info. |

## Assumptions
- "Adventure" in this issue means `public.projects` (the codebase's campaign entity); there is no separate adventures table.
- `projects.world_id` (legacy V3, unconstrained UUID) and `public.worlds` are unrelated to `world_profiles` and are not touched.
- Core content is the complete 35-entry V1 catalog from #108 (`core-catalog.ts`); this ticket only resolves definitions.
- Persistence of a character's own inventory state and the legacy `ItemDto[]` migration are #109; this ticket only resolves definitions.

## Composition Gate
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-catalog-persistence.md`

## Screenshots
Not applicable — no UI in this ticket; catalog authoring/browsing UI is #110/#112.

## Implementation Notes
| File | Purpose |
|------|---------|
| `supabase/migrations/015_inventory_item_definitions.sql` | Catalog table + RLS + world-profile links + auth helpers + immutability triggers. |
| `src/domains/character/inventory-v2/catalog.ts` | Pure catalog policy: resolution, visibility, Add-catalog selection, owned-instance lookup, payload parsing. |
| `src/domains/character/inventory-v2/core-catalog.ts` | Versioned static Core catalog, read-only at runtime (#108 grows it). |
| `src/domains/character/inventory-v2/index.ts` | Barrel re-exports the catalog + core-catalog API. |
| `src/infrastructure/inventory/item-catalog.persistence.ts` | Row DTO, row→record mapping, payload projection. |
| `src/infrastructure/inventory/supabase-item-catalog.repository.ts` | Supabase adapter: resolution, list, create/update/archive. |
| `src/infrastructure/inventory/item-catalog-service.ts` | Facade the character UI consumes (`loadCharacterItemCatalog`). |
| `scripts/inventory-catalog-check.mjs` | The 7 required tests (pure policy in-process + static persistence contract), wired into `npm run test-gate`. |

- No UI, no character inventory-state persistence and no legacy migration in this diff — those are #108–#113.
