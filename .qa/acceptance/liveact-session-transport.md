# Feature: LiveAct Session Transport (#364)

## Intent

Ship ephemeral Remote LiveAct transport over #363 Media Plane so authorized
remote clients apply Player pose/expression via existing avatar output — without
duplicating tracking, DB pose writes, or second renderers.

## Preconditions

- #363 CLOSED; Media Plane + `liveact-data` kind exist
- Feature slug: `liveact-session-transport`
- Branch: `agent/liveact-session-transport`

## Happy Path

- [ ] `SagaDriveLiveActNetworkFrameV1` encode/decode (no landmarks/video)
- [ ] Publish stage = calibrated (post #448); consumer does not re-temporal
- [ ] MediaPlane `publishData` / `subscribeData` on adapter + memory fan-out
- [ ] Transport throttle ≤30 Hz; sequence/stale/OOO drop
- [ ] trackingLost → remote neutral/clear
- [ ] unpublish / disconnect clears remote state
- [ ] Character bind via trusted identity → roster, not payload claim
- [ ] Capability mismatch degrades (unknown contract → drop + reason)
- [ ] Gate wired into `test-gate`
- [ ] No DB/world_state writes in transport path

## Edge Cases

- [ ] Duplicate / out-of-order / stale frames ignored
- [ ] Late join: neutral until first valid frame
- [ ] Version mismatch fail-closed
- [ ] Viewer cannot publish liveact-data

## Security Coverage

| Item | How |
|------|-----|
| Identity | Publisher identity from plane; character via roster map |
| No biometrics durable | Ephemeral data only; assertLocalOnly on decoded face |
| Authz | `canPublishLiveactData` / subscribe grants |

## Implementation Notes

- Network: `liveact-network-frame.ts` / remote consumer
- Plane data: adapter + memory bus + LiveKit duck-typed publishData
- Transport: `liveact-session-transport.ts` + `useLiveActSessionTransport`
- Gate: `scripts/liveact-session-transport-check.mjs`

## Composition Gate

```text
calibrated LiveActFrame
→ encode NetworkFrame
→ MediaPlane data (identity-bound)
→ decode + sequence gate
→ retarget local → LiveActAvatarOutput
```
