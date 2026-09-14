# Composition Gate — npc-creature-domain-persistence

- HEAD_SHA: 3929d3769f0af36789ca2e3cb9992315eccb605e
- BASE_SHA: e222563f24ae31b32c6f8cafd792ef6c34a87a9d
- Date: 2026-09-14
- Verdict: CLEAR

## Event

A signed-in author creates, updates, archives, or restores an NPC/creature definition (personal or world-scoped); a later consumer (library/service) lists or resolves that definition by id.

## Hop chain

1. Trusted auth context (`getAuthenticatedUserId` + world id method arg)
2. Domain policy/validation (`canCreate` / `canMutate` / `validate` / `parse` / `deriveNpcCreaturePower`)
3. Infrastructure repository (`supabase-npc-creature.repository` + persistence mapper)
4. Table `npc_creature_definitions` + RLS (owner / world helpers) + immutability triggers
5. Read path (list/get; archived still selectable)

Cardinality: one definition row per create; archive/restore flips status only (no hard DELETE).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each create yields one row with session owner / trusted world; N users never share Personal rows | Owner from session; world from method arg; id = `scope:uuid` | pass |
| Invalid/missing | Unknown category/level/noncombat+boss / cross-owner / cross-world fail closed | validate + parse + policy + owner/world `.eq` filters + RLS | pass |
| Two consumers / crash | Authoring lists hide archived; lookup by id still resolves; no hard DELETE stranding future instances | archive/restore status only; no DELETE policy | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |
