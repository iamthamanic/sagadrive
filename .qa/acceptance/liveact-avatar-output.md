# Feature: LiveAct 4/7 — VRM + Generic GLB Avatar Output

<!-- refined from issue #332 -->

## Intent

Atomarer LiveActFrame auf VRM (Humanoid/LookAt/Expressions) oder GLB (Rig-Kopf + Morph-Aliases).
Fehlende Kanäle über Capability-Matrix — kein pauschales „Facial unavailable“.

## Preconditions

- #329 LiveActEngine + domain contract
- #331 Face diagnostics + calibration

## Happy Path

- [ ] `AvatarFacialRuntime.applyWeightsBatch` für LiveAct ohne Emotion/Viseme-Sibling-Nulling; Preview-`setWeight` unverändert
- [ ] `VrmLiveActAvatarOutput` + `GltfLiveActAvatarOutput` über `createLiveActAvatarOutput`
- [ ] Capability-Matrix: `head`, `leftEye`, `rightEye`, pro `LiveActFaceChannel` supported/unavailable
- [ ] `LiveActEngine.bindOutput` aus Editor-Surface wenn Tracking aktiv
- [ ] Stop/unbind → `resetLiveActPose`
- [ ] `scripts/liveact-avatar-output-check.mjs` + `npm run test-gate` grün

## Edge Cases

- [ ] Nur Head Bone: Head ok, Facial unavailable in Matrix
- [ ] Blink L/R und Smile L/R getrennt (kein max-Merge)
- [ ] JawOpen + Smile gleichzeitig
- [ ] Model-Swap: alter Output dispose, neuer analysiert

## Security Coverage

| Item | How |
|------|-----|
| P-04 | Nur lokale Model-Manipulation; Capabilities = Metadaten |
| F-03 | Keine neuen Netzwerk-/Persistenzpfade |

## Implementation Notes

- Domain: `liveact-channel-target-aliases.ts`
- Infra: `vrm-liveact-avatar-output.ts`, `gltf-liveact-avatar-output.ts`, `liveact-morph-target-index.ts`
- Studio: `character-studio-runtime.ts` rebuild + bind
- App: `AvatarSurfaceViewer.tsx`, `useLiveActViewport.ts`, `AvatarCanvas.tsx`
