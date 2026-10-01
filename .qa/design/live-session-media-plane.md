# Design: live-session-media-plane (#363)

## Architecture

- Domain: grants, room id, presence types — no SDK
- Infra: Memory (tests) + LiveKit adapter (factory-injected) + token client + facade
- Edge: `session-media-token` — auth → membership → mint LiveKit JWT or degraded 503
- App: thin `useSessionMediaPlane` hook

## Env (server)

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Without these, sessions run with media plane unavailable (non-blocking)

## Follow-ups

- #364 Remote LiveAct data channel over this plane
- Wire LiveKit room factory in production shell when SFU is deployed
