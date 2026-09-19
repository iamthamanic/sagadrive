# Security audit follow-up — Meshy job IDOR

**Date:** 2026-09-19  
**Source:** [Security audit since PR245](b32338c6-62f3-4e96-b12e-cdbf9ab07fc9)  
**Verdict after fix:** High IDOR mitigated (re-audit recommended)

## High finding (B-01)

Client RLS UPDATE on `character_avatar_meshy_jobs` + Edge service-role sign of `storage_path` without owner prefix.

## Fix shipped in worktree

1. `assertOwnerScopedStoragePath(userId, path)` before poll sign — `character-avatar-meshy/index.ts`
2. Migration `031_character_avatar_meshy_jobs_no_client_write.sql` — drop authenticated INSERT/UPDATE; Edge/service_role only
3. `avatar-meshy-generation-check.mjs` asserts both

## Still open (Medium / Low from auditor)

- Gameplay gate for `sheet_status=incomplete`
- Streamed GLB byte cap (DoS)
- MIME magic-byte / signed URL TTL / provider error text to UI
