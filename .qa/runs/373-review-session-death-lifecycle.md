# Review Ticket — session-death-lifecycle (#373)

HEAD_SHA: ee892eba123adcba6dee7de575d2bbac088c170e
Verdict: ACCEPT

## Notes
- GM-only life mutations; confirmDead for irreversible death
- Reuses combat HP path; life track is additive overlay
- Player dead → canAttemptCheck false
