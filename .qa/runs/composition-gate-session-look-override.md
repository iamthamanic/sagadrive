# Composition Gate — session-look-override

- Issue: #349
- Feature slug: session-look-override
- HEAD_SHA: 7900ebbe90337aef151aafb839a7ffb762dca89d
- BASE_SHA: 6f9015ae0da07ffc45d1c91f0ba15215fa9d7e6a
- Verdict: CLEAR

## Event
GM sets or clears a session LookProfile override; world Look resolution for Live/Session consumers uses session → saga → system.

## Hop chain
SessionLookSettings → projectService.updateSessionLookSettings → sessions.look_profile_id UPDATE → enforce_session_look_profile_binding (GM + owned active Look). Readers: buildLookResolutionContextFromSaga / resolveWorldLookForSession → resolveLookProfileId('world').

## Simulations
- N-actors: non-GM cannot set (trigger + UI readonly).
- Invalid/missing: archived/invisible override cleared to inherit; null clears override (does not snapshot saga Look).
- Two consumers / crash: resolution pure; no Look blob fan-out; Look Editor remains authoring surface.

## Flags
none
