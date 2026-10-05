# Acceptance — player-join-character-assignment (#478)

Feature slug: `player-join-character-assignment`

## Intent
Player confirms an owned character at join; membership binds `character_id`; navigation lands on `/live/player/:characterPublicId`. `/live/player` resolves membership and canonicalizes.

## Happy Path
1. Given authenticated user with ≥1 own character (public ID)
2. When they enter a valid session code and pick a character
3. Then join sends `character_id`, membership binds, and App navigates to canonical player live with that `characterPublicId`

## Edge Cases
- 0 characters → join disabled + create CTA
- 1 character → preselected
- n characters → explicit select
- `/live/player` without id → membership resolve → replace to character route
- URL character ≠ membership → reject (no silent swap)
- foreign character_id → client assertOwned + server RPC validation

## Security Coverage
- F/B: URL is not authorization; membership character_id is authority
- Client only lists owned characters; `assertOwnedCharacterId` before join
- No durable LiveAct/pose; N/A for this ticket

## Scope
In: SessionJoin picker, player-character-assignment domain, PlayerCharacterResolve, usePlayerPanel membership check, gate/e2e
Out: Player Live V2 layout (#368), character creator rules

## Implementation Notes
- Domain: `src/domains/session/contracts/player-character-assignment.ts`
- UI: `SessionJoin.tsx` character select + join button label
- Resolve: `PlayerCharacterResolve.tsx` on `player-resolve` live view
- Gate: `scripts/player-join-character-assignment-check.mjs`
