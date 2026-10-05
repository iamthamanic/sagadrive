# Composition Gate — session-death-lifecycle
- HEAD_SHA: 949d8cb49a27c3824697982cfb0e6f45c76d894e
- BASE_SHA: f63a24b686af3ca9dcf0fcc84356cd7d6d885285
- Verdict: CLEAR

## Event
GM applies damage to 0 HP or issues `life` command (death_save / stabilize / mark_dead) → authoritative `shared.lifeByCharacter` + `session_events.kind=life` (or damage payload with lifeStatus) → Player/GM clients converge on same life status after reload.

## Hop chain
DeathLifecycleControls / PlayerPanel life chip
→ useDeathLifecycle.applyCommand(kind=life) + existing damage path
→ session-death-lifecycle pure transitions + SQL sagadrive_resolve_life_command / extended sagadrive_resolve_damage_command
→ shared.lifeByCharacter + conditionsByCharacter / encounter conditions
→ PlayerPanel canAttemptCheck + lifeLabel converge on reconnect/reload

## Simulations
- N-actors: multiple PCs each have independent lifeByCharacter entries; GM targets one participant without mutating others.
- Invalid/missing: non-GM forbidden; death_save without downed fails; mark_dead without confirmDead fails; unknown grade rejected.
- Two consumers / crash: mid-command crash leaves prior revision; reconnect reads world_state lifeByCharacter; duplicate idempotency_key replays snapshot without double-apply.

## Flags
none
