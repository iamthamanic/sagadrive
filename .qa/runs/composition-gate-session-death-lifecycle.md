# Composition Gate — session-death-lifecycle (#373)

HEAD_SHA: f63a24b686af3ca9dcf0fcc84356cd7d6d885285
Verdict: CLEAR

## Hop chain
DeathLifecycleControls / PlayerPanel life chip
→ useDeathLifecycle.applyCommand(kind=life) + damage path
→ session-death-lifecycle pure transitions + SQL sagadrive_resolve_life_command / extended damage
→ shared.lifeByCharacter + session_events kind=life
→ PlayerPanel canAttemptCheck + conditions converge on reload

## Side effects
- No fan-out
- Inventory untouched
- No LiveAct/DB pose persistence

## Findings
None.
