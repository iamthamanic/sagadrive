# Feature: Look Preview Stage

<!-- issue #345 — feature slug: look-preview-stage -->

## Intent

Reusable Look Preview Stage showing a Look on representative asset/material classes. Visual quality base for Look Editor and later adaption/world integration.

## Happy Path

- [x] Fixture rail: player humanoid, secondary humanoid, item, prop, reserved ground/vegetation/sky/water/vfx
- [x] Modes: Normal, PBR Neutral, Before/After split (shared camera preset), Variant Grid (≥3 candidates)
- [x] Cameras: Ganzkörper, Portrait, 3/4, Umgebung, Item/Prop (mapped onto CharacterStudio frames)
- [x] Missing/unsupported fixtures show notice and do not crash the stage
- [x] Capture hook via `capturePortraitDataUrl`; wired in Look Editor workspace
- [x] Zero type escape hatches; `look-preview-stage-check` + test-gate

## Edge Cases

- [x] Unsupported fixture click → status notice
- [x] Before/After stacks on phone (`grid-cols-1 md:grid-cols-2`)
- [x] Capture while runtime null → soft notice
- [x] LookRuntime notices surfaced in DE

## Security Coverage

Preview harness only; mutations still via look-service on save. No provider raw write path.

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-look-preview-stage.md`
