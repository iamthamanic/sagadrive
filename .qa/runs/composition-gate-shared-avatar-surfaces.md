# Composition Gate — shared-avatar-surfaces

- HEAD_SHA: fc8e6d02f0edb506564a301238f02df25b9452e4
- BASE_SHA: 10a3fd37613c52186c15a71861e174e7c532783c
- Verdict: CLEAR

## Event
Surface resolve → AvatarSurfaceViewer (portrait|3d) → Library/Sheet/Session/Token/Player

## Hop chain
1. resolveAvatarSurfaceView (mode + bound + fallback)
2. AvatarSurfaceViewer / AvatarCanvas
3. Library portrait; Sheet full-3d; Session strip; Token/Player panels
4. appearance.avatar + portrait_url only — no inventory in viewer

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | live3dCount caps WebGL at MAX | pass |
| Invalid/missing | no model/WebGL → portrait initials | pass |
| Two consumers / crash | Sheet + Session share contract; dispose via AvatarCanvas | pass |

## Flags
- none
