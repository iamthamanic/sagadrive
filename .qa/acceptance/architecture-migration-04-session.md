# Acceptance — architecture-migration-04-session (#168)

## Intent
Remove `src/modules/sessions/**`; GamemasterPanel under `app/session/**`.

## Happy Path
- [x] modules/sessions gone
- [x] contracts → domains/session/contracts
- [x] adapter → infrastructure/session/session-service
- [x] hooks → app/session/hooks; GamemasterPanel → app/session
- [x] SessionJoin consumer retargeted
