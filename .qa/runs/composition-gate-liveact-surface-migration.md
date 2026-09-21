# Composition Gate — liveact-surface-migration (#334)

## Flow

`AvatarSurfaceViewer` (editor | player-panel | session) → `useLiveActViewport` → `acquireSharedLiveActEngine` → explicit `setTrackingEnabled(true)` → `LiveActEngine.start` → `claimLiveActCamera` → `bindOutput(getLiveActAvatarOutput)` → VRM/GLB apply

Player/Session: `LiveActSurfaceControls` below canvas. Editor: `LiveActViewportControls` gear + PiP.

Legacy `AvatarFaceTrackingRuntime` remains in infra for compatibility/tests only; `AvatarCanvas` does not mount it.
