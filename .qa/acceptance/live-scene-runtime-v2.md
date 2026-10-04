# Acceptance — live-scene-runtime-v2 (#366)

## Criteria
- [x] Scene V2 reference-based and domain-pure
- [x] V1 SharedScenePresentation normalizes without breaking sessions
- [x] Public projection excludes gmNoteRefs / secrets
- [x] lookRef opaque LookProfile id only (no local Look copy)
- [x] 2D backdrop/neutral fallback when Look/3D unavailable
- [x] test-gate `live-scene-runtime-v2-check` green

## Implementation Notes
- Domain: `src/domains/session/presentation/scene-live-runtime-v2.ts`
- Program Output resolves scene via V2 normalize (#365 bridge)
- No DB migration required (read-normalize)
