# Composition Gate — item-world-catalog-module

- HEAD_SHA: PLACEHOLDER
- BASE_SHA: PLACEHOLDER
- Date: 2026-09-06
- Verdict: CLEAR

## Event

A world editor persists `item-catalog` module config; a pure resolver computes the effective ItemDefinition set (packs ∪ includes − excludes ∪ world ∪ personal? ∪ Core) for later Character Inventory consumption (#143).

## Hop chain

WorldProfileEditorDialog → `WorldItemCatalogModuleSection` / `useItemWorldAvailability` → modules JSONB (`item-catalog`) via existing worldProfile.service normalize → domain `normalizeItemCatalogModuleConfig` + `resolveWorldItemCatalog` (packs from #137, Core from inventory-v2) → exported resolver for #143 (not wired to inventory add-catalog yet)

Cardinality: one module config write per save; resolver is pure (N consumers read same meaning).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Fantasy Basic + Adventure + Survival + Smartphone include − torch exclude yield unique defs + Core 36 | `resolveWorldItemCatalog` stress path in `item-world-catalog-check` | pass |
| Invalid/missing | Unknown pack/def ids preserved; bad shapes coerce with diagnosis; Core exclude ignored | normalize preserves unknowns; resolver diagnoses ignored Core excludes | pass |
| Two consumers / crash | Inventory catalog (#112 authoring) and module availability UI coexist; inventory effectiveWorldProfileId untouched until #143 | Separate sections `Gegenstände & Ausrüstung` vs `Ausrüstung & Gegenstände`; no inventory consumption wire | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR
