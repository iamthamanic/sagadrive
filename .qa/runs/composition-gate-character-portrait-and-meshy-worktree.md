# Composition Gate — meshy-avatar-auto-rig

- HEAD_SHA: WORKTREE (uncommitted since 185a047 / PR #245)
- Date: 2026-09-19
- Verdict: CLEAR

## Event
Meshy mesh SUCCEEDED → Edge materialize may remesh → Auto-Rig → store one owner-scoped GLB → client loads → `#6` analyzes capabilities (pending until runtime).

## Hop chain
Producer: Meshy text/image task SUCCEEDED
→ Edge poll (`character-avatar-meshy`) status `rigging`
→ optional remesh (`remesh_task_id`) → Auto-Rig (`rig_task_id`)
→ download allowlisted GLB → Storage `character-avatars/{owner}/…`
→ job `succeeded` + `modelUrl` + `rig_analysis_status: pending`
→ Client `AvatarCanvas` load → `analyzeAvatarRigFromObject3D` (#6)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | one job row / owner; one stored GLB | idempotency_key + owner_user_id; task ids persisted once | pass |
| invalid / missing | Auto-Rig fail → job `failed`, no fake ready static | fail closed with DE error_message; capabilities stay pending | pass |
| 2 consumers / crash | poll re-entry does not double-create remesh/rig | existing remesh_task_id / rig_task_id reused | pass |

## Flags
None open (migration `030` applied on local DB during gate).

## Skip reason
n/a
