# Feature: Player Test 5/9: Combat & Encounter V1

<!-- refined by @implement from issue #300 on 2026-09-20 -->

## Intent
Minimaler spielbarer Encounter: starten/beenden, Teilnehmer aus PCs + NPC/Creature-Instanzen (#201), Initiative/Turn, HP Schaden/Heilung, Zustände; Spieler sieht eigenen State, GM ändert Encounter-State authoritativ. Kein Battlemap/FoW/Grid/AoE/3D.

## Preconditions
- Authenticated session participant; #297 runtime RPCs available
- #299 shared rolls / #298 player panel available
- NPC/creature instances (#201) can be spawned into the adventure/session
- Session is not `completed`

## Happy Path
- [ ] Encounter start/end
- [ ] Participants from player characters + NPC/creature instances
- [ ] Initiative / turn order / current turn & round
- [ ] HP damage/healing; add/remove conditions
- [ ] Player sees own state; GM can authoritatively change encounter state
- [ ] Action/reaction spend only as needed for clean test combat
- [ ] Reload continues the encounter from authoritative state
- [ ] Zero type escape hatches; test-gate green for scope

## Edge Cases
- [ ] Non-GM cannot start/end encounter or apply damage/conditions
- [ ] Client-forged initiative/hp/round fields are stripped; server owns totals
- [ ] Starting while another encounter is active fails closed
- [ ] Damage/heal clamps HP to [0, hpMax]; HP 0 adds `bewusstlos` when damaged to 0
- [ ] Spend action rejects unknown slots / overspend; only current actor or GM
- [ ] Completed session rejects combat commands
- [ ] Stale revision rejected (40001)
- [ ] NPC HP updates sync to `npc_creature_instances.runtime` when instance exists

## Regression
- [ ] #297 realtime runtime gate still passes
- [ ] #298/#299 player panel + shared rolls gates still pass
- [ ] #301 scene presentation merge path still preserves `lastRoll` / does not wipe encounter

## Assumptions
- Authoritative encounter lives under `world_state.shared.encounter` + `combatActive`
- Initiative: server d20 + awareness flat (perception + awareness rank + applied EB) for PCs; NPC uses snapshot-based bonus (0 default) + d20
- Full multi-browser E2E deferred; contract gate + domain unit tests cover this ticket
- No battlemap / FoW / grid / AoE / 3D

## Security Coverage
- B-01 Auth required (`auth.uid()`)
- B-04 Membership via `is_session_participant`; GM-only for start/end/damage/condition/nextTurn
- B-07 Client cannot invent initiative totals, HP, round — server strips forged keys
- B-08 Append-only `session_events` for combat/damage/condition
- P-04 Idempotency keys prevent duplicate start/damage events

## Screenshots
| Step | Filename |
|------|----------|
| n/a | contract gate + domain unit tests; browser optional |

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-player-test-combat-encounter-v1.md`
- HEAD_SHA: PENDING_COMMIT

## Implementation Notes
## Implementation Notes
- Domain: `src/domains/session/contracts/combat-encounter.ts` (strip forged keys, encounter projection, damage/condition/turn helpers)
- Migration: `supabase/migrations/044_session_combat_encounter.sql` — combat/damage/condition branches in `apply_session_runtime_command`; NPC runtime sync
- UI: `CombatEncounterGmPanel` + GM tab Kampf; Player Panel shows round/turn/own HP from encounter
- Hook: `useCombatEncounter`
- Gate: `scripts/player-test-combat-encounter-check.mjs` wired into `test-gate`
- Design: `.qa/design/player-test-combat-encounter-v1.md`
