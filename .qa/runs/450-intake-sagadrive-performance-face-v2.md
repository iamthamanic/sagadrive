# #450 Intake — SagaDrivePerformanceFaceV2

- Date: 2026-10-04
- Branch: `agent/sagadrive-performance-face-v2`
- Base/main: `bc877ab80a1d05707f54990395160dd6dd848d06` (#449 merge via #510)
- Validated #449 HEAD ancestor: `e34f44d0cb3849a3d75b0f649f3128369c1750fc`
- Dependencies: #424, #445–#449 **CLOSED** — satisfied
- Scope this run: **intake only** — no implementation

Feature slug (issue): `sagadrive-performance-face-v2`

Design: `.qa/design/sagadrive-performance-face-v2.md`  
Acceptance: `.qa/acceptance/sagadrive-performance-face-v2.md`

---

## 1. Current Avatar contract stack

| Contract | Version | Path | Role |
|----------|---------|------|------|
| Morph | `SagaDriveAvatarMorphV1` | `morph-contract.ts` | Appearance/body/face authoring |
| LiveAct Face | `SagaDriveLiveActFaceV1` | `liveact-face-contract.ts` | 52 ARKit-style performance channels |
| LiveAct Caps | `SagaDriveLiveActCapabilitiesV1` | `liveact-capabilities.ts` | Input × avatar bones/face/gaze |
| Face Asset | `SagaDriveLiveActFaceAssetV1` | `liveact-face-asset-contract.ts` | `core-v1` / `full-v1` profiles |
| Face Anchors | `SagaDriveFaceAnchorsV1` | `face-anchor-contract.ts` | 21 mesh triangle anchors |
| Modular GLB | `SagaDriveModularAvatarGlbV1` | `modular-glb-contract-v1.ts` | `extras.sagadrive` roles/slots |
| Humanoid Rig | `SagaDriveHumanoidRigV1` | rig-contract / `rig-analyzer.ts` | Skeleton capability |
| Retarget | `SagaDriveLiveActRetargetProfileV1` | `liveact-retarget-profile.ts` | Channel gain/deadzone |

**Authoritative Modular Avatar source:**  
`src/domains/character/avatar/modular-glb-contract-v1.ts`  
(not a guessed “docs-only” path)

---

## 2. Current capability detection

```text
Load GLB/VRM
→ morphTargetDictionary | VRM expression names
→ resolveLiveActChannelTargets (explicit alias table)
→ eye bones | VRM LookAt
→ resolveLiveActGazeDrivePath
→ createLiveActAvatarCapabilities
→ composeLiveActCapabilities(input, avatar)
```

- **No** filename-based LiveAct face eligibility today (retarget registry also forbids it)
- Face-anchors sidecar URL stem heuristic is **anchors-only**, not performance morphs
- Import preview structure analysis is **non-authoritative** for LiveAct capabilities

---

## 3. VRM path

| Item | Current |
|------|---------|
| Adapter | `vrm-liveact-avatar-output.ts` |
| Expressions | `expressionMap` + probe ARKit ids / PascalCase |
| Gaze | LookAt → path `lookAt`; eyeLook morphs skipped when LookAt drives |
| Eyes bones | Not used as separate GLB bones |
| Limitation | Authored expressions only; no Premium extended morphs contract |

---

## 4. GLTF path

| Item | Current |
|------|---------|
| Adapter | `gltf-liveact-avatar-output.ts` |
| Morph index | `liveact-morph-target-index.ts` |
| Mapping | Explicit aliases only (`liveact-channel-target-aliases.ts`) |
| Gaze | Eye bones preferred, else morphs |
| Limitation | ARKit52 bus only; no PerformanceFace V2 targets |

---

## 5. Current ARKit face mapping

- Channel ids = `LIVEACT_FACE_CHANNELS` (52 incl. `_neutral`)
- Apply via morph/expression weight write in adapters
- Hybrid (#447) still outputs **existing** ARKit channels only
- Face Asset profiles: `core-v1` floor / `full-v1` all animatable

---

## 6. Current gaze path

Exclusive: `bones → lookAt → morphs → none` (`liveact-gaze-path.ts`)  
Iris (#446) arbitrates tracking signal; avatar drive path remains bind-time exclusive.

---

## 7. Modular Avatar contract

- Version `SagaDriveModularAvatarGlbV1`
- Validates `extras.sagadrive` roles: body | wearable | trait | prop
- Slots, bodyFamily, hideRegions, attachment anchors
- PerformanceFaceV2 must **supplement**, not fork, this contract

---

## 8. Capability gaps (exact)

From #447 design + evidence (`requires450`):

1. **Nasolabial fold intensity** beyond `noseSneerLeft/Right`
2. **Richer cheek volume** beyond `cheekPuff` / `cheekSquint*`
3. **Segmented lip contour correctives** beyond coarse `mouthUpperUp*` / `mouthLowerDown*`

Also:

- Avatar contour fidelity = `NOT_MEASURED — requires #450/#451`
- Personal calib marks some cheek/nose channels `requires450` when span weak but dense contour needs assets
- Dense #445 already measures lips/cheeks/nose/nasolabial regions as **signals**, not avatar deform

---

## 9. Proposed PerformanceFaceV2 schema (candidate)

```text
SagaDrivePerformanceFaceV2
  contractVersion
  policyVersion / validatorVersion
  compatibility: references LiveActFaceV1 / Face Asset profile
  headGaze: { head, leftEye, rightEye, gazeDrivePath }
  lids: { blink L/R, optional lidTighten L/R }
  lips: { ARKit mouth*, lipContourUpper/Lower L/R }
  cheeks: { cheek*, cheekVolume L/R }
  noseNasolabial: { noseSneer*, nasolabialFold L/R }
  correctives: [{ id, drivers[], weightRule, required }]
  supportedControls[]
  capabilityLevel 0..3
```

Implementation may refine field nesting; **semantic groups + required IDs are locked** in design.

---

## 10. Capability level matrix

| Level | Requirements |
|-------|--------------|
| Display | Renders |
| Animated Humanoid | Humanoid / animation skeleton |
| LiveAct Standard | Humanoid + ARKit-compatible face floor (`core-v1`+) + usable head/gaze policy |
| LiveAct Premium | Standard + required PerformanceFace V2 extended controls (+ required correctives if any) |

Evidence-only derivation. No filename hacks.

---

## 11. Required / optional controls

See design table. Premium **required** extended IDs:

- `nasolabialFoldLeft` / `nasolabialFoldRight`
- `cheekVolumeLeft` / `cheekVolumeRight`
- `lipContourUpperLeft` / `lipContourUpperRight`
- `lipContourLowerLeft` / `lipContourLowerRight`

Optional: extended lids, optional correctives (unless marked required).

---

## 12. Corrective semantics

Character-side combo morphs with declared drivers + weightRule.  
Fallback: skip corrective; apply drivers.  
Not actor calibration. Exact required corrective pairs optional in first profile unless Canonical Human evidence demands them.

---

## 13. Validator architecture

Inputs: parsed asset description + optional manifest  
Outputs: level, supported/missing, gaze/corrective summaries, standardEligible, premiumEligible  
Human DE report with missing list + fallback sentence  
Deterministic; Premium fail ≠ import fail

---

## 14. Import integration

Seat after existing bytes/structure/modular validation.  
Assign level + report. **Never block import solely for missing Premium.**

---

## 15. Runtime negotiation

`Input × Caps V1 × PerformanceFace V2 → active level`  
Gaze/face degrade per missing avatar support.  
Keep Caps V1 fields stable; compose V2 beside them.

---

## 16. Public artist spec structure

Formats; Standard controls; Premium IDs; ranges 0..1; neutral; L/R; correctives; validation workflow; degrade expectations.  
No Canonical vertex secrets.

---

## 17. #451 handoff

#450 delivers contract + validator + compose + apply hooks so #451 can:

- validate Canonical Human + external avatar identically
- prove Premium eligibility
- measure avatar contour fidelity
- keep Standard regression green

---

## Locked decisions (no open product questions)

| Topic | Decision |
|-------|----------|
| Contract shape | Parallel `SagaDrivePerformanceFaceV2`, not Morph V1 / not Face V1 overload |
| Caps strategy | Compose with Caps V1 (Decision A) |
| Levels | 0 Display / 1 Humanoid / 2 Standard / 3 Premium |
| Required Premium controls | 8 extended IDs listed above |
| VRM / GLB | Explicit aliases; no Premium filename heuristics |
| Manifest | Optional metadata; never sole authority |
| Validator | Deterministic; DE human report |
| Fallback | Missing Premium → Standard; import allowed |
| Correctives | Declared drivers; optional by default |
| Authoring spec | Public sections listed |
| Negotiation | Input × V1 × V2 |
| UI | Not required for intake; AU if implement adds report UI |

**BLOCKERS for implementation:** none identified.

---

## Non-goals this run

- No PerformanceFace domain code
- No validator script yet
- No UI
- No #451 E2E
