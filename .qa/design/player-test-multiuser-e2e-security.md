# Multi-user E2E + Security Gate (#303)

Epic #210 Phase 8 — compose prior player-test slices into a verifiable multi-context gate.

## Composition

Prior phases (#296–#302, #300/#301) already own create/join, realtime revision,
player panel, shared rolls, scene, combat, and prepared fixture. This ticket
does **not** re-implement them.

```
Phase-8 checklist (domain) → structural gate → Playwright multi-context
  → optional live (E2E_PLAYER_TEST_LIVE=1)
```

## Phase 8 steps (1–12)

1. GM creates session  
2. Players A/B/C join with characters  
3. Roster realtime  
4. Shared check + Drive  
5. GM scene change  
6. Encounter start  
7. NPC HP/condition update visible  
8. Player takes damage  
9. Player reload/reconnect  
10. State identical after reload  
11. Unauthorized writes rejected  
12. Pause / resume / complete  

## Failure cases

| Case | Expected |
|------|----------|
| Duplicate command (same idempotency key) | Replay prior result / no double-apply |
| Stale revision | Reject (`stale revision` / 40001) |
| Completed / expired session | Reject gameplay / join |
| Unauthorized actor | `forbidden` / 42501 |

## Out of scope

- External dogfood (#304 / Phase 9–10)
- New combat/rules mechanics
- Real multi-account CI without credentials (live path is opt-in)
