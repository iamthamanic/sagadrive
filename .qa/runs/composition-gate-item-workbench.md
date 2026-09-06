# Composition Gate — item-workbench

- HEAD_SHA: da892612d03cc3dc84d32f4b076d19084b8a3317
- Date: 2026-09-06
- Verdict: CLEAR

## Event

User creates or opens an ItemDefinition on `/items/create` or `/items/:id`, saves/forks/archives through the catalog facade, and navigates with dirty-guard.

## Hop chain

Shell route (#133) → `ItemWorkbenchScreen` / `useItemEditor` → form draft (`workbenchForm`) → `item-catalog-service` (`getItemDefinitionById` / create / update / fork / archive) → repository + RLS (#136) → domain normalize/validate (#134) + mechanical rules already enforced on write (#135/#136) → toast + URL replace to `/items/:id` · dirty via `setNavigationBlocker`

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One signed-in author | Personal owner from session; World via editable profiles + RLS | pass |
| invalid / missing | Fail closed, keep draft | Save/load errors surface + Retry; no silent navigation reset | pass |
| 2 consumers | Workbench + Library catalog | Both read same catalog facade; Core/builtin local read-only; fork always new id | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (UI → facade → RLS/local catalogs → identity-preserving fork/save → shell navigate)
