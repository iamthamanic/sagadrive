# Feature: Player Test 4/9: Shared Rolls / Rules Commands

<!-- refined by @implement from issue #299 on 2026-09-20 -->

## Intent
Standardchecks, Vorteil/Nachteil und Drive-Reroll laufen über bestehende Rules-Kernel-Grenzen als autoritative Session-Commands; Ergebnisse sind gemeinsame Session-Ereignisse. Clients dürfen Resultate nicht durch frei gesendete Endwerte fälschen.

## Preconditions
- Authenticated session participant (player or GM) with #297 runtime RPCs available
- Character exists and is addressable by public id / uuid for modifier lookup
- Player Panel (#298) can emit `roll` command intents

## Happy Path
- [ ] Standard check via existing Rules Kernel as authoritative command
- [ ] Advantage/disadvantage + Drive reroll supported
- [ ] GM can communicate target/resistance where needed
- [ ] Result visible as shared session event
- [ ] Server validates inputs; no client-forged final results
- [ ] Zero type escape hatches; test-gate green for scope

## Edge Cases
- [ ] Client payload with forged `total`/`grade`/`natural` is stripped; server recomputes
- [ ] Drive reroll without available Drive fails closed (no silent free reroll)
- [ ] Non-member cannot apply roll commands
- [ ] Completed session rejects roll commands
- [ ] Missing/invalid skill key rejected
- [ ] Missing target uses GM-set shared `checkTarget` or default 15

## Regression
- [ ] #297 realtime runtime gate still passes
- [ ] #298 player panel gate still passes (check CTA remains)
- [ ] Non-roll runtime commands unchanged in meaning

## Assumptions
- Dice + grade resolution for live sessions runs in SECURITY DEFINER RPC (server RNG)
- Domain TS probe module is the rules-kernel source of truth for client/tests; SQL mirrors §2.2/§2.5/§2.10
- Full multi-browser E2E deferred to later player-test children; contract gate + domain tests cover this ticket

## Security Coverage
- B-01 Auth required on roll path (`auth.uid()`)
- B-04 Membership check before mutate; GM-only for publishing `checkTarget` / resistance via gameplay/target fields
- B-07 Client cannot invent elevated totals/grades — server strips forged keys and recomputes
- B-08 Append-only `session_events` for roll results
- P-04 Idempotency keys prevent duplicate Drive spend / double events

## Screenshots
| Step | Filename |
|------|----------|
| n/a | contract gate + domain unit tests; browser optional |

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-player-test-shared-rolls-commands.md`
- HEAD_SHA: 3eae479329f3affe73fdf46fd045d8403dfe88eb

## Implementation Notes
- Rules kernel: `src/domains/rules/sagadrive/probe` (`resolveProbeGrade`, `resolveProbeFromDice`, `applyDriveReroll`)
- Session contract: `src/domains/session/contracts/shared-rolls.ts` (strip forged keys, lastRoll projection)
- Migration: `supabase/migrations/042_session_shared_rolls.sql` — `sagadrive_resolve_session_check` + roll branch in `apply_session_runtime_command`
- UI: Player Panel mode/Drive + `data-last-shared-roll`; hook sends inputs-only roll payload
- Gate: `scripts/player-test-shared-rolls-check.mjs` wired into `test-gate`
- Design: `.qa/design/player-test-shared-rolls-commands.md`
