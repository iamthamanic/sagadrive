# Species 3D — Face Authoring (LiveAct)

**Primary adapter V1:** QtMeshEditor FaceRig (offline CLI)  
**Licenses / notices:** `FACE-AUTHORING-THIRD-PARTY.md`  
**Pinned upstream:** `fernandotonon/QtMeshEditor` @ `8720dc91bd7426908b9218673fbd74d544dd908c`  
**SagaDrive contract:** `SagaDriveLiveActFaceAssetV1` (`core-v1` / `full-v1`) — #382  
**Validator:** `scripts/liveact-face-asset-check.mjs` — #383 (+ semantic V2 #401 with `--anchors`; + functional V1 #422 with `--authoring`)  

QtMeshEditor is **not** a runtime dependency. Domain code must not name QtMeshEditor / ICT-FaceKit / Blender / Faceit.

---

## CLI

```bash
# Optional once per machine (local tool cache under .cache/sagadrive-tools/qtmesh/)
bash scripts/bootstrap-qtmesh-facerig.sh

node scripts/liveact-face-authoring-qtmesh.mjs \
  --input public/assets/avatars/species/<baseline>.glb \
  --output assets/species-3d/<species>/runs/<run-id>/<candidate>.glb \
  --run-dir assets/species-3d/<species>/runs/<run-id> \
  --baseline public/assets/avatars/species/<baseline>.glb \
  --profile core-v1
```

Binary resolution: `SAGADRIVE_QTMESH_BIN` → PATH `qtmesh` → `.cache/sagadrive-tools/qtmesh/bin/qtmesh`.

`npm run test-gate` must **not** download QtMesh; adapter unit tests use a fake CLI.

---

## Pipeline inside FaceRig

Head isolation (rig prior on skinned full-body) → landmark anchoring (offline) → NRICP → ICT-FaceKit deformation transfer → ARKit-style morph targets → GLB with `mesh.extras.targetNames`.

Pass the **full** skinned baseline GLB. Do not pre-cut the head in SagaDrive.

---

## SagaDrive rules (unchanged)

| Topic | Rule |
|-------|------|
| `core-v1` | Exact 10 channels from #382 |
| `full-v1` | 51 animatable channels (`tongueOut` excluded) |
| `_neutral` | Not a morph; undeformed base mesh |
| `tongueOut` | May exist in GLB; not a LiveAct V1 channel |
| Gaze | Exactly one of `none \| morphs \| bones` |
| Names | Reject Shape_N-only exports; no fuzzy map |
| Preservation | Never weaken validator for Rig/PBR regressions |

---

## Face anchors (SagaDriveFaceAnchorsV1)

Per run, emit `face-anchors.json` beside the face GLB (semantic mouth/eye/brow/nose/chin/forehead mesh bindings).

- Author: `scripts/liveact-face-anchor-author.mjs` (+ `scripts/lib/liveact-face-anchor-*.mjs`)
- Validate: `scripts/liveact-face-anchors-v1-check.mjs` / `scripts/lib/liveact-face-anchor-validate.mjs`
- Example fixture: `.qa/fixtures/liveact-face-anchors-v1/face-anchors.json`
- Production path: `assets/species-3d/<species>/runs/<run-id>/face-anchors.json` (reference checksum in `run.json` when present)

Author `face-anchors.json` per run with `liveact-face-anchor-author.mjs` (**head-normalized + anatomic refine**; optional QtMesh 13-marker positions). Do **not** place anchors from morph extrema (breaks circular Semantic QA). Validate with:

1. topology (`liveact-face-anchor-validate`)
2. **Anatomy QA** (`SagaDriveFaceAnchorAnatomyQaV1` / `liveact-face-anchor-anatomy-check.mjs`)
3. reviewed Ground Truth (`SagaDriveFaceMappingAuthoringV1` — see below)
4. Semantic Morph QA V2 (`liveact-face-asset-check.mjs --anchors …`)
5. **Functional Face QA V1** (`SagaDriveLiveActFaceFunctionalQaV1` — `--authoring` or sibling `face-mapping-authoring.json`)

Semantic QA is blocked unless Anatomy QA passes. Functional QA in **publish** mode is blocked when reviewed authoring provenance is missing or fails identity/fingerprint checks. Use `functionalMode: 'diagnostic'` / `--functional-mode diagnostic` only for semantic-only lab checks — never for publish eligibility. Anchors alone are never treated as reviewed GT.

CLI pairing: `--authoring` requires `--anchors`. Morph-inventory calls without `--anchors` skip Functional QA (`no_anchors_manifest`). Explicit `--functional-mode publish` also requires `--anchors`.

### Sidecar versioning (browser)

Runtime resolves sidecars via `listFaceAnchorsManifestUrlCandidates(modelUrl)`. The model URL’s cache-bust query (`?v=…`) **must** be copied onto every sidecar candidate (`{stem}-face-anchors.json`, then `face-anchors.json`). Never strip `search` — a new VRM must not reuse a stale CDN-cached sidecar.

