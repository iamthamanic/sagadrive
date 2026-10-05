# Acceptance — session-death-lifecycle (#373)

## Intent
Session lifecycle `alive → downed/critical → stabilization → dead` using SagaDrive Core Rules §8.5 / §16.4. No UI-only death simulation.

## Source of truth
- Domain: `src/domains/session/contracts/session-death-lifecycle.ts`
- Authority: `supabase/migrations/049_session_death_lifecycle.sql` (`life` event kind + damage enter-downed)
- UI: `DeathLifecycleControls` in GM Combat panel; Player Panel life chip
- Gate: `scripts/session-death-lifecycle-check.mjs`

## Acceptance
- [x] life-state follows existing SagaDrive rules (difficulty start levels, death-save grades, Sterbend 3 = Tod)
- [x] dead character cannot perform prohibited gameplay actions (`canAttemptCheck` false)
- [x] inventory/equipment untouched by life transitions
- [x] `shared.lifeByCharacter` persists across reload/reconnect (world_state)
- [x] death/stabilize/death_save appear as `life` session events
- [x] unit check + test-gate wired

## Edge cases covered in check
- heal from downed/stable → alive
- heal does not auto-revive dead
- mark_dead requires confirmDead
- viewer/player cannot mutate life
- Hart wounds / Heroisch stable-at-zero
