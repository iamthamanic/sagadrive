# Composition Gate — player-join-character-assignment

- HEAD_SHA: 2bb15a334dfc86b7005489cbd0bdc8eb8b9c4656
- BASE_SHA: 1925008f9a3058e8087630de11a5675ac4a00d23
- Date: 2026-10-05
- Verdict: CLEAR

## Event
Player joins with owned character; membership binds; live route carries characterPublicId; bare /live/player resolves membership.

## Hop chain
```text
SessionJoin character pick
→ joinSession(character_id)
→ membership.character_id
→ navigateToSessionLive(..., characterPublicId)
→ /live/player/:characterPublicId
→ usePlayerPanel membership assert
```

Bare path:
```text
/live/player
→ player-resolve
→ PlayerCharacterResolve(membership)
→ replace /live/player/:boundPublicId
```

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each player binds own character | owned pick + membership | pass |
| Invalid/missing | 0 chars / URL mismatch rejected | none pick + assertUrl | pass |
| Two consumers | Resolve and Panel independent | History replace + Panel load | pass |

## Flags
none
