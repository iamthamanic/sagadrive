# Acceptance — audit-fix-open-findings

## Intent
Close remaining security/audit blockers from the post-PR#245 gate: incomplete-sheet gameplay exposure, GLB download DoS, Meshy characterId ownership, sanitized provider errors, shorter signed URLs, and worktree typecheck visibility.

## Preconditions
- Migrations through `031` applied locally.
- Character editor can still save `sheet_status=incomplete` drafts.

## Happy Path
- [ ] Incomplete characters cannot be selected/joined into adventures/sessions (or equivalent gameplay entry) — fail closed with clear DE message.
- [ ] Meshy GLB download aborts when streamed bytes exceed max without relying on Content-Length alone.
- [ ] Meshy start with foreign/non-owned `characterId` nulls or rejects the id (owner-scoped only).
- [ ] Provider failure messages shown in UI are generic DE strings (no raw Meshy detail slices).
- [ ] Avatar/portrait signed URLs use ≤ 7 days TTL (or documented refresh path).

## Edge Cases
- [ ] Incomplete draft still saves and shows Unvollständig badge in library/editor.
- [ ] Complete characters still join gameplay as before.
- [ ] GLB under limit still validates magic + stores.
- [ ] `assertOwnerScopedStoragePath` + 031 client write drop remain intact.

## Security Coverage
- B-01: path prefix + no client job writes (already) — reaffirm
- B-04 / CWE-400: streamed byte counter on Meshy download
- CWE-20: incomplete sheet not usable in gameplay
- P-02: sanitize provider errors to UI

## Out of scope
- Full headed WebGL portrait visual framing QA (manual)

## Implementation Notes
- Migration `032` + schema_v3_rls: incomplete PC blocked from adventure join/assign.
- GLB stream byte cap + Deno test; Meshy owned characterId, sanitized errors, 7d signed URLs.
- Portrait magic-byte sniff + 7d TTL; worktree typecheck via changed-typescript.mjs.
