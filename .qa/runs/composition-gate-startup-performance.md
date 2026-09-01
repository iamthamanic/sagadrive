# Composition Gate: startup-performance

HEAD_SHA: pending (local)
Verdict: **SKIPPED**

## Reason
No multi-hop producer→consumer records, bulk side-effects, override/fallback retargeting, or shared-destination fan-out in this diff. Changes are:

- Client-side lazy imports (App.tsx)
- Auth/query timeouts (networkTimeout, authenticatedUser, auth-context)
- Dev-only DevTrack dynamic import
- Vite manualChunks for vendor/three-vrm

## Simulations
- **N-actors:** N/A — no event fan-out
- **Invalid/missing config:** Auth timeouts fail-open to login/offline user; query timeouts surface errors in hooks (no silent retarget)
- **Concurrent consumers:** N/A

## Verdict
**SKIPPED** — no composition hop-chain in scope.
