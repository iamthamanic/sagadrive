# Composition Gate — live-session-role-capability-contract

- HEAD_SHA: a2e06c0ce26b5fcd85b6871167ddbc96be1ae01c
- BASE_SHA: c7de8166c3ad0e284266c56340660ada6f5dd393
- Date: 2026-09-27
- Verdict: CLEAR

## Event
Authoritative membership resolves LiveSessionAccess; read models and commands are filtered by role/capability.

## Hop chain
1. Infrastructure loads membership (RLS) → AuthoritativeSessionMembership
2. `resolveLiveSessionAccessFromMembership` validates via domain (fail-closed)
3. `buildLiveSessionReadModel` / `filterPayloadForAccess` strips gm_only for viewers
4. `canExecuteLiveSessionCommand` gates gameplay vs director cues
5. Client-claimed capabilities ignored via `rejectClientCapabilityElevation`

## Simulations
- N-actors: membership userId must match authenticated user; foreign membership rejected
- Invalid/missing: unknown roles fail-closed; player+director rejected unless allowPlayerDirector
- Two consumers / crash: elevating client capability list is ignored — authoritative list wins; no dual authority

## Flags
None.
