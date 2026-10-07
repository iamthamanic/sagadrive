# Composition gate — #492 Session Prepare/Recap

**HEAD (at gate):** will match commit after ship  
**Verdict:** CLEAR

## Path reconstructed
1. URL phase `auto` → `SessionAutoPhaseRedirect` → `resolveLifecycleScreenFromStatus(status)` → replace to prepare|live|recap
2. Prepare → Invite share (existing #490) + Lobby path (`pathForSessionLobby`) — no parallel join
3. Recap → `projectAdventureRuntimeForAudience` on adventure consequences → UI highlights
4. GM next session → `projectService.createProjectSession({ projectId })` → navigate prepare of new session same saga

## Simulations
- N=1 GM scheduled: auto→prepare; primary→lobby
- N=1 player completed: recap highlights exclude gm_only (projection)
- Concurrent: next-session create is single RPC per click (no fan-out)
- Invalid: non-member → error string; non-GM next-session blocked in hook

## Notes
Single-hop UI + pure domain; no outbox/bulk. Audience cardinality unchanged vs #374 projection.
