# Composition Gate — validate-gear-resources-load

- HEAD_SHA: 5c39559493ba93520f172dc4d7940974a6ef127d
- BASE_SHA: d3d05cbc6ad73ad77f0b4a43d089aea614c356c7
- Date: 2026-09-20
- Note: Proof covers branch tip at commit-pr time (SHA field = parent+this commit after amend-free ship)
- Note: SHA stamped after babysit E2E/Select-0 fix (hop chain unchanged)
- Verdict: CLEAR

## Event
Character abstract resources (0–5) and inventory add affordability decisions persist through save/load and gate catalog adds.

## Hop chain
1. UI (`InventorySummaryBar` / affordability dialog) mutates `CharacterAbstractResources.current`
2. `CharacterEditor` save → `UpdateCharacterDto.abstractResources`
3. `serializeCharacterAbstractResources` → `characters.resources` JSONB (`sagadriveAbstract`)
4. `parseCharacterAbstractResources` → `CharacterVm.abstractResources` → editor hydrate
5. Catalog add: `resolveAffordability` → optional −1 on purchase → same persist path

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Owner-scoped character row only; no cross-owner resources write | CLEAR |
| Invalid/missing | Missing JSONB → default current=3; invalid levels clamped 0–5 | CLEAR |
| Concurrent consumers | Editor + save share one state; last write wins on character row | CLEAR |
| Gift override | Gift never debits resources; purchase only when cost===resources | CLEAR |
| Cost under resources | Free add; resources unchanged | CLEAR |

## Flags
None.
