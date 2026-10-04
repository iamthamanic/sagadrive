# Composition Gate — live-scene-runtime-v2

- HEAD_SHA: c936198b0f86349051876c86c346e41cc7b3ae75
- BASE_SHA: dd7054ce989411c71bbf2114765001f8107ee9fa
- Date: 2026-10-05
- Verdict: CLEAR

## Event
Session shared scene is read as V2 reference config; Program/display project public scene without GM notes.

## Hop chain
```text
shared.scenePresentation (V1)
→ normalizeScenePresentationV1 / readScenePresentationConfigV2
→ buildScenePresentationPublicProjection
→ resolveProgramScene → ProgramDisplayShell
```

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Multiple surfaces read same normalized V2 | shared blob + normalize | pass |
| Invalid/missing | Null V1 → null config; viewer denied GM projection | fail-closed | pass |
| Two consumers / crash | Program + player V1 view via V2→V1 project | independent | pass |

## Flags
none
