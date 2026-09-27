# Feature: Live Session role/capability/visibility contract

## Intent
UI-unabhängiger Live-Session-Zugriffsvertrag für player/gamemaster/viewer + director capability.

## Happy Path
- [ ] Pure role/capability/visibility domain contract + unit checks
- [ ] Infrastructure resolution is source of truth; client cannot invent capabilities
- [ ] Viewer never gets gm_only / character_specific
- [ ] Director-only cannot run gameplay_mutate
- [ ] Legacy gm/observer aliases compatible
- [ ] test-gate green

## Composition Gate
See `.qa/runs/composition-gate-live-session-role-capability-contract.md`

## Implementation Notes
- `src/domains/session/contracts/live-session-access.ts`
- `src/infrastructure/session/live-session-access.resolver.ts`
