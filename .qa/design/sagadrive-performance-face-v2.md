# Design: sagadrive-performance-face-v2 (#450)

## Why

Input/solver stack through #449 is strong:

```text
RGB webcam → MediaPipe → dense → iris → hybrid → temporal → personal calib
→ ARKit52-compatible LiveActFaceV1 → retarget → avatar
```

Character assets still cannot express several dense/hybrid signals that ARKit52
coarsely approximates (`noseSneer`, `cheekPuff`/`cheekSquint`, upper/lower mouth).
#450 defines the **character-side Premium Performance Contract** so those signals
can drive documented extended morphs/correctives without breaking Standard assets.

## Boundaries (hard)

```text
SagaDrivePerformanceFaceV2
≠
SagaDriveAvatarMorphV1          (appearance/body/face authoring)
≠
SagaDriveLiveActFaceV1          (ARKit52 semantic tracking bus)
≠
SagaDriveFaceAnchorsV1          (mesh triangle locations / Face Mapping)
≠
SagaDriveModularAvatarGlbV1     (node roles/slots/extras)
≠
#449 Personal Calibration       (actor motion ranges — not character deform)
≠
#451 Premium E2E proof          (uses this contract; does not invent it)
```

```text
Input solvers stay provider-neutral and asset-free.
PerformanceFaceV2 is Character Output Capability only.
No MediaPipe / dense / iris logic inside assets.
No owner IDs, calibration profiles, or raw landmarks in the contract.
```

```text
same semantics ≠ same vertices ≠ same mesh topology
```

Canonical Human is a **reference implementation**, not the only valid topology.
No canonical vertex indices in the public contract.
No filename / URL / preset-name capability hacks.

## Authoritative current stack (reconstructed)

| Contract | Path | Role |
|----------|------|------|
| Avatar Morph V1 | `src/domains/character/avatar/morph-contract.ts` | Appearance sliders |
| LiveAct Face V1 | `src/domains/character/liveact/liveact-face-contract.ts` | 52 ARKit-style channels |
| LiveAct Capabilities V1 | `src/domains/character/liveact/liveact-capabilities.ts` | Input × avatar bones/face |
| Face Asset V1 | `src/domains/character/liveact/liveact-face-asset-contract.ts` | `core-v1` / `full-v1` profiles |
| Channel→morph aliases | `src/domains/character/liveact/liveact-channel-target-aliases.ts` | Explicit table only |
| Gaze path | `src/domains/character/liveact/liveact-gaze-path.ts` | bones → lookAt → morphs → none |
| Face Anchors V1 | `src/domains/character/avatar/face-anchor-contract.ts` | 21 mesh anchors |
| Modular Avatar GLB V1 | `src/domains/character/avatar/modular-glb-contract-v1.ts` | `extras.sagadrive` roles/slots |
| Output adapters | `gltf-liveact-avatar-output.ts`, `vrm-liveact-avatar-output.ts` | Bind-time capability evidence |
| Offline face validate | `scripts/lib/liveact-face-asset-validate.mjs` | Deterministic inventory |

## Capability composition decision (locked)

**Decision A — compose, do not break V1:**

- Keep `SagaDriveLiveActCapabilitiesV1` as the ARKit52 / bones / gaze matrix.
- Add parallel versioned `SagaDrivePerformanceFaceV2` (+ capability snapshot).
- Compose at bind/validator time:

```text
LiveAct Input Caps
× LiveAct Avatar Caps V1 (bones + ARKit face + gaze path)
× PerformanceFace V2 eligibility
→ active LiveAct level + report
```

Do **not** stuff non-ARKit keys into `avatarFace`.
Do **not** replace Morph V1 or Face Anchors.

## Capability levels (locked)

| Level | Name | Requirements (evidence-based) |
|-------|------|-------------------------------|
| 0 | Display | Asset loads / renders. No humanoid or LiveAct promise. |
| 1 | Animated Humanoid | Humanoid skeleton / existing animation capability (`SagaDriveHumanoidRigV1` or VRM humanoid). |
| 2 | LiveAct Standard | Level 1 + head (or VRM head) + gaze path ≠ `none` **or** documented degrade + ARKit-compatible face support meeting Face Asset `core-v1` floor (or higher). Graceful Standard LiveAct. |
| 3 | LiveAct Premium | Level 2 + `SagaDrivePerformanceFaceV2` **required** extended controls present + declared corrective policy satisfied (required correctives if any; optional listed as warnings). |

Derivation sources (authoritative):

1. Parsed runtime asset (morphTargetDictionary / VRM expressions / bones / LookAt)
2. Optional validated PerformanceFace manifest metadata (never sole authority)
3. Deterministic validator report

Forbidden sole sources: filename, URL, preset name, Canonical Human identity.

## Target contract: `SagaDrivePerformanceFaceV2`

Provider-neutral, versioned character output capability.

### Semantic groups

