# Acceptance: character-editor-species-name-chip

## Intent
Show the selected Spezies Wappen and label to the right of the character Name input in the preview CardHeader when a Spezies is selected.

## Happy Path
- Given a Spezies is selected in the editor
- When the preview header Name field is visible
- Then a compact chip with that Spezies’ heraldic banner and German label appears to the right of the Name input
- And changing Spezies updates the chip Wappen and label

## Edge Cases
- Unknown race key: still renders a banner fallback (human) and raw value/label helper output
- Narrow mobile: chip stays shrink-0; Name input remains usable (min-w-0 flex-1)

## Scope
- In: CharacterEditor preview name row, small Spezies chip component, reuse existing banner URLs/labels
- Out: Carousel banner placement, species sketches, save/API changes

## Security Coverage
- F-xx / B-xx / P-xx: N/A — presentational chip from local race options and static assets only

## Implementation Notes
- Added `SelectedSpeciesChip` (banner + label) and rendered it to the right of the Name input in `CharacterEditor` CardHeader when `characterRace` is set.
- Reuses `getSpeciesBannerUrl` and `getCharacterCreationOptionLabel(sagaDriveRaceOptions)`.
