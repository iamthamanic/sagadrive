# Composition Gate — sagadrive-item-rules-kernel

- BASE_SHA: `df9ad549fb256829df0774df0bc84799847eb0f8`
- HEAD_SHA: PENDING_COMMIT
- Date: 2026-09-06
- Verdict: CLEAR
- Feature: #135 `sagadrive-item-rules-kernel`

## Event

A catalog or workbench consumer validates item mechanical fields (load/cost/protection/minStr/traits) or reads Traglast / tool check outcomes from the SagaDrive items rules kernel before inventory ownership or UI rendering.

## Hop chain

Definition author / Core static catalog → `validateItemMechanicalRules` / `carryCapacity` / `resolveToolCheckOutcome` (`domains/rules/sagadrive/items`) → public rules barrel + Inventory v2 compatibility re-exports (`ItemLoad`/`carryCapacity`) → Inventory consumers / derived-stats (no persistence or UI side effects in this slice)

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors / N-actors | One validation call yields one typed result; Core list of 36 shares the same validators | Shared rules module; Core freeze asserts identical mechanical values | pass |
| invalid / missing / Invalid/missing | Bad load/cost/Schutz-MS pair / unknown Core traits fail closed; narrative load+cost-only still valid | `parse*` / `validateItemMechanicalRules` / `validateCoreCatalogTraits` | pass |
| 2 consumers / Two consumers / crash | Rules barrel, inventory re-export, and derived-stats see the same Traglast formula | `carryCapacity` owned once; inventory re-exports; derived-stats imports helper | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (rules→inventory/derived-stats consume hop; no new persistence/UI side effects)
