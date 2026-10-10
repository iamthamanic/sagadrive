# Issue #569 — saga-state-column-privileges

## Phase log
- implement: done
- verify: in progress
- composition: pending (likely SKIPPED — no producer→consumer hop chain)
- review/ecc-check/pr/merge: pending

## Files
- supabase/migrations/059_saga_state_column_privileges.sql
- src/infrastructure/project/project-service.ts
- src/infrastructure/session/session-service.ts
- scripts/saga-state-column-privileges-check.mjs
- scripts/test-gate.mjs
- scripts/apply-migrations.sh
- .qa/acceptance/saga-state-column-privileges.md
- .qa/design/saga-story-session-simulation.md
