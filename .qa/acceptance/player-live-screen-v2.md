# Acceptance — player-live-screen-v2 (#368)

Feature slug: `player-live-screen-v2`

## Intent
Canonical Player Live Screen: shared Program/Live Stage + private player UI (reuse PlayerPanel logic). Mobile-first tabs; no CharacterEditor; no Program contamination with private controls.

## Happy Path
1. Player on `/live/player/:characterPublicId`
2. Sees Program Output stage
3. Sees private rail/tabs: character/HP/checks/inventory/knowledge/roster
4. Checks/Drive remain via existing PlayerPanel commands

## Edge Cases
- Program loading/error while private UI usable
- Character unavailable / membership mismatch (existing #478 errors)
- Phone: stage primary, private via bottom tabs (≥44px)
- Knowledge projection audience-safe

## Security
- No arbitrary HP/world writes from player UI
- Knowledge via server projection + player access
- Private UI never injected into ProgramDisplayShell

## Scope
In: PlayerLiveScreen composition, SessionResourceScreen wire, knowledge tab, inventory slot, gate/e2e
Out: Live inventory mutations (#372), GM/Director screens, CharacterEditor

## Implementation Notes
- `AdaptiveLiveStage` + `ProgramDisplayShell` + `PlayerPanel` (rail mode)
- `useSessionKnowledge` with player access
