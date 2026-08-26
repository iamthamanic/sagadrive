# SagaDrive Character Editor Core – Verification Status

> Stand: 26. August 2026  
> Branch: `feat/sagadrive-character-editor-core`  
> Acceptance: `.qa/acceptance/sagadrive-character-editor-core.md`

## Implemented scope

- SagaDrive-Core-only new-character flow with eight tabs: Info, Hintergrund, Werte, Fertigkeiten, Fähigkeiten, Look, Inventar, Notizen.
- RuleHelp tooltips for rule-specific concepts and derived values.
- SagaDrive terminology: Wesenart, Gebunden, Ausdauer, Verstand, Wahrnehmung.
- Start attributes constrained to the Core standard array `4,3,3,2,2,1`.
- All 18 Core skills with source-aware allocation, 10 total start points, 7 free points, minimum six trained skills and level-1 cap 3.
- Mechanical background fields: four-skill pool, two trainings, specialization, milieu access, contact, complication and additional communication form.
- Archetype rank-I core ability derived automatically; arbitrary starter Fireball/free-form ability creation removed.
- Inventory changed from 30 fixed slots to load-based Core handling with `5 + 2 × Stärke` carrying capacity and overload consequences.
- SagaDrive profile, skills and notes added to persistence; legacy CON/INT/WIS values normalize to Ausdauer/Verstand/Wahrnehmung on read.
- Existing look/avatar controls retained and explicitly marked cosmetic.

## Static verification performed

- Compared the feature branch against `main`; changes are scoped to Character Editor/ruleset/persistence/tests/docs plus the acceptance artifact.
- Checked the current Character Library consumer: it does not depend on the removed CON/INT/WIS view-model keys.
- Checked the existing tooltip primitive is reused; no new UI dependency was added.
- Reviewed the Core creation contract against `docs/sagadrive core rules.md` and corrected the additional communication form to be required before save.
- Preserved D&D fields in the shared data contract for backward compatibility while removing D&D from the active new-character UI.
- Touched TypeScript files introduce no `any`, `@ts-ignore`, `@ts-nocheck`, or equivalent type-system escape hatch.

## Executable gate status

`npm run test-gate`, TypeScript/build execution and Playwright could not be executed in the available runner:

1. The working container does not have this repository mounted.
2. Attempting to clone the feature branch from GitHub fails because outbound GitHub access/DNS is unavailable in the runner.
3. GitHub Actions is configured for pushes/PRs, but commits produced through the connected GitHub app did not create a workflow run for this branch, so no remote CI job exists to inspect.

Therefore this document does **not** claim `test-gate`, build, or Playwright as passed.

## Remaining verification when an executable checkout is available

Run in order:

```bash
npm ci
npm run test-gate
npm run test:e2e
```

Then inspect the Character Editor at desktop and mobile widths, with special attention to:

- tab wrapping/legibility,
- tooltip hover/focus/tap behavior,
- archetype + essence combinations such as Kämpfer + Mental,
- background completion validation,
- skill point/cap validation,
- live derived values,
- inventory overload states,
- save/reload of `sagadrive_profile`, `skills`, inventory and notes.

## Known intentional limitation

The Core rules define the framework for powers and require a first essence manifestation, but the repository does not yet contain a binding catalog of rank-I essence manifestations. The editor therefore shows the chosen essence and explicitly defers that manifestation instead of inventing placeholder powers. This should be the next rules/content slice before the Character Editor can claim a completely closed level-1 creation flow.
