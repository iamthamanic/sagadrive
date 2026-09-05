# Composition Gate — catalog-persistence

- HEAD_SHA: 73f47e40d80f0498fc0ec2266a78513124f546cb
- BASE_SHA: 6fbed35ca2f0423815a888bcdaac9194822cbe86
- Date: 2026-09-05
- Verdict: CLEAR

## Event

A signed-in user opens a character's inventory: the catalog must show exactly the items that character may own — Core always, the World of the character's effective profile, and the user's own Personal definitions — and every item the character already owns must keep rendering even after its definition was archived.

## Hop chain

Client (`loadCharacterItemCatalog(characterId, userId)`) → `supabase-item-catalog.repository` (`resolveEffectiveWorldProfileId` reads `characters.world_profile_id` + `projects.world_profile_id`; `listCatalogRecords` reads RLS-filtered rows; writes go through `assertWritablePayload`) → `catalog.ts` (pure `resolveEffectiveWorldProfileId` applies precedence; `selectCatalogDefinitions` filters active+visible for Add; `createDefinitionLookup` keeps archived for owned instances) → consumers: the Add/Catalog surface (#110/#112) and the inventory renderer via `ItemDefinitionLookup` (#109/#110).

Enforcement hops before any row reaches the client: migration 015 RLS + SECURITY DEFINER helpers; `enforce_world_profile_binding_ownership` on `projects`/`characters.world_profile_id`; `ON DELETE RESTRICT` on definition→world FK; `WorldProfileService.deleteWorldProfile` refuses early when definitions still reference the world.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | User A in World A sees Core + World A + A's Personal; the same call for User B in World B sees a disjoint World/Personal set; an unbound character sees Core + Personal only | `resolveEffectiveWorldProfileId` yields the profile; `isDefinitionVisible` matches World on exact `worldProfileId` and Personal on exact `ownerUserId`; `selectCatalogDefinitions` drops non-matching scopes. RLS independently returns only rows the user may read, so a client that skips the domain filter still cannot see another world/user | pass (test groups 1–3, 7) |
| Invalid/missing | A corrupt payload, an unknown type, an out-of-range load/cost, a world/personal record without its profile/owner, or a payload trying to override identity never becomes a *different* valid catalog entry | `parseItemDefinition` returns `null` for unreadable rows (one missing item, not a failed catalog), clamps/drops out-of-contract values, and takes `id`/`scope` from columns not payload; `isDefinitionVisible` returns false for a world record with no profile and a personal record with no owner; blank/whitespace ids resolve to null, never to a default world (`silent-fallback` closed); writes refuse invalid drafts via `assertWritablePayload` before INSERT/UPDATE | pass (test groups 1, 7, 8) |
| Two consumers / crash | The Add surface and the owned-instance renderer must never disagree about what exists, and archiving must not strand an owned item; world delete must not cascade-wipe definitions | Both consumers read the same `records` array; Add uses `selectCatalogDefinitions` (active only), renderer uses `createDefinitionLookup` (visible, archived included). There is no DELETE policy; FK is `ON DELETE RESTRICT`; `deleteWorldProfile` refuses while definitions remain; identity columns are immutable by trigger | pass (test group 5, 9) |
| authorization | A player may read their adventure's World items but must never write another owner's World definition; binding `projects`/`characters.world_profile_id` must not become a grant to read another owner's World catalog | Read helper admits owner OR adventure GM OR active member; write helper admits owner only. Insert/update RLS bind World writes to the write helper; Personal owner comes from `getAuthenticatedUserId()`, never client input. Both helpers REVOKE from PUBLIC/anon and GRANT EXECUTE to authenticated. Binding triggers call `current_user_can_edit_world_profile` before INSERT/UPDATE OF world_profile_id | pass (test groups 6, 9) |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `reinterpret:` | blocker | client filter vs RLS | The repository's `.eq/.or` predicates look like the access control, so a reviewer reading only the adapter would assume a client-side filter is the gate. In fact RLS in migration 015 is the gate and the predicates only shrink the payload — the two must agree or the client shows less than RLS allows (never more). | done — every predicate mirrors an RLS policy; documented on the repository and asserted in test group 9 |
| `silent-fallback:` | blocker | resolution → catalog | A blank/empty `world_profile_id` could have been treated as "some default world" and leaked World items to an unbound character. | done — `normalizeId` maps empty/whitespace to null, so an unbound character gets Core + Personal only; asserted in test groups 1, 7 |
| `cardinality:` | flag | add surface vs renderer | Two consumers could diverge on archived items: Add hides them, the renderer must keep them. Implementing them independently would drift. | done — one `records` array, two documented projections (`selectCatalogDefinitions` active-only vs `createDefinitionLookup` archived-included); asserted in test group 5 |
| `identity:` | flag | payload → definition | Identity taken from the payload would let a Personal row present itself as a World entry, or a rename strand an owned instance. | done — `id`/`scope` come from columns; `parseItemDefinition` ignores payload `id`/`scope`; identity columns immutable by trigger; asserted in test groups 8, 9 |
| `divergent-copy:` | note | read vs write authority | Read authority (owner + adventure GM + active members) is intentionally wider than write authority (owner only). That asymmetry is correct but easy to "fix" into symmetry later, which would either leak writes or hide reads. | done — the asymmetry is documented on the migration and in the acceptance artifact and asserted in test group 6 |
| `identity:` | blocker | world_profiles DELETE → catalog rows → owned instances | `world_profile_id … ON DELETE CASCADE` hard-deleted every World definition when a world profile was deleted, bypassing the deliberate absence of a DELETE policy (FK cascades run as table owner) and permanently stranding owned instances. | done — `ON DELETE RESTRICT`; `deleteWorldProfile` refuses early with a German message when definitions still reference the world |
| `authz-grant:` | blocker | projects.world_profile_id UPDATE → read helper → SELECT | A GM could set `projects.world_profile_id` to any world (no column check) and then `current_user_can_read_world_profile` granted the GM and every active member SELECT on another user's World definitions — a client-writable row becoming an authorization grant. | done — `enforce_world_profile_binding_ownership` trigger on projects and characters requires edit authority before the binding sticks |
| `silent-fallback:` | flag | updateDefinition → payload column → mapDefinitionRow | `updateDefinition` wrote the draft first and only validated afterwards; a rejected payload left a previously valid definition permanently unreadable while the caller saw a generic save error. | done — `assertWritablePayload` runs `parseItemDefinition` before the UPDATE/INSERT |
| `note` | note | resolution → world_profiles | `projects.world_id` and `public.worlds` (legacy V3) are unrelated to `world_profiles` and are deliberately not touched; resolution uses only the new `world_profile_id` links. | done — documented in acceptance Assumptions |

No worker, outbox, queue, cron, webhook or mail path exists in this diff, so P-06 does not apply. The two SECURITY DEFINER helpers set `search_path = public` and are REVOKE/GRANT-scoped to `authenticated`.

## Skip reason

n/a — the diff has a real producer→consumer path (repository reads rows, catalog policy projects them, two consumers render), and a cross-hop enforcement path (RLS + helpers + binding triggers + world-delete guard), so the gate was run rather than skipped.
