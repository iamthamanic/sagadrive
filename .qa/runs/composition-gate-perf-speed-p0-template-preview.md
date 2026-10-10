# Composition Gate — perf-speed-p0-template-preview

- HEAD_SHA: 4a08c65561afdc3d61b3634dd404cfc049f383a6
- Date: 2026-10-10
- Verdict: CLEAR

## Event
Editor resolves a species-template mesh URL for 3D preview; character save persists a fidelity mesh URL; lobby loads roster display names for bound character ids.

## Path (producer → consumer)
1. `resolveSpeciesTemplateModelUrl({ quality })` (domain) → `useCharacterAvatarEditor` (`preview` display / `fidelity` persist) → `AvatarCanvas` / `CharacterStudioRuntime.loadModel`
2. `getCharacterRosterMetaByIds` (repo, owner-scoped `in(id)`) → `characterService` → `useSessionLobby` roster labels
3. Project list UIs that only need id/name/status → `getUserProjectSummaries` (existing slim path) instead of per-project `select('*')` fan-out

## Simulations
| Case | Result |
|------|--------|
| N actors: 1 editor loads Human + feminine | One preview VRM (canonical); no face3 on critical path |
| N actors: save character after preview | Persist writes fidelity face3 URL; reopen still uses preview for display |
| Invalid / divers gender | No mesh URL (fail-closed, unchanged) |
| Lobby with N bound characters (owner-visible) | One batch meta query; missing ids → fallback name |
| Concurrent consumers | LiveAct engine still single shared singleton; acquire deferred until Tracking |

## Flags
None.

## Notes
Allowlist expanded to `/assets/avatars/canonical/**` for preview only. Docker Mode C timings for lobby/project remain unmeasured — shape fix only.
