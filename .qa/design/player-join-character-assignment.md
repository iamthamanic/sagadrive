# Design — player-join-character-assignment (#478)

```text
Invite/Code → SessionJoin character pick (owned only)
→ join_session_by_code(character_id)
→ membership.character_id
→ resolveCanonicalLiveEntry(player) + characterPublicId
→ /live/player/:characterPublicId

/live/player (no id)
→ PlayerCharacterResolve reads membership
→ history.replace → /live/player/:boundPublicId
```

URL character is routing context only; PlayerPanel loads bound membership character and rejects mismatch.
