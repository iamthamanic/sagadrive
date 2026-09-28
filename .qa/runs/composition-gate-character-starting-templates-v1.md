# Composition Gate — character-starting-templates-v1

- HEAD_SHA: f3b96b0ded6cb4db8c2ef45a92f49457403742c4
- Date: 2026-09-28
- Verdict: CLEAR

## Event

Ten species-neutral Level-1 start builds are authored as a static domain catalog
matching #465. Future Create-flow (#464) resolves a template key to mechanical
fields only.

## Hop chain

Static source (`starting-templates/catalog.ts`) →
`validateSagaDriveStartingTemplate` / `validateSagaDriveStartingTemplateCatalog`
(attr + skill validators) → `scripts/character-starting-templates-v1-check.mjs`
(test-gate). No persist hop; no UI apply in this PR.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Same ten keys for every consumer | `SAGA_DRIVE_STARTING_TEMPLATE_KEYS` + frozen catalog list | pass |
| Invalid/missing | Cap-3 / attr / bg-spec failures fail closed | `isValidSagaDriveBaseAttributeDistribution`, `isValidStartSkillBuild`, `isValidSagaDriveSkillDevelopment` | pass |
| Two consumers | Check script and future #464 UI read the same catalog | Barrel export via `sagadrive/starting-templates` | pass |

## Flags

None.

## Skip reason

n/a — producer→consumer path exists (catalog → validators → check).
