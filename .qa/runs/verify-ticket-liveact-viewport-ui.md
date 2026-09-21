# Verify Ticket — liveact-viewport-ui (#330)

- Date: 2026-09-21
- Branch: agent/issue-330-liveact-viewport
- BASE_SHA: f7e309d868f56e643a1c221ac08ceaeed7d78742
- HEAD_SHA: e0fe659cbd8cab8612873759557ea562f44e7f4d
- Verdict: **PASS**

## Acceptance

| Criterion | Result |
|-----------|--------|
| Permanent gear in Surface chrome incl. fallback | PASS |
| Menu: Darstellung + LiveAct + Status; stubs for overlay/bones/calibrate | PASS |
| Tracking disabled without runtime; no permission on menu open | PASS |
| PiP mirrored 4:3; independent hide | PASS |
| No LiveAct state in CharacterEditor; FT bar hidden in editor; test-gate | PASS |

## Tests
- liveact-viewport-ui-check OK
- liveact-core-check OK
- npm run test-gate PASS
