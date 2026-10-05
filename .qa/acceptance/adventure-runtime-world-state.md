# Acceptance — adventure-runtime-world-state (#374)

## Intent
Typed, versioned AdventureRuntime / World State separate from adventure definitions. Persist across pause/resume and saga continuity via `projects.adventure_runtime`.

## Source of truth
- Domain: `src/domains/session/contracts/adventure-runtime-state.ts`
- SQL: `050_session_adventure_runtime.sql`
- UI: `AdventureRuntimeControls` on GM World tab
- Gate: `scripts/adventure-runtime-world-state-check.mjs`

## Acceptance
- [x] definitionRef vs runtime instance separated
- [x] typed/versioned state persists (session shared.adventure + project.adventure_runtime)
- [x] no mutation of NPC/Item/Scene definition tables
- [x] player/viewer projection strips gm_only
- [x] stale revision / idempotency via existing runtime command path
- [x] test-gate green
