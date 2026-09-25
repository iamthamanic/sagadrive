# Design — LiveAct Golden Reference VRM

**Slug:** `liveact-reference-vrm-golden-avatar`  
**Date:** 2026-09-25

## 1. Problem

SagaDrive Human VRM face motion can look rubbery (eyes/mouth). Unclear whether LiveAct/MediaPipe/VRM runtime or asset authoring is at fault.

## 2. Hypothesis

A known-good ARKit52 VRM through the **same** LiveAct path will either move cleanly (asset problem) or also look wrong (runtime/retarget problem).

## 3. Reference avatar

| Field | Value |
|-------|--------|
| Id | `reference-vrm-arkit52` |
| Label | Reference VRM (ARKit52) — Diagnose-Avatar |
| File | `White/White_M_1_Default.vrm` |
| Upstream | https://github.com/TLTMedia/valid-vrm-avatars |
| Commit | `3a79e95bc81655a3e1ec020538c67e7e17551b6f` |
| Why | Neutral adult male, Default outfit, VRM 1.0, documented ARKit 52, humanoid bones + LookAt |

## 4. License / Attribution

- **Source:** Google VALID → TLTMedia VRM conversion  
- **License:** CC BY 4.0  
- **Attribution:** Original avatars Google VALID (`google-research`); VRM + ARKit wiring by TLTMedia  
- **Purpose:** diagnostic reference only  
- **In-repo:** `public/assets/avatars/reference/ATTRIBUTION.md`

## 5. Architecture

```
Character Editor (Human Vorlage)
  ├─ SagaDrive Human → resolveSpeciesTemplateModelUrl (unchanged)
  └─ Reference VRM → /assets/avatars/reference/valid-white-m1-default.vrm
         → CharacterStudioRuntime VRM loader (@pixiv/three-vrm)
         → VrmLiveActAvatarOutput
         → LiveAct engine ← MediaPipe
```

**Not in path:** Meshy, QtMesh, SagaDrive face authoring, VRM pack.

## 6. Data flow (expressions)

MediaPipe coefficient → LiveAct channel → `resolveLiveActChannelTargets` → VRM expressionManager.setValue.

Observed inventory (pinned commit):

- VRM presets: blinkLeft/Right, look*, visemes, …  
- VRM custom: jawOpen, mouthSmile*, brow*, cheekPuff, noseSneer*, … (ARKit names)  
- LookAt: `type: bone` + humanoid leftEye/rightEye  
- Expected LiveAct gaze path: **lookAt** (single ownership)

Missing vs LiveAct 52 set (do **not** invent aliases): cheekSquint*, eyeLook* ARKit morphs (gaze via LookAt), mouthRoll*, mouthShrug*.

## 7. SagaDrive stages skipped

Face Mapping, face-anchors sidecar authoring, QtMesh morph seed, avatar-vrm-pack.

## 8. Test matrix

Head yaw/pitch/roll; eye gaze L/R/U/D; blinks; brows; jaw; mouth smile/frown/pucker/funnel; cheeks/nose — via LiveAct + diagnostics.

## 9. Interpretation (Fall A–D)

| Fall | SagaDrive | Reference | Meaning |
|------|-----------|-----------|---------|
| A | schlecht | gut | LiveAct OK; authoring/geometry problem |
| B | schlecht | schlecht | LiveAct/MediaPipe/retarget/runtime problem |
| C | gut | gut | prior issue asset/mapping-specific |
| D | gut | schlecht | reference import / expression resolution |

## 10. Limitations

- 68MB binary via fetch script (not git)  
- Session diagnostic selection; not product default  
- No asset-specific retarget gains  
- Incomplete ARKit overlap documented, not compensated  
