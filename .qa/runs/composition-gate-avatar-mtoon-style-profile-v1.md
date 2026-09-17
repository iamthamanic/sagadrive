# Composition Gate — avatar-mtoon-style-profile-v1

- HEAD_SHA: d703ac33b56ef3596b5b9a0837c05967d623603a
- BASE_SHA: 5171597db3244d1c845612a40f8611a1d45c8ce7
- Date: 2026-09-17
- Verdict: CLEAR

## Event
Avatar model materials are styled via a single SagaDriveMToonProfileV1 consumed by CharacterStudioRuntime (and portrait capture).

## Hop chain
Producer (loaded VRM/GLB materials)
→ detectHasMtoonMaterials / resolveMtoonRenderPath
→ applyMtoonProfileToModel + lights/renderer
→ AvatarCanvas notice + capturePortraitDataUrl

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One style profile per runtime | singleton styleProfile on runtime | pass |
| Invalid/missing | No MToon → pbr-fallback + notice | resolveMtoonRenderPath | pass |
| Two consumers / crash | Portrait uses same renderer after apply | capturePortraitDataUrl → renderNow | pass |

## Flags
(none)

## Skip reason
n/a
