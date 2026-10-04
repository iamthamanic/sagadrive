# Acceptance — live-program-output (#365)

## Criteria
- [x] Canonical `/live/display` renders control-free Program Output
- [x] Program state authoritative/revisioned (`programRevision`, event kind `program`)
- [x] Independent of Player UI state; SharedScenePresentation is source input only
- [x] Read model public-only (rejects `gm_only` / `character_specific`)
- [x] Responsive 16:9 shell + degraded/empty/error states
- [x] Gate `live-program-output-check` in test-gate

## Implementation Notes
- Domain: `src/domains/session/presentation/program-presentation.ts`
- Migration: `047_session_program_presentation.sql`
- Display: `ProgramDisplayShell` / `ProgramOutputView`
- Hook: `useProgramPresentation`
- GM: `ProgramGmControls` in GamemasterPanel scenes tab
