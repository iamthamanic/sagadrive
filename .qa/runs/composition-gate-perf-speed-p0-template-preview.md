# Composition Gate — perf-speed-p0-template-preview

- HEAD_SHA: 0c54f9d46ff34c4491829bcee724dd8a424d8715
- BASE_SHA: 6532615b07aae662e2f792169bbedba9f1f5280b
- Date: 2026-10-10
- Verdict: CLEAR

## Event
Editor resolves a species-template mesh URL for 3D preview; character save persists a fidelity mesh URL; lobby loads roster display names for bound character ids.

## Hop chain
1. `resolveSpeciesTemplateModelUrl({ quality })` (domain) → `useCharacterAvatarEditor` (`preview` display / `fidelity` persist) → `AvatarCanvas` / `CharacterStudioRuntime.loadModel`
2. `getCharacterRosterMetaByIds` (repo, owner-scoped `in(id)`) → `characterService` → `useSessionLobby` roster labels
3. Project list UIs that only need id/name/status → `getUserProjectSummaries` (existing slim path) instead of per-project `select('*')` fan-out

## Simulations
| Case | Result |
|------|--------|
| N-actors: 1 editor loads Human + feminine | One preview VRM (canonical); no face3 on critical path |
| Invalid/missing: divers / unset gender | No mesh URL (fail-closed, unchanged) |
| Two consumers / crash: lobby roster + editor save | Batch meta omit missing ids → fallback name; persist still writes fidelity URL independently of preview load |

## Flags
None.

## Notes
Allowlist expanded to `/assets/avatars/canonical/**` for preview only. Docker Mode C timings for lobby/project remain unmeasured — shape fix only. Tip commit after this proof is qa-stamp only (`proofOnlyChangesSince`).
