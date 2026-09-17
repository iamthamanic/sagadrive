# Composition Gate — meshy-avatar-generation

- HEAD_SHA: 1ecb75432795a7e01e6f91fe71add74d17b74f9d
- BASE_SHA: 1a88ea6a908a6836896e9bc7129586bb4a199954
- Verdict: CLEAR

## Event
Prompt confirm → Edge Meshy job → owner storage GLB → CharacterEditor model_url (capabilities pending #6)

## Hop chain
1. AvatarMeshyPanel (confirm + start)
2. character-avatar-meshy-service → Edge `character-avatar-meshy`
3. Meshy text-to-3d + SSRF download → `character-avatars` storage
4. Job poll → onSuccess(modelUrl) → CharacterEditor imported model
5. `rig_analysis_status: pending` until #6 (never from provider success)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Jobs owner-scoped by user id + RLS | pass |
| Invalid/missing | Bad prompt / no key → failed or provider-unavailable; prior avatar kept | pass |
| Two consumers / crash | Reload resumes via sessionStorage job id; no auto paid retry | pass |

## Flags
- none
