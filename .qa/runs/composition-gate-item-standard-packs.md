# Composition Gate — item-standard-packs

- Date: 2026-09-06
- Verdict: CLEAR
- Feature: #137 `item-standard-packs`

## Event

A catalog consumer resolves a builtin-standard `ItemDefinition` via a base or context `ItemPack` (definition id membership only) without mutating Core archetypes or installing marketplace content.

## Hop chain

Static pack data (`domains/items/packs`) → `ItemPack.definitionIds` → `getBuiltinStandardDefinition` / `listBuiltinStandardDefinitions` → optional `basedOnDefinitionId` reference to Core id (snapshot values already copied; no runtime merge) → future world activation / inventory lookup by definition id

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | Fantasy Basic + Adventure + Survival yield Langschwert, Seil, Fackel, Heiltrank ids | Stress fixture `fantasy-adventure`; context packs share definition ids | pass |
| invalid / missing | Context pack with unknown definition id fails build/test | `item-standard-packs-check` resolves every context id against builtin set | pass |
| 2 consumers / crash | Core list and builtin list remain separate catalogs | Core stays 36 `core-archetype`; builtins are `builtin-standard` with distinct ids | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (static content hop; no persistence/UI/marketplace side effects in this slice)
