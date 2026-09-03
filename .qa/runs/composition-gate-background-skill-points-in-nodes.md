# Composition Gate Proof — Background skill points in pool nodes

- HEAD_SHA: 0d17f8b725e5170e3bc8fcc1a67ad57107f7d902
- BASE_SHA: f5195acef1eda9a9ea08f07c7816900fb6b92ca9
- Verdict: CLEAR

## Event

Editor UI interaction: distributing the 2 stackable background skill points on SagaDrive pool skills (`CharacterBackgroundPanel` / `BackgroundSkillNode`).

## Hop chain

UI (`src/app/character/creation/CharacterBackgroundPanel.tsx`) → existing `onBackgroundSkillPointsChange` / `adjustBackgroundSkillPoints` helpers → character editor state → existing save path (`characterService` / persistence). No new worker, queue, webhook, mail, or migration. Domain invariants for the 2-point budget remain in the rules kernel / prior V2 persistence.

## Simulations

- N-actors: unchanged owner-scoped character save; no multi-tenant write path added.
- Invalid/missing: + disabled when budget full or skill already at 2; − disabled at 0; central V2 persistence still fail-closed on save.
- Two consumers / crash: single UI hop; no secondary rules engine; specialization unlock still requires full 2-point spend.

## Flags

None. No new dependencies, no rule-value changes, no schema changes.
