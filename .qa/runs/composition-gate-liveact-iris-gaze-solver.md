# Composition Gate — liveact-iris-gaze-solver (#446)

- Verdict: **CLEAR**

## Hop chain
```text
MediaPipe FaceLandmarker faceLandmarks
→ MediaPipeIrisGeometryAdapter (contour indices → centroid)
→ ProviderNeutralEyeGeometry
→ #445 face-local frame
→ per-eye iris solve (yaw/pitch + confidence)
→ arbitrate vs eyeLook* blendshape
→ LiveActSourceSample eye X/Y
→ mirror → map/smooth/calibrate/retarget
→ exclusive avatar gaze output (#403)
```

## Privacy
raw iris contours → transient only → discarded

## Flags
none — single exclusive gaze output path retained; blendshape fallback preserved.
