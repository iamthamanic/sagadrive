# Composition Gate — avatar-facial-expressions-lipsync

- HEAD_SHA: 5089c824d1795b5cfaa92c252f81faacdb07050e
- BASE_SHA: d767b8d02a50764cce49f08792733c15df4a5c2e
- Verdict: CLEAR

## Event
VRM load → resolveFacialAvailability → AvatarFacialRuntime.bind → Preview Controls setWeight/reset → expressionManager.setValue

## Hop chain
1. CharacterStudioRuntime.loadModel (VRM)
2. Domain facial aliases + layer rules
3. AvatarFacialRuntime transient weights
4. Consumers: AvatarFacialPreviewControls (no appearance persistence)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | One facial runtime per bind; reset on reload | pass |
| Invalid/missing | Missing shapes omitted; fail-soft message | pass |
| Two consumers / crash | Rapid emotion/viseme updates; reset clears stuck weights | pass |

## Flags
- none
