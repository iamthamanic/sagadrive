# Composition Gate — provider-agnostic-3d-generation (+ 150MB import + sheet_status gate)

- HEAD_SHA: c3b328c0931dcbfcc7c3348aba9a5aedc141b3bb
- BASE_SHA: 185a0472506e5dd79fe571c114590ad27ab44f64
- Date: 2026-09-19
- Verdict: CLEAR

## Event
User starts avatar 3D generation with provider/preset/settings; job persists frozen settings; pipeline remesh/rig/stores runtime (+ optional master). User imports GLB ≤150MB. Incomplete character cannot be marked complete without build payloads; adventure join requires complete.

## Hop chain
AvatarMeshyPanel (settings) → character-avatar-meshy-service → Edge start (validateGenerationSettings + model allowlist) → character_avatar_meshy_jobs.generation_settings → poll (claim remesh/rig before paid create) → store → modelUrl UI
Import: AvatarImportPanel → validateAvatarImportBytes(150MB) → storage character-avatars (bucket+FILE_SIZE_LIMIT 150MB)
sheet_status: repository asserts → DB trigger 035 → join RPC 032

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors (1 start, N polls) | one job row; materialize once | claim-before-create + owner poll | pass |
| Invalid/missing modelId / settings | no Meshy create | edge 400 validation | pass |
| Two consumers / crash same job poll | one remesh/rig create; one storage write | null-guard claim + owner-scoped materialize | pass |
| incomplete → complete via PostgREST only | blocked without payloads | trigger 035 | pass |

## Flags
| Tag | Severity | Status |
|-----|----------|--------|
| (none open) | — | — |

## Skip reason
n/a
