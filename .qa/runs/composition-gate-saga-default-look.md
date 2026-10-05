# Composition Gate — saga-default-look

- Issue: #348
- Feature slug: saga-default-look
- HEAD_SHA: WORKTREE
- BASE_SHA: pending
- Verdict: CLEAR

## Event
GM saves saga default LookProfile id and player-override flag on a project.

## Hop chain
SagaVisualStyleSettings → projectService.updateProjectLookSettings → projects UPDATE (RLS GM) → enforce_default_look_profile_binding trigger → look_profiles ownership/active check. Resolution consumers later read ProjectVm via buildLookResolutionContextFromSaga → resolveLookProfileId (no new session hop).

## Simulations
- N-actors: non-GM cannot UPDATE (RLS); UI disables save.
- Invalid look id / foreign owner / archived → trigger or client reject; null clears to system default.
- Session overrides untouched (out of scope).

## Flags
none
