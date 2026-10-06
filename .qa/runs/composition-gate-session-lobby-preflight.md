# Composition Gate — session-lobby-preflight

- HEAD_SHA: cf1959dab85df6f10c0e7c9324a886cf84a2447d
- BASE_SHA: 0587902af98056bfd6ba62b9e134dfe04a15bcdd
- Date: 2026-10-06
- Verdict: CLEAR

## Event

After SessionJoin, user lands in Lobby; roster/ready sync; explicit media probes; CTA opens authorized live route by membership role.

## Hop chain

SessionJoin create/join → `resolveCanonicalLobbyEntry` → `/sagas/…/lobby` → `useSessionLobby` (projectService + sessionService roster) → ready broadcast (`session-lobby-channel`) → `decideLobbyEnterLive` → `pathForSessionLive` (player|gamemaster)

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each member sees own ready via broadcast; roster from membership | channel per sessionId; roster from session_players | pass |
| Invalid/missing | No membership → German error, no enter | hook membership gate | pass |
| Two consumers / crash | Ready broadcast loss still allows enter; media deny never blocks | mediaBlocksEnter=false; enter uses membership character | pass |
| GM starts while players not ready | Allowed | decideLobbyEnterLive ignores peer ready | pass |
| Player without character | Enter blocked with DE reason | enterDisabledReasonDe | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason
n/a
