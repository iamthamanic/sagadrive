# Feature: Player Test 2/9: Realtime Runtime State + Reconnect/Revision

<!-- refined by @implement from issue #297 on 2026-09-20 -->

## Intent
Ergänzt den Session-Domainvertrag um autoritativen `SessionRuntimeState` (getrennt von Definitionsdaten) mit Realtime für Roster/Presence, Session-Status und Gameplay-State, Revision/Version gegen stale writes, Reconnect/Resync und einen minimalen append-only `session_events`/Audit-Log — kein vollständiges Event-Sourcing.

## Preconditions
- Authenticated user is GM or active session participant for the play session
- Play session exists (created via #296 lifecycle RPCs)
- Client has network access to Supabase Realtime + Postgres RPCs

## Happy Path
- [ ] SessionRuntimeState domain contract exists, separate from definition `SessionDto`/`SessionVm`
- [ ] Snapshot RPC returns authoritative revision, status, roster/presence, gameplay
- [ ] Realtime channel (after snapshot) updates roster/presence, status, and gameplay
- [ ] Mutating command with wrong `expected_revision` fails (stale) and client can refresh
- [ ] Reconnect: load snapshot then re-subscribe (no last-write-wins client merge)
- [ ] Append-only `session_events` for join/leave/presence/status/roll/damage/condition/scene/combat/gameplay
- [ ] Idempotency key on mutating commands prevents duplicate apply on retry
- [ ] Touched files: zero type escape hatches; test-gate green for scope

## Edge Cases
- [ ] Stale revision: command rejected; client must re-snapshot
- [ ] Duplicate idempotency key: returns prior result without double-bumping revision
- [ ] Non-member cannot snapshot or mutate runtime
- [ ] Completed session rejects gameplay mutations
- [ ] Channel disconnect: hook reloads snapshot then resubscribes

## Regression
- [ ] #296 join-code lifecycle RPCs and SessionJoin still pass player-test-session-security-check
- [ ] Definition SessionDto/SessionVm unchanged in meaning (runtime is additive)

## Assumptions
- `world_state` JSONB holds gameplay payload; `runtime_revision` is the concurrency token
- Full multi-browser E2E is covered by contract gate + domain tests; live Realtime needs deployed migration

## Security Coverage
- B-01 Auth required on all runtime RPCs (`auth.uid()`)
- B-04 Membership/GM checks before snapshot/mutate (no cross-session reads)
- B-07 Client cannot invent elevated revision; server owns bump
- B-08 Append-only events: no UPDATE/DELETE grants to clients
- P-04 Idempotency keys scoped per session (unique constraint)

## Screenshots
| Step | Filename |
|------|----------|
| n/a | backend/runtime contract — no UI surface in this ticket |

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-player-test-realtime-runtime-state.md`
- HEAD_SHA: 0180ea1787d8761e1368036391c25cd9c8c6d49b

## Implementation Notes
- Domain: `src/domains/session/contracts/session-runtime.ts` (`SessionRuntimeState`, revision helpers, event kinds)
- Migration: `supabase/migrations/041_session_runtime_state.sql` (`runtime_revision`, `session_events`, snapshot/command/presence RPCs; lifecycle RPCs bump revision + audit)
- Infra: `session-runtime-service.ts` + `session-runtime-channel.ts` (snapshot-then-subscribe; refresh on postgres_changes)
- App: `useSessionRuntime` (visibility resync + stale-command refresh)
- Gate: `scripts/player-test-realtime-runtime-check.mjs` wired into `test-gate.mjs`
- Design: `.qa/design/player-test-realtime-runtime-state.md`
