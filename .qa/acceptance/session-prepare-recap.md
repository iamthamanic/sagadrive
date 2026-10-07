# Acceptance — session-prepare-recap-journey (#492)

Slug: `session-prepare-recap-journey`

## Intent
`prepare` and `recap` are real product surfaces on the lifecycle
`Prepare → Lobby → Live → Completed → Recap`, with invite/lobby entry
from Prepare and audience-safe Recap from session/adventure state.

## Given / When / Then

### Prepare is not a placeholder
- Given a member opens `/sagas/:saga/sessions/:session/prepare`
- When the screen loads
- Then `data-au-surface="session-prepare"` and session metadata render
- And Invite (GM) + Lobby CTA are available without a parallel join flow

### Recap is not a placeholder
- Given a member opens `/sagas/:saga/sessions/:session/recap`
- When the screen loads
- Then `data-au-surface="session-recap"` shows status, roster, and projected highlights
- And GM can create the next same-saga session via primary CTA

### Status resolution is deterministic
- Given a session URL without an explicit phase (`auto`)
- When status is `scheduled` / `active|paused` / `completed|cancelled`
- Then navigation lands on `prepare` / `live` / `recap` respectively
- And lobby remains an explicit hop (never auto)

### Audience bounds
- Given adventure consequences with `gm_only` visibility
- When a player opens Recap
- Then only `public`/`shared` lines appear (via `projectAdventureRuntimeForAudience`)

## Non-goals
- No LLM story summary requirement
- No campaign wiki / full replay

## Evidence
- Domain: `src/domains/session/contracts/session-prepare-recap.ts`
- Screens: `SessionPrepareScreen`, `SessionRecapScreen`, `SessionAutoPhaseRedirect`
- Check: `scripts/session-prepare-recap-check.mjs`
- E2E: `e2e/session-prepare-recap.spec.ts`
- Golden mobile: prepare + recap AU surfaces
