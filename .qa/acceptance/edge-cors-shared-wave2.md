# Acceptance — edge-cors-shared-wave2 (#306)

## Intent
Migrate remaining Edge Functions to `_shared/cors.ts`; remove legacy CORS allowlist from CI.

## Acceptance
- [x] No Access-Control-Allow-Origin literals outside `_shared/cors.ts`
- [x] All function index.ts import `_shared/cors` (except dispatcher `main`)
- [x] `edge-cors-shared-check` green with empty legacy allowlist
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout)
- [x] `npm run test-gate` green for touched scope
