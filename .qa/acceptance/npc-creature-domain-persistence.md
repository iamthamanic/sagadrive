# Feature: NPC/creature domain persistence

<!-- refined by implement for issue #196 -->

Issue: #196 · Slug: `npc-creature-domain-persistence` · Depends on: #195

## Intent
SagaDrive erhält eine #94-konforme fachliche und persistente Grundlage für NPC-/Kreaturen-Definitionen, getrennt von Session-Instanzen. Typisierte Domain-Verträge, owner-/world-scoped RLS, Infrastructure-Repository und fail-closed Validierung — ohne Library-UI und ohne Legacy-D&D-`npcs`/`bestiary` als Source of Truth.

## Preconditions
- Power framework (#195) on main: `src/domains/rules/sagadrive/npc-creature-power/**`
- Design: `.qa/design/npc-creatures-v1-ux.md` (definition vs instance, categories, compact/full)
- World-profile auth helpers from migration 015 (`current_user_can_read/edit_world_profile`)
- No live Supabase required for the offline contract script

## Happy Path
- [x] Domain models definition: category, sheetMode compact|full, level, derived Machtgrad, combatProfile, combatRole, scope personal|world, ownership
- [x] Use-case contracts for create/read/update/archive/restore; validation fail-closed
- [x] Migration `021_npc_creature_definitions.sql` + RLS owner/world patterns; anon revoked; payload_version; no hard DELETE
- [x] Migration registered in `scripts/apply-migrations.sh`
- [x] Infrastructure mapper + repository + service: JWT session owner, trusted world id arg, no client-invented `owner_user_id`
- [x] Derived benchmarks via power framework helpers
- [x] Contract check wired into `scripts/test-gate.mjs`
- [x] Composition-gate proof CLEAR (domain → infra → DB)

## Edge Cases
- [x] Personal vs world scope binding enforced (CHECK + policy + repository filters)
- [x] Archive (soft-delete) instead of hard DELETE so future instances can still resolve
- [x] Noncombat forces/validates Standard role; invalid category/level/profile rejected
- [x] Payload cannot smuggle id/scope; identity columns immutable via trigger
- [x] Legacy D&D fields are not SoT; legacy `npcs`/`bestiary` edges untouched

## Regression
- [x] `architecture-boundary-check` / typed-strict via test-gate
- [x] Existing npc-creature-power-framework-check stays green

## Security Coverage

| Item | Coverage |
|------|----------|
| Owner-scoped data stays owner-scoped | Personal writes filter `owner_user_id = auth.uid()`; owner never from draft |
| World scope enforced server-side | World writes use trusted `worldProfileId` + RLS edit helper |
| No client-controlled identity | id/scope/owner/world assigned or filtered by repository; payload strips identity |
| Input validation at trust boundary | `validateNpcCreatureDefinition` + parse fail-closed before INSERT/UPDATE |
| Archive not hard-delete | Status transitions only; no DELETE policy |
| Cross-tenant fail-closed | Pure policy + repository `.eq` filters; offline attack tests |
| Anon denied | `REVOKE ALL … FROM anon` |

## Assumptions
- Client + RLS repository pattern (same as item definitions) — no new Edge function required for owner CRUD
- Core/builtin NPC packs are out of scope for this table (personal/world only in V1)
- Session instances remain a later ticket

## Screenshots
Not applicable — no UI in this ticket.

## Composition Gate
- HEAD_SHA: 3929d3769f0af36789ca2e3cb9992315eccb605e
- BASE_SHA: e222563f24ae31b32c6f8cafd792ef6c34a87a9d
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-npc-creature-domain-persistence.md`
- Proof: `.qa/runs/composition-gate-npc-creature-domain-persistence.md`
- Skip reason: n/a

## Implementation Notes
- Domain: `src/domains/npc-creature/**`
- Infra: `src/infrastructure/npc-creature/**`
- Migration: `supabase/migrations/021_npc_creature_definitions.sql`
- Gate: `scripts/npc-creature-domain-persistence-check.mjs`