1. **Compatibility** — existing ARKit52 / LiveActFaceV1 controls (referenced, not redefined)
2. **Head / Gaze** — head support; L/R eyes; gaze drive contract (reuses `LiveActGazeDrivePath`)
3. **Lids** — blink L/R; optional extended lid controls
4. **Lips** — standard mouth controls + segmented upper/lower contour extensions
5. **Cheeks** — raise / compression / volume capability
6. **Nose / Nasolabial** — `noseSneer*` compatibility + richer nasolabial fold controls
7. **Correctives** — character-specific combined deformation capability

### Required vs optional Premium controls (locked for implementation)

Grounded in #447 `requires450` evidence + current ARKit limits:

| Control ID (canonical) | Category | Standard required? | Premium required? | Range | Neutral | L/R | Fallback if missing |
|------------------------|----------|--------------------|-------------------|-------|---------|-----|---------------------|
| *(all Face Asset core-v1 / full-v1 ARKit ids)* | Compatibility | per Face Asset profile | yes (Standard floor) | 0..1 | 0 = rest | anatomical L/R | Standard degrade |
| `nasolabialFoldLeft` | Nose/Nasolabial | no | **yes** | 0..1 | 0 = no fold | anatomical left | use `noseSneerLeft` only (Standard) |
| `nasolabialFoldRight` | Nose/Nasolabial | no | **yes** | 0..1 | 0 | anatomical right | `noseSneerRight` |
| `cheekVolumeLeft` | Cheeks | no | **yes** | 0..1 | 0 = no added volume | anatomical left | `cheekPuff` / `cheekSquintLeft` |
| `cheekVolumeRight` | Cheeks | no | **yes** | 0..1 | 0 | anatomical right | `cheekPuff` / `cheekSquintRight` |
| `lipContourUpperLeft` | Lips | no | **yes** | 0..1 | 0 | anatomical left | `mouthUpperUpLeft` |
| `lipContourUpperRight` | Lips | no | **yes** | 0..1 | 0 | anatomical right | `mouthUpperUpRight` |
| `lipContourLowerLeft` | Lips | no | **yes** | 0..1 | 0 | anatomical left | `mouthLowerDownLeft` |
| `lipContourLowerRight` | Lips | no | **yes** | 0..1 | 0 | anatomical right | `mouthLowerDownRight` |
| `lidTightenLeft` / `lidTightenRight` | Lids | no | optional | 0..1 | 0 | anatomical L/R | blink/squint only |
| Correctives (declared set) | Correctives | no | optional unless listed required in profile | 0..1 | 0 | per declaration | skip corrective; drivers still apply |

Naming lives in a versioned canonical key set with an **explicit alias table**
(same pattern as `liveact-channel-target-aliases.ts`). No fuzzy filename heuristics
for Premium detection.

### Correctives semantics (locked framework)

A **corrective** is a character-side morph (or expression) that activates from a
declared combination of driver controls to improve combined deformation.

```text
drivers: ordered list of PerformanceFaceV2 and/or ARKit control ids
weightRule: min | multiply | custom-documented
optional vs required: per profile
fallback: omit corrective; still apply drivers independently
```

Examples (illustrative — exact required corrective pairs are **optional** in v1
profile unless validator evidence shows Canonical Human needs them):

- `mouthSmileLeft` + `cheekVolumeLeft` → optional smile-cheek corrective
- `mouthPucker` + `jawOpen` → optional pucker-jaw corrective

