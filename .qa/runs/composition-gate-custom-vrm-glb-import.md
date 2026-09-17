# Composition Gate — custom-vrm-glb-import

- HEAD_SHA: WORKTREE
- Date: 2026-09-17
- Verdict: CLEAR

## Event
User imports a VRM/GLB; after validation one owner-scoped artifact becomes active and AvatarCanvas uses its signed URL; rig analysis stays pending for #6.

## Hop chain
Producer (AvatarImportPanel file pick)
→ earlyCheck (UX) → validateAvatarImportBytes (authoritative)
→ Storage upload character-avatars/{uid}/{id}.ext
→ character_avatar_import_assets row (is_active, rig_analysis_status=pending)
→ model_url on CharacterAvatarDto → AvatarCanvas loadModel

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One confirmed import → one active artifact per character | deactivate prior actives then insert active | pass |
| invalid / missing | Bad magic/size/URI → no active artifact, prior model kept | throw before upload / remove on insert fail; UI keeps importedModelUrl | pass |
| 2 consumers / crash | Retry after fail does not leave orphan active | active only after insert success; upload removed if insert fails | pass |

## Flags
(none)

## Skip reason
n/a
