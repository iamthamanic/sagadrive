# Composition Gate — character-editor-body-face-editor

- HEAD_SHA: 86d2f6f87afa614a135b048bc1ca991f33ee2286
- BASE_SHA: 0c8283d0e0c6cbb09a0e77a42bedf1481c53abbc
- Date: 2026-09-17
- Verdict: CLEAR

## Event
User edits morph sliders; compact morph state saves on avatar; runtime mutates morph targets live.

## Hop chain
AvatarMorphEditorPanels → validateAvatarMorphInput → CharacterAvatarDto.morph
→ AvatarCanvas applyMorphState → mesh morphTargetInfluences

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One morph state per character appearance | single avatarMorph state | pass |
| Invalid/missing | Import → no caps / unsupported UI | morphCapabilities empty | pass |
| Two consumers / crash | Debounced publish; reload uses saved morph | validate on load | pass |

## Flags
(none)

## Skip reason
n/a
