# Player-Test Instrumentation — Evidence Index

Issue: **#304** · Epic: **#210** · Slug: `player-test-instrumentation-runbook`

This folder is the canonical location for Player-Test #1 instrumentation templates and filled-run evidence.

## Templates (ship with repo)

| File | Purpose |
|------|---------|
| [runbook.md](./runbook.md) | Operator runbook: preflight, voice, 60–90 min beats, dogfood → external |
| [feedback-form.md](./feedback-form.md) | Post-session feedbackbogen (Phase 10 questions) |
| [observation-event-protocol.md](./observation-event-protocol.md) | Live observation + session event log schema |
| [dogfood-checklist.md](./dogfood-checklist.md) | Private Dogfood Test 1 + Test 2 exit gates |
| [player-test-ready-gate.md](./player-test-ready-gate.md) | Mirrored Player-Test-Ready Gate from Epic #210 |

## Filled evidence after a run

Store completed sheets and logs under:

```
.qa/evidence/player-test-instrumentation-runbook/runs/<YYYY-MM-DD>-<dogfood|external>-<n>/
```

Suggested contents per run folder:

- `feedback-*.md` (one per player + GM)
- `observation-log.md`
- `session-event-notes.md`
- `ready-gate-checked.md` (snapshot of gate checkboxes at start)
- `interruptions.md` (if any)

## Related contracts

- Domain: `src/domains/session/contracts/player-test-instrumentation.ts`
- Prepared adventure beats: `.qa/design/player-test-prepared-adventure-fixture.md`
- Multi-user E2E: `.qa/acceptance/player-test-multiuser-e2e-security.md`
