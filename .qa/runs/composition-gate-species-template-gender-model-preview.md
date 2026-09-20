# Composition Gate — species-template-gender-model-preview

- HEAD_SHA: WORKTREE (uncommitted implement)
- Date: 2026-09-20
- Verdict: CLEAR

## Event
User selects Vorlage species template + Geschlecht → one allowlisted preview model URL for the sheet viewer (or none).

## Hop chain
1. `genderReading` + `speciesTemplateId` (editor state)
2. `resolveSpeciesTemplateModelUrl` (domain, allowlisted paths only)
3. `createCharacterStudioAvatar.model_url` / `currentAvatar`
4. `AvatarSurfaceViewer` surfaceRef.modelUrl → WebGL or initials fallback

## Simulations
- **N-actors:** One editor session → one model URL. No fan-out.
- **Invalid/missing:** divers / unset / non-human → `undefined` (fail closed). No invented remote URL.
- **Two consumers:** Viewer + save appearance both read `currentAvatar.model_url` (same field). Import `importedModelUrl` wins over template.

## Notes
Single source of truth for template mesh path is `species-template-models-v1.ts`. Pilot assets only for `human`.
