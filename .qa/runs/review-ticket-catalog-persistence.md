## Verdict
ACCEPT

## Scope
- Acceptance slug: catalog-persistence
- BASE_SHA..HEAD_SHA: 6fbed35..ebe3612
- Files reviewed: 10 (domain catalog + core seed, infra repository/persistence/service, migration 015, check script, acceptance, test-gate wire)
- Scope creep: none — no UI, no character inventory-state persistence, no legacy ItemDto migration (those are #108–#113)

## Findings
| Severity | Tag | File | Issue | Action |
|----------|-----|------|-------|--------|
| Low | seclv | migration 015 | `ON DELETE CASCADE` on `inventory_item_definitions.world_profile_id` — if a world profile is hard-deleted, World definitions vanish. Owned instances would then fail to resolve those ids. Documented assumption is that worlds are archived not deleted; no DELETE policy on definitions themselves. | note later — #114 / world-lifecycle ticket should confirm world profiles are never hard-deleted |
| Low | brooks | core-catalog.ts | Seed has 11 representative Core entries; full catalog is #108. Correct handoff, but Add surfaces will look thin until #108 lands. | note later — intentional, documented in acceptance Assumptions |
| Info | dijkstra | repository | Client `.or()` predicates duplicate RLS; documented as payload-shrink only. Test group 9 asserts the mirror. | done |
| Info | hoare | catalog.ts | `parseItemDefinition` returns null on corrupt rows (one missing item) instead of failing the catalog — fail-soft at the trust boundary. | done |

## Subagent
Bugbot: skipped (rate-limit on Task dispatch; static review covered edge cases via inventory-catalog-check groups 1–9)
Security: static review this session (rate-limit on `@review-security` Task). Covered: SECURITY DEFINER `search_path`, REVOKE/GRANT, owner from `getAuthenticatedUserId()`, UUID assert before PostgREST `.or()` interpolation, identity-from-columns, no DELETE policy, immutability triggers. No Critical/Important findings.
Composition-gate: CLEAR — HEAD ebe3612 — proof `.qa/runs/composition-gate-catalog-persistence.md`

## Secure-by-Default Coverage (AGENTS.md Non-Negotiables)
| Property | Coverage |
|----------|----------|
| Owner-scoped data | Personal definitions RLS `owner_user_id = auth.uid()`; repository derives owner from session |
| World scope server-side | RLS + helpers; client filters mirror only |
| World write = owner | `current_user_can_edit_world_profile` |
| World read wider (intentional) | adventure GM + active members — documented + asserted |
| Input validation | `parseItemDefinition` + `assertUuid` |
| No hard delete of definitions | no DELETE policy; archive only |
| Identity immutable | trigger `trg_inventory_item_definitions_no_retarget` |

## Empfehlung
Proceed to @ecc-check / @commit-pr-safe (test-gate PASS 2026-09-05; composition CLEAR; AgentShield A)
