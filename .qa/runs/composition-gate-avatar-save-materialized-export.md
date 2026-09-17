# Composition Gate — avatar-save-materialized-export

- HEAD_SHA: e55cff3fb06f9b4ff72217b09eae1cf146e0d0b5
- BASE_SHA: f0d130aeb2734f1b0712c97ac58929035109200d
- Verdict: CLEAR

## Event
Character Save → materializeAvatarSaveExport → owner-scoped GLB + model_url update → characterService persist

## Hop chain
1. CharacterEditor.handleSaveCharacter (producer: compact avatar draft)
2. buildAvatarSaveExportPayload (filters runtime overlays; base traits + morph)
3. encodeAvatarExportGlb → storage upload → character_avatar_export_assets active row
4. Consumers: AvatarCanvas via model_url; appearance.avatar morph remains SoT on reload

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | One active export per (owner, character); prior deactivated after success | pass |
| Invalid/missing | Export fail → prior model_url kept; draft not cleared; no active flip | pass |
| Two consumers / crash | Signed URL fail rolls back is_active; compact avatar unchanged | pass |
| Overlay present | Helmet/armor overlay not in export payload.runtimeOverlays / baseTraits | pass |

## Flags
- none
