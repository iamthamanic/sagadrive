# Composition Gate — avatar-inspect-camera-frames

- HEAD_SHA: WORKTREE
- Date: 2026-09-19
- Verdict: SKIPPED

## Event
User toggles inspect / picks a camera frame in the Character Editor 3D preview.

## Hop chain
UI `AvatarCameraViewControls` → `CharacterStudioRuntime` OrbitControls (local only)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | n/a (local camera) | no shared state | pass |
| invalid | disabled when not ready | UI disabled | pass |
| 2 consumers | n/a | — | pass |

## Flags
none

## Skip reason
Single-hop client camera UX; no producer→persist→consumer path.
