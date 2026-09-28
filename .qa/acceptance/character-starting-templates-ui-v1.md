# Feature: SagaDrive Starttemplates Create-Flow UI (#464)

## Intent
Wire the ten #463 catalog templates into the existing two-card Create dialog
via Vorlage wählen → SagaDrive-Starttemplates + Deine Presets, with one-shot
bootstrap `{ kind: 'starting-template', templateKey }` resolved in CharacterEditor.

## Happy Path
- [x] Second chooser card copy: Vorlage wählen / SagaDrive-Starttemplate oder eigenes Preset
- [x] Preset step lists 10 system templates + user presets (no third card)
- [x] Bootstrap carries key only; editor resolves catalog fail-closed
- [x] Only mechanical L1 fields applied (no species/look/inventory)
- [x] One-shot via bootstrapAppliedRef; clear after apply
- [x] Presets regression + smoke e2e updated
- [x] typed-strict

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-character-starting-templates-ui-v1.md`
