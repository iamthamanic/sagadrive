# Composition Gate — session-entry-role-routing

- HEAD_SHA: 9f52ec2f3187b6389acc182c5b8528dda72105f6
- BASE_SHA: 596be85753303add95434be5362fe233c9289264
- Date: 2026-10-05
- Verdict: CLEAR

## Event
Authorized member joins/creates session and is routed to role-correct live surface with Saga+Session public IDs.

## Hop chain
```text
Library/Saga sessions
→ buildSessionJoinPath / SessionJoin
→ resolveCanonicalLiveEntry
→ pathForSessionLive (/live/gamemaster|player)
→ SessionResourceScreen
```

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | GM and players get distinct live views | role decision | pass |
| Invalid/missing | Missing public IDs stay on session-join | unauthorized | pass |
| Two consumers / crash | Independent navigations; no shared mutable route state | History API | pass |

## Flags
none
