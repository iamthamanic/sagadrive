# Composition Gate — item-domain-taxonomy-provenance

- Date: 2026-09-06
- Verdict: CLEAR
- Feature: #134 `item-domain-taxonomy-provenance`

## Event

A catalog consumer resolves an `ItemDefinition` (Core list/get, or inventory-v2 re-export) that carries taxonomy/provenance metadata filled by the items domain.

## Hop chain

Definition author / Core static catalog → `normalizeItemDefinition` (items domain) → `ItemDefinition` public API (`domains/items` or inventory-v2 re-export) → Inventory v2 instance/slot consumers (definitionId lookup only; no slot/stack/equip semantics change)

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | Every Core definition surfaces with `origin=core-archetype` and a kindKey | Module-load normalize in `core-catalog.ts`; shared via list/get/records | pass |
| invalid / missing | Unknown taxonomy tags never accepted; legacy defs without tags still resolve | `validateItemDefinitionMetadata` fail-closed; normalize fills kindKey/origin only | pass |
| 2 consumers / crash | Inventory v2 and items barrel see the same definition shape | Compatibility re-export of `ItemDefinition` from inventory-v2 types/index | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (definition consume hop; no new persistence/UI side effects)
