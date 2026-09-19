# Composition Gate — audit-fix-open-findings

- HEAD_SHA: WORKTREE
- Date: 2026-09-19
- Verdict: CLEAR

## Event
Player tries to join/assign an incomplete character to an adventure → rejected; Meshy/poll materialize still one owner-scoped GLB + sanitized errors.

## Hop chain
Producer: `join_project_by_code` / `set_my_project_character` (SECURITY DEFINER)
→ characters.sheet_status check
→ project_members write only if complete PC owned by auth.uid()

Meshy: Edge start/poll → owned characterId only → download with byte cap → storage `${userId}/…` → publicMeshyFailure on fail (no raw provider text in job.error_message)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 incomplete PC × join | reject | RAISE 22023 DE message | pass |
| complete PC × join | allow | INSERT membership | pass |
| oversized GLB stream | abort | readResponseBodyWithByteCap | pass |

## Flags
none

## Skip reason
n/a
