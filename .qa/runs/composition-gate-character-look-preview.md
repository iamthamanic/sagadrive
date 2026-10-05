# Composition Gate — character-look-preview

- Issue: #347
- Feature slug: character-look-preview
- HEAD_SHA: WORKTREE (pre-commit; re-stamp after commit)
- BASE_SHA: f8ef39b10cdbd501464896bedbdee045fa4e63ef
- Verdict: CLEAR

## Event
Player (or author) selects a personal Look override or „Welt-Look verwenden“ for a character; resolved Look is applied to the existing Avatar preview.

## Hop chain
CharacterLookSelector → resolveLookProfileId(player-character, saga context from projectService + adventure arcs) → getLookProfile → CharacterStudioRuntime.applyLookProfile / restorePbrNeutralLook. Persist: appearance.personal_look_profile_id via characterService.updateCharacter (JSON appearance; no new column). CharacterEditor full-save preserves the same field.

## Simulations
- N-actors: Selector consumes `allowPlayerCharacterLookOverride` from project; when false, Select disabled and personal id cleared/ignored for resolution.
- Invalid/missing: archived / invisible personal Look → notice + fallback to inherited; missing profile load → notice, no apply crash.
- Two consumers / crash: AvatarSurfaceViewer optional `studioRuntimeRef` bridge; Look Editor remains sole authoring surface (library deep-link only). Neutral compare does not mutate stored appearance.

## Flags
none
