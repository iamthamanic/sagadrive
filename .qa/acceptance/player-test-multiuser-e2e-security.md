# Feature: Player Test 8/9: Multi-user E2E + Security Gate

<!-- refined by @implement from issue #303 on 2026-09-20 -->

## Intent
Playwright/Integration mit getrennten Browser-Contexts deckt den Online-Vertical-Slice ab
(create/join, roster, shared check + Drive, scene, encounter HP/conditions, reload,
unauthorized writes rejected, pause/resume/complete) plus Failure Cases
(duplicate command, stale revision, completed/expired session).

## Preconditions
- Phases #296–#302 / #300 / #301 merged on `main`
- `npm run test-gate` can run structural player-test checks
- Live multi-account Playwright optional via `E2E_PLAYER_TEST_LIVE=1`

## Happy Path
- [ ] Domain checklist covers Phase 8 steps 1–12
- [ ] Structural gate composes prior player-test contracts + SQL security markers
- [ ] Domain unit tests cover duplicate idempotency, stale revision, completed session, unauthorized
- [ ] Playwright multi-context spec exists with Phase 8 markers (mocked smoke; live opt-in)
- [ ] `npm run test-gate` green for scope
- [ ] Zero type escape hatches in touched files

## Edge Cases
- [ ] Duplicate idempotency key → treated as replay, not double-apply
- [ ] Stale revision → classified as `stale_revision`
- [ ] Completed session → classified as `session_closed`
- [ ] Non-participant / non-GM → classified as `forbidden`
- [ ] Missing auth → classified as `unauthenticated`

## Regression
- [ ] Prior player-test gates (#296–#302, #300, #301) still wired and pass
- [ ] No new hosted Supabase join / `Math.random()` session codes

## Assumptions
- Full live multi-account E2E needs seeded GM + player accounts; CI default is contract + mocked multi-context smoke
- External dogfood remains #304

## Security Coverage
- B-01 Auth required on runtime RPCs
- B-04 Membership via `is_session_participant` / GM project checks
- B-07 Client cannot invent totals (prior strip-forged contracts remain)
- B-08 Append-only `session_events` + idempotency unique index
- P-04 Duplicate command / stale revision fail closed

## Screenshots
| Step | Filename |
|------|----------|
| n/a | contract gate + mocked multi-context; live optional |

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-player-test-multiuser-e2e-security.md`
- HEAD_SHA: WORKTREE
- BASE_SHA: b08254cb3a20f6b84be3380df3a6126cc5a67eed

## Implementation Notes
- Domain: `src/domains/session/contracts/multiuser-e2e-security.ts`
- Gate: `scripts/player-test-multiuser-e2e-security-check.mjs` → `test-gate`
- E2E: `e2e/player-test-multiuser-e2e-security.spec.ts`
- Design: `.qa/design/player-test-multiuser-e2e-security.md`
