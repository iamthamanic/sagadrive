# Composition Gate — avatar-animation-retargeting

- HEAD_SHA: 6031feba117422f46793774332fab9c229bd8f76
- BASE_SHA: a70cc4bc29b6748046024712a32cf264ddc76e2c
- Verdict: CLEAR

## Event
Rig analysis ready → resolveAvatarAnimationSupport → AvatarAnimationRuntime.bind → Preview Controls play → mixer crossfade + attachment rebind

## Hop chain
1. CharacterStudioRuntime.loadModel / analyzeAvatarRigFromObject3D (producer)
2. resolveAvatarAnimationSupport + allowlisted catalog (domain)
3. AvatarAnimationRuntime procedural clips on mapped bone handles + attachment fixture
4. Consumers: AvatarAnimationPreviewControls + AnimationMixer frame update

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | One mixer per bound root; prior mixer disposed on reload | pass |
| Invalid/missing | Partial/unrigged → unsupported reasons; no crash; no capability elevate | pass |
| Two consumers / crash | Rapid action switch crossfades; stale load disposed | pass |

## Flags
- none
