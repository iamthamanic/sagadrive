# Composition Gate — architecture-migration-03-project

- HEAD_SHA: f749ef06b5f17f45279191be6652e8ec9bc70f39
- BASE_SHA: 5c2db088ed4dbfa4345002a6e861bc2acb9e0846
- Date: 2026-09-07
- Verdict: CLEAR

## Event
User creates or joins a project by code; membership is established once via secure RPC.

## Hop chain
`ProjectJoin` → `useProjects.createProject|joinProject` → `projectService` → `projectMemberService.joinByCode` RPC → Supabase → UI callback onJoinAsGM/Player

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | 1 join click → 1 RPC → 1 membership | Single joinByCode call; no fan-out | pass |
| Invalid/missing | Bad code → error toast; no insert | RPC error thrown; no client INSERT | pass |
| Two consumers / crash | Double-click guarded by isJoining; remount does not duplicate join | isJoining flag; read-only listing after | pass |

## Flags
none

## Skip reason
n/a
