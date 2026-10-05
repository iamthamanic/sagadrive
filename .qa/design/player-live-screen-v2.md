# Design — player-live-screen-v2 (#368)

```text
SessionResourceScreen (player)
→ PlayerLiveScreen
   ├─ AdaptiveLiveStage.stage → ProgramDisplayShell (presentation-safe)
   └─ rightRail / phone bottomRail → private tabs
        ├─ Spiel → PlayerPanel embedMode=rail (checks, HP, inventory slot)
        ├─ Wissen → KnowledgeFeed (player access projection)
        └─ Roster → membership roster
```

Private UI never mounts inside ProgramDisplayShell.
