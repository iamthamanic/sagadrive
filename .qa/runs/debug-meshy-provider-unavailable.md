# Debug: Provider nicht verfügbar — Meshy derzeit nicht erreichbar

## Symptom
UI showed `provider_unavailable` / “Meshy derzeit nicht erreichbar.” despite BYOK configured.

## Evidence
- Edge log: `Meshy text-to-3d create failed (404)`
- Env: `MESHY_API_BASE_URL=https://api.meshy.ai/openapi/v1` (shared with image-to-3d)
- Probe: `POST …/v1/text-to-3d` → 404 NoMatchingRoute; `…/v2/text-to-3d` → 401 (route exists)

## Root causes (stacked)
1. Avatar adapter reused v1 base → 404 → opaque provider_unavailable.
2. After v2 fix: optional payload fields caused 400.
3. After create OK: migration 026 not applied locally → insert failed → non-2xx.

## Fix
- Normalize `/openapi/v1` → `/openapi/v2` for text-to-3d (+ optional `MESHY_TEXT_TO_3D_BASE_URL`).
- Minimal create body.
- Apply migrations 024–026; update apply-migrations.sh list.
