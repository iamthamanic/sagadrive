# Composition Gate — avatar-v2-capability-editor (#259)

## Verdict
CLEAR

## HEAD_SHA
1c5ce5585f3437f0eb56b26dec0531a81e8b2dad

## Business event
Avatar appearance controls visibility for a character draft.

## Hop chain
1. Producer: composition axes + morph/rig evidence (domain)
2. Transformer: `resolveEditorSurfacesFromAvatarState` / `resolveAvatarEditorSurfaces`
3. Consumer: CharacterEditor appearance tab (morph/traits/colors)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N=1 Native modular humanoid | morph+traits+colors on | PASS |
| Import external pending | all surfaces off, pending | PASS |
| Generate + morph evidence | morph on, traits off if limited | PASS |
| Custom creature | no morph surfaces | PASS |
| Concurrent: capability downgrade | edits ignored; morph state retained | PASS (CharacterEditor guards) |
| Invalid fallback | never unlock from source string | PASS |

## Fan-out / side effects
None (no queue/outbox/webhook).

## Notes
Single composed path domain→UI; deterministic check script is the proof harness.
Proof HEAD_SHA is the feature tip at gate time (1c5ce5585f3437f0eb56b26dec0531a81e8b2dad); docs-only follow-ups may advance tip without re-simulating.
