# Composition Gate — edge-cors-shared-wave1 (#305)

**Verdict:** SKIPPED  
**Reason:** Single-hop chore — shared CORS helper + CI check; no producer→consumer / outbox / multi-actor hop chain.  
**HEAD (at write):** pending commit on `issue-305-edge-cors-shared-wave1`  
**WORKTREE:** CORS shared module, 5 migrated functions, edge-cors-shared-check, test-gate wire, AGENTS.md rule

## Scope checked
- `supabase/functions/_shared/cors.ts`
- 5 wave-1 Edge Functions
- `scripts/edge-cors-shared-check.mjs`
- `scripts/test-gate.mjs`
- `AGENTS.md`
