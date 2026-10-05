# Composition Gate — look-preview-stage

- Issue: #345
- Feature slug: look-preview-stage
- HEAD_SHA: d09aba279888694a35979fa8a358dd06a2262a56
- BASE_SHA: 41e49676e3c9f81a64668c2ed8769319dfd0a932
- Verdict: CLEAR

## Event
Look Editor preview applies ephemeral LookProfileVersion (or PBR Neutral restore) to CharacterStudioRuntime target(s).

## Hop chain
LookPreviewStage → CharacterStudioRuntime.applyLookProfile / restorePbrNeutralLook → LookRuntime → host-mtoon adapter. Capture hook reads studio portrait data URL (no persistence hop in this slice).

## Simulations
- N-actors: single editor preview; Before/After uses two studio instances with same camera preset mapping.
- Missing fixture: UI notice, no crash, no apply.
- Variant grid: selects ephemeral/history version for preview apply only (save still via look-service).

## Flags
none
