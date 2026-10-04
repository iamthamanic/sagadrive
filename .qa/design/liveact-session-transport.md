# Design: liveact-session-transport (#364)

## Why

Remote clients must see authorized Player LiveAct without a second detector or
durable pose store. #363 Media Plane carries ephemeral `liveact-data`.

## Publish stage (locked)

```text
hybrid → map → personal calib → #448 adaptive temporal → calibrated
→ NETWORK (SagaDriveLiveActNetworkFrameV1)
→ local: retarget → avatar output
```

Wire carries **calibrated** frames (post-temporal). Remotes **must not** re-run
`stepLiveActCalibratedFrame`. Consumer may only:

- drop duplicates / out-of-order / stale
- optional short jitter hold (≤1 frame age)
- local retarget + apply on existing `LiveActAvatarOutput`

## Transport

- Channel: Media Plane data (`liveact-data` topic)
- Not Postgres / Realtime DB / world_state
- Target send rate: ≤30 Hz (desktop FPS cap); coalesce when unchanged head/face
- Sequence is delivery authority; sender timestamps are relative age hints only

## Identity

- LiveKit identity = `user:{userId}` from server token
- Character binding = session roster / membership (server), never payload claim
- Unauthorized / wrong-session subscribe → no apply

## Privacy

No durable storage of network frames, landmarks, webcam, iris, calib profiles.
