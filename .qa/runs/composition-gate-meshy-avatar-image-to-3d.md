# Composition Gate — meshy-avatar-image-to-3d

- HEAD_SHA: 185a0472506e5dd79fe571c114590ad27ab44f64 (working tree; re-pin on commit)
- BASE_SHA: prior meshy-avatar-generation composition
- Verdict: CLEAR

## Event
Mode Text|Bild → Edge Meshy text-to-3d **or** image-to-3d → owner storage GLB → CharacterEditor model_url (capabilities pending #6)

## Hop chain
1. AvatarMeshyPanel mode Text (prompt → mesh) **or** Bild (image → mesh, optional texture_prompt → look only)
2. character-avatar-meshy-service → Edge `character-avatar-meshy` with `generationMode`
3. Provider create: text-to-3d **or** image-to-3d (`image_url` data URI, `pose_mode: a-pose`); job stores `generation_mode`
4. Poll uses `generation_mode` for status URL; materialize once → onSuccess(modelUrl)
5. `rig_analysis_status: pending` until #6 (never from provider success)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Jobs owner-scoped by user id + RLS | pass |
| Invalid/missing | No image / bad type/size / short text prompt → client gate or 400; prior avatar kept | pass |
| Two consumers / crash | Reload resumes via sessionStorage when provider_task_id exists; image retry without bytes asks re-upload | pass |

## Flags
- none

## Notes
- UI never implies prompt+image jointly drive geometry.
- Refine-with-texture-image deferred.
