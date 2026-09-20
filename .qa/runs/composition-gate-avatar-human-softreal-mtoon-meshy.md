# Composition Gate — avatar-human-softreal-mtoon-meshy

- HEAD_SHA: f5cadabc55acab8c0be333a6480d941ff984524b
- BASE_SHA: b6bd0ce17d5a3e3df24cad693cd2aa66c93c00bd
- Date: 2026-09-20
- Verdict: CLEAR

## Events covered
1. Species Vorlage + Geschlecht → allowlisted soft-real human GLB in sheet viewer.
2. Editor MToon preview toggle → ephemeral runtime style on/off (not persisted).
3. Meshy job mid-rigging → Edge poll step-split + pending_glb_url (no silent 99% offline).

## Hop chains

### A — Species preview
1. `genderReading` + `speciesTemplateId`
2. `resolveSpeciesTemplateModelUrl` (`?v=softreal2`, query-safe ext check)
3. `currentAvatar.model_url`
4. `AvatarSurfaceViewer` / `AvatarCanvas` → load allowlisted `/assets/avatars/species/human-*.glb`

### B — MToon toggle
1. `AvatarMtoonStyleToggle` → `CharacterStudioRuntime.setMtoonStyleEnabled`
2. restore material snapshots ↔ apply MToon profile / neutral lights
3. Portrait capture still same renderer path

### C — Meshy CPU split
1. Edge `character-avatar-meshy` poll: remesh/rig may persist `pending_glb_url`
2. Client poll continues → final model URL
3. Overlay UX reflects saving/rigging stages

## Simulations
- **N-actors:** One editor session per avatar; no fan-out of mesh URLs.
- **Invalid/missing:** divers / unset / non-human → no mesh URL. Free remote URLs rejected by normalize.
- **Two consumers / crash:** Viewer + save both read `appearance.avatar.model_url` / currentAvatar; import wins over template; MToon toggle not written to appearance. Edge poll crash mid-rig → `pending_glb_url` persisted, next poll resumes; no duplicate Meshy task spawned.

## Flags
- None. Migration `045` must be applied before Edge deploy (documented in README deploy notes).

## Notes
Golden style: `docs/character-visual-styleguide.md` + `assets/species-3d/human/golden/`.
Migration `045_character_avatar_meshy_pending_glb.sql` required for pending URL path.
