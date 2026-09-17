# Composition Gate — avatar-save-materialized-export

- HEAD_SHA: 85562f8d0f8cbb095a909f85813c0c44e8d9adc5
- BASE_SHA: f0d130a1856535f606a482d24281e32bf7a85e8d
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
