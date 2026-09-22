# Species 3D — Face Authoring (LiveAct)

**Primary adapter V1:** QtMeshEditor FaceRig (offline CLI)  
**Licenses / notices:** `FACE-AUTHORING-THIRD-PARTY.md`  
**Pinned upstream:** `fernandotonon/QtMeshEditor` @ `8720dc91bd7426908b9218673fbd74d544dd908c`  
**SagaDrive contract:** `SagaDriveLiveActFaceAssetV1` (`core-v1` / `full-v1`) — #382  
**Validator:** `scripts/liveact-face-asset-check.mjs` — #383 (+ semantic V2 #401 with `--anchors`)  

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

Author `face-anchors.json` per run with `liveact-face-anchor-author.mjs` (morph-seeded heuristics on the published GLB). Validate with `liveact-face-asset-check.mjs --anchors …` (Semantic QA V2, #401).

---

## Run ledger fields

Minimum in `run.json`:

- `faceAuthoringProvider: qtmesh-facerig`
- `qtmesh.repository` / `qtmesh.commit` / `qtmesh.license`
- `faceTemplate.provider` / `license` / `checksum`
- `input` / `output` path + checksum
- `faceRig.shapeCount` / `fitResidual` / `gazeMode` / profiles
- `validation` Khronos + SagaDrive (+ `semanticQa` when `face-anchors.json` present)
- `beforeAfter` bytes/triangles/morphs/skins/bones/materials/textures

Example: `human/runs/quality-20260921-m5-face1/`.

---

## Retarget

Asset morph weights may still need light `gain`/`deadZone` via `LiveActRetargetProfileV1` (#385). That is runtime config, not authoring.
