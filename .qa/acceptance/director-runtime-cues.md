# Acceptance — director-runtime-cues (#375)

## Intent
Production/Director domain separate from gameplay. Automatic Mode maps session events to cues; manual override always wins.

## Acceptance
- [x] Director domain independent of React/media SDK/gameplay rules
- [x] auto cue mapping deterministic + unit tested
- [x] manual override precedence deterministic (wins during cooldown)
- [x] director-only cannot mutate gameplay (`assertDirectorCannotMutateGameplay`)
- [x] program revision updates via cue → programPresentation
- [x] test-gate green

## Out of scope (#376)
Full Director Control Room UI.
