# Review Ticket — session-death-lifecycle (#373)

HEAD_SHA: f63a24b686af3ca9dcf0fcc84356cd7d6d885285
Verdict: ACCEPT

## Notes
- GM-only life mutations; confirmDead for irreversible death
- Reuses combat HP path; life track is additive overlay
- Player dead → canAttemptCheck false
