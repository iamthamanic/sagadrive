# Verify Ticket — session-lobby-preflight (#491)

- HEAD_SHA: 9eedd5ed02f85e923a1e3cf7abe9125a7eb5209c
- Date: 2026-10-06
- Verdict: PASS

## Checks (@test-gate)

- `npm run test-gate` → PASS (includes `session-lobby-preflight-check`)
- Evidence: `.qa/runs/491-test-gate.txt`

## Acceptance match

| Checkbox | Evidence |
|----------|----------|
| Canonical lobby screen | `SessionLobbyScreen` + phase `lobby` route |
| Character assignment visible | self section + roster character names/public ids |
| Roster + ready realtime | poll `session_players` + broadcast channel |
| No auto cam/mic/LiveAct | probe buttons only; getUserMedia in probe helpers |
| Media failure does not block enter | `mediaFailureBlocksSessionEnter` always false |
| Player → player live | `decideLobbyEnterLive` player-live |
| GM → GM live | `decideLobbyEnterLive` gamemaster-live |
| Reload restores lobby | `/lobby` phase route |
| AU multi-context | golden-mobile lobby test + desktop e2e |
| typed-strict | check section 6 |

## Security

Membership from session_players; ready not gameplay auth; device permissions after gesture.
