# Composition Gate — player-test-player-panel-v1

- HEAD_SHA: ba89bf48116e0b0772382b403c2047430aa7cc5a
- BASE_SHA: 70ce83029c935276ccb974d6a2f2710ad1d000f4
- Date: 2026-09-20
- Verdict: CLEAR

## Event
Player live view opens → session UUID + character load → Player Panel model → optional check command as shared session event.

## Hop chain
1. **Producer (UI):** `SessionResourceScreen` (`liveView=player`) → `PlayerPanel` / `usePlayerPanel`
2. **Resolve:** `projectService.getSessionByPublicIds` + `characterService.getCharacterByPublicId` (auth/RLS)
3. **Runtime:** `useSessionRuntime` snapshot+subscribe (#297)
4. **Project:** pure `buildPlayerPanelModel` (derived stats, inventory read-first, connection banners)
5. **Side-effect (check):** `applyCommand({ kind: 'roll', … })` → `apply_session_runtime_command` → `session_events` + revision → Realtime refresh for all clients

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Each check is one runtime command with idempotency key; all clients converge via snapshot | CLEAR |
| Invalid/missing | No characterPublicId / load error → Error banner; offline self → Disconnected; no forged HP (derived + optional shared overlay only) | CLEAR |
| Two consumers / crash | GM + player both subscribe; check appears as shared event after refresh; retry key prevents double-apply | CLEAR |

## Flags
None.
