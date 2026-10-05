# Feature: Look Editor Workspace

<!-- issue #344 — feature slug: look-editor-workspace -->

## Intent

Canonical Look Editor under Bibliothek › Looks. Manages LookProfile metadata and V1 domains Character, Lighting, PostFX. Other surfaces only link here.

## Happy Path

- [x] Desktop 3-column AdaptiveLiveStage (nav / preview stub / inspector); phone stacks nav+preview+bottom inspector
- [x] V1 inspectors: Character, Lighting, PostFX in SagaDrive terms; Advanced note only under „Erweitert“
- [x] Dirty / Save / Reset / Duplicate / Version laden / conflict+archived read-only messaging; topbar actions keyboard-focusable (min-h-11)
- [x] Single authoring screen (`LookEditorWorkspace`); create/edit routes are thin mounts
- [x] Touched files: zero type escape hatches; `look-editor-workspace-check` + test-gate wiring

## Edge Cases

- [x] Archived look → read-only + status copy
- [x] Save conflict messages from look service surfaced in UI
- [x] World domains listed as „Noch nicht verfügbar“ (no fake sliders)
- [x] Unsaved changes → beforeunload guard
- [x] Preview stage stub until #345

## Security Coverage

Mutations go through look-service facade (auth + optimistic version bump). No ToonLab/provider raw write API in UI.

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-look-editor-workspace.md`
