# Acceptance: meshy-avatar-text-to-3d-v2-base

## Intent
Avatar Meshy Text-to-3D must call Meshy OpenAPI **v2** even when shared `MESHY_API_BASE_URL` is `…/openapi/v1` (used by item image-to-3d). Users must not see generic “Provider nicht verfügbar” caused by a 404 on `/v1/text-to-3d`.

## Preconditions
- User has an active Meshy BYOK credential.
- Edge has `MESHY_API_BASE_URL=https://api.meshy.ai/openapi/v1` (local default).

## Happy Path
1. User starts avatar generation with a valid prompt (≥8 chars).
2. Edge resolves text-to-3d base as `https://api.meshy.ai/openapi/v2`.
3. Meshy create returns a task id (not 404).
4. UI shows generating job, not `provider_unavailable`.

## Edge Cases
- Explicit `MESHY_TEXT_TO_3D_BASE_URL` overrides shared base.
- Custom hosts without `/openapi/v1` suffix are left unchanged.
- Missing API key still returns not-configured (unchanged).

## Scope
- In: `avatar-meshy-text-to-3d.ts`, check script.
- Out: item image-to-3d paths, UI redesign.

## Security Coverage
- B-key: key stays server-side (unchanged).
- No new outbound hosts beyond existing Meshy API.

## Implementation Notes
- Added `normalizeMeshyTextTo3dBaseUrl` rewriting `/openapi/v1` → `/openapi/v2`.
- Root cause: shared env v1 + text-to-3d-only-on-v2 → HTTP 404 → opaque provider_unavailable.

## Implementation Notes (follow-up)
- Also: local DB missing migrations 024–026 → PostgREST insert `{}` / 500 after create succeeded. Applied via `scripts/apply-migrations.sh`; list extended through 026.
- Payload simplified to `{ mode: "preview", prompt }` (docs minimum) after v2 400 with art_style/should_remesh.
- Verified live: job `generating` at ~46% in UI + `character_avatar_meshy_jobs` row.
