# Composition Gate — liveact-dense-face-features (#445)

- Verdict: **CLEAR**

## Hop chain
```text
MediaPipe FaceLandmarker result
→ provider adapter (indices → named semantic points)  [infra, reuses #421 map]
→ face-local orthonormal normalization                [domain]
→ region feature extraction                           [domain]
→ SagaDriveLiveActDenseFaceFeaturesV1                 [domain]
→ engine side-channel (subscribeDenseFaceFeatures)
→ #444 measurement boundary / future #446–#447 consumers
```

## Privacy path
```text
raw landmarks → transient processing only → discarded
```

## Flags
none — V1 LiveActFrame path unchanged; dense features are a parallel side-channel.
