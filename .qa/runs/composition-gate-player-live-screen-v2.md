# Composition Gate — player-live-screen-v2

- HEAD_SHA: 4eb7e9911e686651f0d0cb793c84338b5ec46a80
- BASE_SHA: 255f2bb389fc9df8c424ce7e2acd3ab5402b382f
- Date: 2026-10-05
- Verdict: CLEAR

## Event
Player opens canonical live route and sees Program stage plus private UI tabs.

## Hop chain
```text
SessionResourceScreen(player)
→ PlayerLiveScreen
→ AdaptiveLiveStage
   ├─ ProgramDisplayShell ← useProgramPresentation
   └─ PlayerPanel(rail) + KnowledgeFeed ← useSessionKnowledge(player)
```

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each player private rail | membership characterId access | pass |
| Invalid | Panel error / empty knowledge | existing #478 asserts | pass |
| Two consumers | Program + private independent | separate hooks | pass |

## Flags
none
