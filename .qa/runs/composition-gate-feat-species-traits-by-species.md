# Composition Gate — feat-species-traits-by-species

- HEAD_SHA: fc0d38d7ed8bfb3e000e3ddcef0af61381bdafd9
- BASE_SHA: 65e2483d4b99dd84eb529064afc0cf8bddf23b9a
- Date: 2026-08-27
- Verdict: CLEAR

## Event

A user selects a SagaDrive species, chooses exactly three points of species-specific traits, fills required trait details, optionally defines an Alien species profile, and saves the character.

## Hop chain

1. `SpeciesCarousel` sends the selected Core species to `CharacterEditor.applyRacePreset`.
2. `CharacterEditor` filters any existing trait selection to the new species allowlist and removes details for traits that are no longer retained.
3. `SpeciesTraitsPanel` renders only the selected species allowlist, enforces the three-point UI budget, exposes required per-trait detail inputs, and requires an Alien profile name in the Alien builder. `Außergewöhnlicher Körperbau` is rendered but disabled.
4. `CharacterEditor.handleSaveCharacter` independently validates exactly `3 / 3`, the current species allowlist, trait availability, required detail fields, and the Alien profile name before persistence.
5. The validated state is assembled as `SagaDriveProfileDto`: `speciesTraits`, structured `speciesTraitDetails`, and optional `speciesProfile`.
6. `characterService.createCharacter` passes the profile through `normalizeSagaDriveProfile`; invalid trait keys are dropped, detail keys are restricted to known trait keys, values are trimmed, and an Alien profile without a name is not normalized as a valid profile.
7. The normalized object is written to the existing `characters.sagadrive_profile` JSONB column through the configured Supabase client.
8. Reads pass the same stored JSONB through `mapToViewModel` and `normalizeSagaDriveProfile`, so structured trait details and the Alien profile are normalized consistently on load.

No worker, queue, webhook, mailer, or secondary consumer is introduced by this change. No schema migration is required because the existing `sagadrive_profile` field is JSONB.

## Simulations

| Case | Intended | Composed | Result |
|---|---|---|---|
| N-actors | Multiple users can independently build and save characters with different species/profile data. | Each authenticated save uses the existing owner-scoped character path and writes only that character row; species state remains inside that row's `sagadrive_profile`. | CLEAR |
| Invalid/missing | Missing points, over-budget choices, missing required details, missing Alien name, disallowed traits, or disabled `Außergewöhnlicher Körperbau` must not become a valid saved build. | UI prevents over-budget/disabled selection; save validation fails closed for incomplete or invalid combinations before `createCharacter`; service normalization drops unknown trait/detail keys as a second boundary. | CLEAR |
| Two consumers / crash | The change must not create duplicated downstream effects or partially distributed species data. | There is one existing client-to-character-service insert path and no fan-out/worker consumer. Species traits, details, and Alien profile are persisted together inside the same JSONB payload. A failed insert does not have a second side-effect path to reconcile. | CLEAR |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|---|---|---|---|---|
| — | — | — | no open composition flags | done |

## Notes

- Species changes retain only traits that remain legal for the newly selected species.
- Ruleset reset explicitly clears the trait selection instead of reusing the previous species state.
- `Erweitertes Klettern` and `Erweitertes Schwimmen` replace the ambiguous former combined trait and rely on the Core movement rule documented in `docs/sagadrive core rules.md`.
- Legacy stored key `climb-or-swim` is intentionally not guessed into climbing or swimming during normalization because the old value does not contain enough information to determine which movement form was intended safely.
