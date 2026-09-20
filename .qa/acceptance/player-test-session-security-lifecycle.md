# Feature: Player Test Session Security & Self-Host Lifecycle

Issue: #296 (Epic: #210) · Slug: `player-test-session-security-lifecycle`

## Intent

Session create/join/leave/rejoin and status changes are server-authorized: join codes are generated server-side with unique constraint + collision retry; the hardcoded Hosted-Supabase join path is removed; clients never invent identity fields.

## Acceptance

- [ ] Session codes generated server-side with unique constraint + collision retry
- [ ] Hardcoded Hosted make-server join removed from `session-service`
- [ ] Join / create / status / leave via authenticated RPCs
- [ ] Character pick limited to owned complete PCs
- [ ] Status flow waiting→active→paused→completed authorized for GM
- [ ] Gate script + `npm run test-gate` green

## Implementation Notes

- Migration `040_session_join_code_security.sql`; RPCs `create_play_session`, `join_session_by_code`, `set_session_status`, `leave_play_session`.
- SessionJoin requires project selection; no client `Math.random()` codes.
