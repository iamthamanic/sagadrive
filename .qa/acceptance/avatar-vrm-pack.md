# Acceptance — avatar-vrm-pack (#404)

## Intent
Offline, deterministic pack of a validated SagaDrive humanoid GLB (+ face inventory)
into a VRM 1.0 asset without re-authoring geometry, skin, PBR, or morph semantics.

## Commands
```bash
node scripts/avatar-vrm-pack-check.mjs
node scripts/avatar-vrm-pack.mjs \
  --input public/assets/avatars/species/human-male-quality-20260921-m5-face1.glb \
  --inventory assets/species-3d/human/runs/quality-20260921-m5-face1/face-inventory.json \
  --out .qa/runs/human-m5-face1.vrm
```

## Pass criteria
- [x] CLI + lib packer write `VRMC_vrm` 1.0 with humanoid bones + expressions
- [x] Exact LiveAct→preset only for blinkLeft/blinkRight; other channels stay `expressions.custom`
- [x] Exactly one LookAt path; eyeLook morph expressions omitted when LookAt is written
- [x] Materials/meshes/morph topology unchanged (metadata-only extension attach)
- [x] Deterministic check + test-gate wiring; optional three-vrm load smoke