**Not** actor calibration (#449). Correctives describe **Character B’s mesh**,
not Person A’s motion range.

Implementation must ship:

- corrective declaration schema (id, drivers, weightRule, required?)
- apply order: drivers first, then correctives
- missing optional corrective → warning, Premium may still pass
- missing required corrective → Premium NOT AVAILABLE (Standard may still pass)

## ARKit52 compatibility (locked)

```text
existing ARKit-compatible semantic controls
+ PerformanceFaceV2 extended controls
+ correctives
```

Generic ARKit-only assets → LiveAct Standard (Level 2), never broken.
Premium does not replace ARKit; it extends it.

## Validator architecture (locked)

### Inputs

```text
parsed runtime asset description
  (present morph/expression names, eye bones / LookAt, humanoid evidence)
+ optional validated PerformanceFace manifest metadata
→ PerformanceFaceV2 validation report
```

Preferred integration:

1. Extend offline face-asset validation pattern (`liveact-face-asset-validate.mjs`)
2. Runtime bind-time second resolver after `resolveLiveActChannelTargets`
3. Do **not** escalate capabilities from client import preview alone

### Outputs (machine)

```text
contractVersion: SagaDrivePerformanceFaceV2
validatorVersion: …
capabilityLevel: 0|1|2|3
standardEligible: boolean
premiumEligible: boolean
supportedControls: string[]
missingRequired: string[]
missingOptional: string[]
warnings: string[]
gazeCapability: LiveActGazeDrivePath | summary
correctiveCapability: { present, missingRequired, missingOptional }
```

### Human-readable report (DE UI-facing copy when surfaced)

```text
LiveAct Standard: PASS | NOT AVAILABLE
LiveAct Premium: PASS | NOT AVAILABLE

Missing:
- …

Fallback:
ARKit52-compatible face remains available.   # when Standard PASS
```

Never only `premium = false` without missing list + fallback.

### Deterministic rules

- Same asset bytes → same report
- Premium fail must not flip Standard fail unless Standard requirements also fail
- Manifest claims without morph evidence → warning / ignored for eligibility

## Import integration (locked)

```text
external GLB/VRM
→ existing import validation (bytes / structure)
→ existing modular avatar validation (if applicable)
→ PerformanceFaceV2 validation (report)
→ capability level assigned
→ import allowed
```

**Missing Premium never blocks import.** Only Premium eligibility is downgraded.

## Runtime negotiation (locked)

```text
Input capabilities
× Avatar LiveAct V1 capabilities
× PerformanceFace V2 eligibility
→ active LiveAct capability / level
```

Examples:

| Input | Avatar | Result |
|-------|--------|--------|
| Gaze yes | Eyes none | Gaze unavailable / degraded |
| Premium solvers | ARKit-only mesh | LiveAct Standard |
| Premium solvers | Premium mesh, optional corrective missing | Premium + warning (if no required corrective missing) |
| Premium solvers | Premium required control missing | Standard; Premium NOT AVAILABLE |

## VRM handling (locked)

- Today: expression names + LookAt; alias table for ARKit ids; no GLB eye bones
- Premium: same canonical control ids; map VRM expression names via explicit aliases
- Do **not** assume VRM ⇒ ARKit52 or Premium
- VRM without extended expressions → Standard or lower per evidence

## GLB/GLTF handling (locked)

- Today: `morphTargetDictionary` + explicit alias table (no fuzzy Premium)
- Premium: explicit PerformanceFace alias table + optional manifest
- Heuristics acceptable only where already used for Standard ARKit aliases;
  Premium eligibility remains explicit/deterministic

## Modular Avatar compatibility (locked)

PerformanceFaceV2 **supplements** `SagaDriveModularAvatarGlbV1`:

- Does not redefine node roles/slots
- May optionally reference `extras.sagadrive` metadata for declared performance profile
- Body/wearable modular composition remains unchanged
- Face performance morphs live on the face/body mesh targets, not as a parallel avatar system

## Public authoring spec (implementation deliverable)

Document for external artists (planned sections):

1. Formats (GLB, VRM)
2. Coordinate / orientation notes (only if required)
3. Required Standard controls (ARKit naming + aliases)
4. Premium extension semantic IDs
5. Ranges (`0..1` default) and neutral meaning
6. Anatomical L/R semantics
7. Correctives naming + declaration
8. Validation workflow (CLI / report reading)
9. Graceful degrade expectations

No internal Canonical-Human secret vertex rules.

## Versioning (locked)

| Artifact | Version string |
|----------|----------------|
| Contract | `SagaDrivePerformanceFaceV2` |
| Authoring / import spec | `sagadrive-performance-face-authoring-v1` (doc) |
| Validator | `performance-face-validator-v1` |
| Optional manifest | `SagaDrivePerformanceFaceManifestV1` |

Backward compat:

- Assets without PerformanceFace metadata → Level ≤ 2
- Future V3 requires migration status (like personal calib fingerprint pattern)

## Privacy (locked)

Contract and manifests contain **no** personal/biometric data:

- no owner id
- no calibration profile
- no raw landmarks / iris / webcam

## #451 handoff

#450 must deliver so #451 can:

1. Run the same validator on Canonical Human + ≥1 external GLB/VRM
2. Read capability level + missing list
3. Drive extended controls from hybrid/dense signals through a defined apply path
4. Measure avatar contour fidelity (unblocks #447 `NOT_MEASURED`)
5. Keep Standard path regression-free for ARKit-only assets

#450 does **not** require full Premium E2E motion proof — that is #451.

## Non-goals (this issue)

- #451 Canonical + external Premium E2E gate
- Changing #448 temporal policies
- Changing #449 personal calib scope/persistence
- Appearance Morph V1 redesign
- Face Anchors as Premium proof
- UI chrome (unless implementation needs a thin report surface; then AU/CE apply)
- Cloud / biometric persistence

## Implementation seats (planned, not in intake)

| Piece | Likely location |
|-------|-----------------|
| Contract + levels + control tables | `src/domains/character/liveact/liveact-performance-face-contract.ts` (name TBD) |
| Alias resolver | sibling to `liveact-channel-target-aliases.ts` |
| Validator | domain pure + `scripts/…-check.mjs` / extend face-asset validate |
| Compose | extend capability compose without breaking V1 fields |
| Output apply | GLTF/VRM adapters after ARKit apply |
| Authoring doc | `docs/` or `.qa/` public-facing path chosen in implement |
