# Composition Gate — npc-creature-promotion-controller

- HEAD_SHA: pending
- BASE_SHA: c7c5de0166c739562dd180623478db44629fb05a
- Date: 2026-09-14
- Verdict: CLEAR

## Event

Library promotion CTAs produce an `NpcPromotionPlan` (template→character or compact→full) consumed once by CharacterEditor bootstrap; separately, GM controller assignment writes one row per (project, definition) via SECURITY DEFINER RPC without changing sheet mode or identity.

## Hop chain

NpcCreatureLibraryBrowser (classify + plan) → `setCharacterEditorBootstrap({ kind: 'npc-promotion', plan })` / sessionStorage `sagadrive:npc-promotion` → CharacterEditor hydrate + unresolved banner → (compact-to-full only) `promoteNpcCreatureCompactToFull` → `updateNpcCreatureDefinition` (same id, sheetMode full + fullSheet)

Parallel hop: Assign dialog → `assignNpcCreatureController` → RPC `assign_npc_creature_controller` → `npc_creature_controller_assignments` row (controller only)

Cardinality: one bootstrap plan per navigation; one assignment upsert per GM action; leave-member trigger clears controller at most once per leaving user.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Template→new character, Compact→same id Full, Full→controller assign are orthogonal; N library opens do not retarget another definition's identity | Domain classifiers + preserveIdentity flags; promote uses sourceDefinitionId only | pass |
| Invalid/missing | Illegal compact attrs / non-GM / inactive member / non-full sheet fail closed; no silent Full attrs | `assertFullSheetHasNoSilentIllegalAttributes`, `planNpcControllerAssignment`, RPC membership checks | pass |
| Two consumers / crash | CharacterEditor save and controller RPC do not share mutable sheet state; leave-member clear does not flip sheetMode | Separate tables/paths; trigger only nulls controller_user_id | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR
