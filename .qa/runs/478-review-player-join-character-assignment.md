# Review Ticket — player-join-character-assignment (#478)

- Date: 2026-10-05
- Verdict: ACCEPT

## Summary
Minimal join→character bind→canonical live route. Security: owned-only picker, membership authority in PlayerPanel, resolve surface for bare `/live/player`.

## Risks
- Server RPC must continue validating character_id (pre-existing); client asserts owned IDs only as first line.
- Rejoin via active-session list re-calls join with selected character; server must not silently rebind foreign characters.

## Decision
ACCEPT for ship.
