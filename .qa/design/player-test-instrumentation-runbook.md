# Player-Test Instrumentation & Runbook (#304)

Epic #210 Phase 9–10 + Product gate. Docs + measurement pack so Private Dogfood and External Player Test #1 are operational — not new product features.

## Composition

| Artifact | Path |
|----------|------|
| Runbook | `.qa/evidence/player-test-instrumentation-runbook/runbook.md` |
| Feedbackbogen | `.qa/evidence/player-test-instrumentation-runbook/feedback-form.md` |
| Observation / Event protocol | `.qa/evidence/player-test-instrumentation-runbook/observation-event-protocol.md` |
| Private dogfood checklist | `.qa/evidence/player-test-instrumentation-runbook/dogfood-checklist.md` |
| Player-Test-Ready Gate (mirror) | `.qa/evidence/player-test-instrumentation-runbook/player-test-ready-gate.md` |
| Evidence index | `.qa/evidence/player-test-instrumentation-runbook/README.md` |
| Domain metrics contract | `src/domains/session/contracts/player-test-instrumentation.ts` |

## Voice / Video

- **External only:** Discord or Google Meet (reuse `VOICE_VIDEO_EXTERNAL_NOTE` from prepared adventure fixture).
- No in-app A/V, OBS, face tracking, or recording for Test #1.

## Adventure length

- Target **60–90 minutes** One-shot (prepared adventure fixture #302 beat table).
- Dogfood Test 1 is a shorter **30 min** GM+1 smoke; Test 2 is the full One-shot.

## Phase 10 primary metrics

Join-Zeit, Zeit bis erste Player-Action, GM-Erklärungen, Sync/Reconnect, Regelconfusion, UI-Verirrungen, Combat-Rundenzeit, Immersion/Flow, „nächste Session wieder?“, „was würdest du vermissen?“ — plus qualitative observation + session event log + short post-interview (not NPS-only).

## Dogfood exit

- No P0 abort errors.
- At most known P1 cosmetics/UX.
- No developer console / DB manipulation during play except bug recovery; all interruptions logged.

## Depends on

- #303 Multi-user E2E + Security Gate (merged)
- #302 Prepared Adventure Fixture (runbook links beat table)
- Epic #210 parent — do not implement remaining product features here

## Out of scope

- New session/runtime UI or RPCs
- Marketplace / AI-GM / 3D / in-app voice
- Closing analog E2E #31
