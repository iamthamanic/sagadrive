# Composition Gate — item-definition-persistence-security

- HEAD_SHA: WORKTREE
- Date: 2026-09-06
- Verdict: CLEAR
- Feature: #136 `item-definition-persistence-security`

## Event

A signed-in author creates, updates, archives, restores, or forks an ItemDefinition; later a character inventory consumer resolves that definition (including archived) for owned instances.

## Hop chain

Author UI / service call (`item-catalog-service`) → trusted auth context (`getAuthenticatedUserId` + world id arg) → domain policy (`canCreateDefinition` / `canMutateDefinition` / `buildForkedItemDefinitionDraft` / `parseItemDefinition` + `validateItemDefinitionMetadata`) → persist `inventory_item_definitions` (payloadVersion stamped) → RLS → catalog read (`selectCatalogDefinitions` / `createDefinitionLookup`) → inventory instance render

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | Each create/fork yields one new row with session owner / trusted world; N users never share Personal rows | Owner from session; world from method arg; fork always new UUID id | pass |
| invalid / missing | Unknown taxonomy / Core mutate / cross-owner / cross-world fail closed; legacy payload still reads | `validateItemDefinitionMetadata` + `canMutateDefinition` + owner/world `.eq` filters + Core guard | pass |
| 2 consumers / crash | Add catalog hides archived; owned-instance lookup still resolves; no dangling id on archive | `selectCatalogDefinitions` vs `createDefinitionLookup`; no DELETE path | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (multi-hop persistence + visibility consumers)
