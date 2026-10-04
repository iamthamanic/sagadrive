# Design — live-scene-runtime-v2 (#366)

## Intent
Reference-based Live Scene container over #301 SharedScenePresentation. No embedded Character/NPC/Look/Item copies.

## Approach
- Domain: `ScenePresentationConfigV2` + `SceneLiveRef` in `domains/session/presentation/`
- Normalize V1 `scenePresentation` → V2 refs (title/backdrop/actors retained as public projection fields; new refs optional/null)
- Look: `lookRef` opaque id only; resolve via Look domain later; missing → neutral
- Public projection strips gmNoteRefs / secret reveal payloads
- GM projection includes note/reveal refs (ids only, not secret bodies)
- Persistence: store optional `scenePresentationV2` alongside V1 OR normalize on read from V1 without mandatory migration
- Prefer read-normalize for zero break; optional publish path writes V2 envelope when GM activates scene

## Non-goals
- New Look/Avatar/World engines
- Embedding definition blobs
- Full Director preset runtime (#375)
