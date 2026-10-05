# Composition Gate — session-death-lifecycle (#373)

HEAD_SHA: ee892eba123adcba6dee7de575d2bbac088c170e
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
