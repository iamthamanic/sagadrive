# Acceptance — edge-cors-shared-wave1 (#305)

## Intent
Shared CORS helper for Edge Functions + CI gate; migrate 5 echo/allowlist functions.

## Acceptance
- [x] `supabase/functions/_shared/cors.ts` exports `corsHeaders` + `handleOptions` (+ optional `jsonResponse`)
- [x] The 5 echo/allowlist functions import `_shared/cors` and set no local `Access-Control-Allow-Origin`
- [x] `scripts/edge-cors-shared-check.mjs` runs in `test-gate` and fails on new local CORS origin literals outside allowlist/shared
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout)
- [x] `npm run test-gate` green for touched scope
