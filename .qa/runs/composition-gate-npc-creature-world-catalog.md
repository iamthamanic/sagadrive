# Composition Gate — npc-creature-world-catalog

- HEAD_SHA: (filled at verify)
- BASE_SHA: d4de351271f75a153d557a1af9bfc83d30c86625
- Date: 2026-09-14
- Verdict: CLEAR

## Event

A world editor persists `npc-creature-catalog` module config; a pure resolver computes the effective NpcCreatureDefinition set (packs ∪ includes − excludes ∪ world ∪ personal? ∪ Core) without embedding definition payloads in world modules. World-owned authoring writes definition rows separately.

## Hop chain

WorldProfileEditorDialog → `WorldNpcCreatureCatalogModuleSection` / `useNpcCreatureWorldAvailability` → modules JSONB (`npc-creature-catalog`) via existing worldProfile.service `normalizeWorldModuleConfigMap` → domain `normalizeNpcCreatureCatalogModuleConfig` + `resolveWorldNpcCreatureCatalog` (packs + Core from domain) → optional world defs via `loadWorldProfileNpcCreatureCatalog` → WorldNpcCreatureCatalogSection (CRUD, references only)

Cardinality: one module config write per world save; resolver is pure (N consumers read same meaning). Definitions are not duplicated into modules JSON.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Fantasy Basics + Tiere + explicit include − exclude yield unique defs + Core | `resolveWorldNpcCreatureCatalog` stress path in `npc-creature-world-catalog-check` | pass |
| Invalid/missing | Unknown pack/def ids preserved; bad shapes coerce with diagnosis; Core exclude ignored | normalize preserves unknowns; resolver diagnoses ignored Core excludes | pass |
| Two consumers / crash | item-catalog module UI and npc-creature-catalog UI coexist; neither embeds defs in modules | Separate sections; item-catalog checks remain green; no shared mutable catalog state | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR
