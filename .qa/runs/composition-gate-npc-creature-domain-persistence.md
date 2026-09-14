# Composition Gate — npc-creature-domain-persistence

- HEAD_SHA: WORKTREE
- Date: 2026-09-14
- Verdict: CLEAR
- Feature: #196 `npc-creature-domain-persistence`

## Event

A signed-in author creates, updates, archives, or restores an NPC/creature definition (personal or world-scoped); a later consumer (library/service) lists or resolves that definition by id.

## Hop chain

Trusted auth context (`getAuthenticatedUserId` + world id method arg)
→ domain policy / validation (`canCreateNpcCreatureDefinition` / `canMutateNpcCreatureDefinition` / `validateNpcCreatureDefinition` / `parseNpcCreatureDefinition` / `deriveNpcCreaturePower`)
→ infrastructure repository (`supabase-npc-creature.repository` + persistence mapper)
→ table `npc_creature_definitions` + RLS (owner / world helpers) + immutability triggers
→ read path (list/get; archived still selectable)

(No UI hop yet — domain→infra→DB is the multi-hop surface for this ticket.)

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | Each create yields one row with session owner / trusted world; N users never share Personal rows | Owner from session; world from method arg; id = `scope:uuid` | pass |
| invalid / missing | Unknown category/level/noncombat+boss / cross-owner / cross-world fail closed | validate + parse + policy + owner/world `.eq` filters + RLS | pass |
| 2 consumers / crash | Authoring lists hide archived; lookup by id still resolves; no hard DELETE stranding future instances | archive/restore status only; no DELETE policy | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (multi-hop persistence + visibility without UI)
