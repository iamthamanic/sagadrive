# Acceptance — character-editor-body-face-editor

## Intent
Live Body/Face morph UI in CharacterEditor driven solely by #212 metadata; capability-gated for imports.

## Happy Path
- [ ] All #212 body/face params editable via AvatarMorphEditorPanels
- [ ] Live preview via applyMorphState (no model reload)
- [ ] Morph persisted on CharacterAvatarDto via withAvatarMorphState
- [ ] Imports without capability show unsupported state
- [ ] Species preset apply vs keep confirmation
- [ ] test-gate green

## Edge Cases
- [ ] Import model → no morph sliders
- [ ] Debounced morph publish
- [ ] Full reset with confirm

## Scope
In: AvatarMorphEditorPanels, CharacterEditor wiring, runtime applyMorphState
Out: Sculpting, bone gizmos

## Security Coverage
- Morph keys only from #212 allowlist via validateAvatarMorphInput
- Out: B-04/B-07

## Composition Gate
- HEAD_SHA: 86d2f6f87afa614a135b048bc1ca991f33ee2286
- BASE_SHA: 0c8283d0e0c6cbb09a0e77a42bedf1481c53abbc
- Verdict: CLEAR
- Proof: .qa/runs/composition-gate-character-editor-body-face-editor.md

## Implementation Notes
- UI: AvatarMorphEditorPanels (DE labels, 44px targets, presets)
- Runtime: applyMorphState maps sd_body_*/sd_face_* without reload
