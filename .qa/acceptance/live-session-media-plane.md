# Feature: Live Session Media Plane

<!-- issue #363 — feature slug: live-session-media-plane -->

## Intent

Separate realtime media plane (WebRTC/SFU via LiveKit adapter) for camera/mic/ephemeral data; durable gameplay stays in Supabase. Membership-derived short-lived tokens; degrade without corrupting session.

## Happy Path

- [ ] Domain media contract + grants separate from SessionRuntimeState persistence
- [ ] Edge `session-media-token` issues membership-derived short-lived tokens (or degraded when LiveKit unset)
- [ ] Publish/subscribe policy: viewer receive-only; player/GM can publish A/V
- [ ] Media outage → degraded status; gameplay continues
- [ ] No LiveKit SDK in domain/app; adapter in infrastructure
- [ ] Tests: authz, reconnect, permission/outage degrade, role downgrade
- [ ] test-gate green

## Security Coverage

- Token from auth + membership; secret stays server-side
- Explicit gesture required before publish (app hook `publishAfterGesture`)
- Viewer cannot publish

## Composition Gate

SKIPPED proof — token hop is request/response; media SFU is ephemeral (no durable outbox). See runs.

## Implementation Notes

- `src/domains/session/media/**`
- `src/infrastructure/session/media/**`
- `supabase/functions/session-media-token`
- `src/app/session/media/useSessionMediaPlane.ts`