### Ground-truth provenance (`SagaDriveFaceMappingAuthoringV1`)

Runtime bindings stay in `SagaDriveFaceAnchorsV1`. Authoring provenance is a **separate** sibling file:

- Path: `face-mapping-authoring.json` next to `face-anchors.json` (or `{stem}-face-mapping-authoring.json` next to `{stem}-face-anchors.json`)
- Contract: `src/domains/character/avatar/face-mapping-authoring-contract.ts`
- Mapping **source** (how anchors were produced): `auto | manual | manual_override`
- Review **status** (who accepted GT): `unreviewed | agent_reviewed | human_reviewed` (legacy: omit `reviewStatus` + `manual*` + `reviewed=true` ⇒ `human_reviewed`)

**Policy:**

- Heuristic/auto output is proposal-only (`source: auto`, `reviewed: false`, `reviewStatus: unreviewed`).
- Publish-/QA-helpers (`isReviewedFaceMappingGroundTruth`) accept Ground Truth when:
  - **`human_reviewed`**: `source` is `manual` / `manual_override`, `reviewed: true`, canonical `reviewedAt` (UTC ISO with ms); **or**
  - **`agent_reviewed`**: `source` stays `auto`, full `face-anchor-agent-review-v1` provenance (5/5 visual passes + screenshot evidence + deterministic gates), `reviewed: true`.
- `source=manual` must **not** be used to pretend agent review.
- Agent review must **never** overwrite an existing `human_reviewed` mapping.
- Bare `reviewed: true` without `reviewStatus` / provenance is **not** agent GT (fail-closed). Legacy human sidecars without `reviewStatus` remain valid via controlled migration.

### Agent review protocol (`face-anchor-agent-review-v1`)

Domain: `src/domains/character/avatar/face-anchor-agent-review-v1.ts`. Evidence under each run:

`assets/species-3d/human/runs/<run>/agent-review/evidence/`

Required before `agent_reviewed`:

1. Deterministic gates PASS (21/21 anchors, surfaces, fingerprints, anatomy, L/R, …)
2. Multi-view Playwright screenshots (frontal, ±35° yaw, pitch up/down, eyes/brows + mouth/nose close-ups) with labeled markers
3. Five independent visual review passes (fresh context each; no cross-leak; no majority voting)
4. Aggregator confirms 5/5 PASS for every anchor — any `uncertain` / `fail` / `needsHuman` ⇒ `human_review_required`

JSON/numeric data alone cannot mark a mapping agent-reviewed.

Functional Face QA (#422) additionally requires:

1. `asset.anchorsSha256` matching the validated `face-anchors.json` bytes (binds reviewed provenance to the mapping, not only the mesh)
2. at least one strong mesh fingerprint (`asset.topologyFingerprint` and/or `asset.modelSha256`) matching the validated GLB
3. path identity: full/run-relative path match, **or** basename-only plus exact `modelSha256` (basename alone is not enough across run dirs)

Insufficient or mismatched fingerprints block Functional QA (fail-closed). No m5/f5 filename exceptions.

### Functional Face QA (`SagaDriveLiveActFaceFunctionalQaV1`)

Offline, browser-independent. Profile: `liveact-face-functional-profile-v1`.

For each required channel (`jawOpen`, `eyeBlinkLeft/Right`, `browInnerUp`, `mouthSmileLeft/Right`, `mouthPucker`):

- resolve reviewed triangle/barycentric anchors at neutral
- apply isolated morph weight `1.0` to bound vertices (document not mutated)
- assert normalized geometry deltas (mouthGap, eyeOpen, browInnerLift, smile corner, mouth width)

Inventory / run ledger field `functionalQa`:

- `contractVersion`, `profileVersion`, `pass`, `skipped`, `blockedByGroundTruth`, `violations`
- per channel: `pass`, `neutralMetrics`, `posedMetrics`, `deltas`, `thresholds`, `violations`, `poseWeight`

No aggregate magic score.

---

## Run ledger fields

Minimum in `run.json`:

- `faceAuthoringProvider: qtmesh-facerig`
- `qtmesh.repository` / `qtmesh.commit` / `qtmesh.license`
- `faceTemplate.provider` / `license` / `checksum`
- `input` / `output` path + checksum
- `faceRig.shapeCount` / `fitResidual` / `gazeMode` / profiles
- `validation` Khronos + SagaDrive (+ `semanticQa` when `face-anchors.json` present; + `functionalQa` when reviewed authoring provenance is present)
- `beforeAfter` bytes/triangles/morphs/skins/bones/materials/textures

Example: `human/runs/quality-20260921-m5-face1/`.

---

## Retarget

Asset morph weights may still need light `gain`/`deadZone` via `LiveActRetargetProfileV1` (#385). That is runtime config, not authoring.
