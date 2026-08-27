# Composition Gate — species resistance dropdown

- HEAD_SHA: 61962f5ab37b7a2ea793d07501363572f361a1d1
- BASE_SHA: 65e2483d4b99dd84eb529064afc0cf8bddf23b9a
- Date: 2026-08-27
- Verdict: CLEAR

## Event
User selects the SagaDrive species trait `Enge Resistenz`, chooses one Core hazard type from the dropdown, and saves the character.

## Hop chain
`SpeciesTraitsPanel` renders the fixed Core hazard catalog from `speciesResistanceHazards.ts` and writes the selected stable hazard key through `onTraitDetailChange` → `CharacterEditor` stores that key in `speciesTraitDetails['narrow-resistance']` and requires a non-empty detail for the selected trait → `handleSaveCharacter` copies the structured trait details into `sagadrive_profile` → `characterService.createCharacter` normalizes and persists the profile in the existing `characters.sagadrive_profile` JSONB field → `mapToViewModel` restores the structured species-trait detail on read.

No new database column, queue, worker, webhook or external side effect is introduced.

## Simulations
| Case | Intended | Composed | Result |
|---|---|---|---|
| N-actors | Each editor session chooses its own resistance hazard and persists it only with that character. | Selection remains local component/editor state and is included in the existing owner-scoped character insert. | pass |
| Invalid/missing | `Enge Resistenz` without a hazard must not produce a complete character. | The required detail remains empty until a dropdown option is selected; existing species-detail validation blocks save and returns the user to the species tab. | pass |
| Two consumers / crash | Re-rendering or reopening the editor must not generate duplicate writes or side effects. | The dropdown is pure UI state; persistence occurs only through the existing explicit character save path. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|---|---|---|---|---|
| — | — | — | no open flags | done |

## Notes
- `Übernatürliche Veränderungen` is intentionally narrow: bodily/form/nature transformations such as transformation, petrification, supernatural mutation or magical aging. It is not general magic resistance and does not include illusions or mind control.
- The hazard catalog uses stable internal keys while the UI displays German labels.
- The tooltip explains all Core hazard categories and the source-vs-effect distinction (for example, magical fire is still `Hitze / Verbrennung`).
- Browser E2E scopes tooltip assertions to the visible Radix tooltip container to avoid duplicate hidden tooltip nodes in Playwright strict mode.
