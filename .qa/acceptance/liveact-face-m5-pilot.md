# Acceptance: liveact-face-m5-pilot

## Feature slug
`liveact-face-m5-pilot`

## Intent
m5 erhält über einen reproduzierbaren QtMeshEditor-FaceRig-CLI-Pass automatisierte Facial Morph Targets und besteht mindestens `core-v1`, ohne Blender/Faceit und ohne Runtime-Abhängigkeit von QtMeshEditor.

## Preconditions
- Baseline `public/assets/avatars/species/human-male-quality-20260921-m5.glb` existiert und bleibt unverändert bis Publish-PASS.
- Face Asset Contract (#382) und Validator (#383) sind auf main.
- QtMeshEditor ist auf Commit `8720dc91bd7426908b9218673fbd74d544dd908c` gepinnt (native `mesh.extras.targetNames`).

## Happy Path
1. Given m5 baseline GLB, when `scripts/liveact-face-authoring-qtmesh.mjs` mit `--input/--output/--run-dir` läuft, then FaceRig schreibt Kandidat-GLB + `qtmesh-report.json` unter `assets/species-3d/human/runs/quality-20260921-m5-face1/`.
2. Given Kandidat-GLB, when `scripts/liveact-face-asset-check.mjs --profile core-v1` gegen Baseline läuft, then Khronos + SagaDrive PASS und `face-inventory.json` existiert.
3. Given PASS, when Publish verdrahtet, then `species-template-models-v1.ts` zeigt auf den Face-fähigen m5 und Capability Inspector meldet Core Avatar ✓.
4. Given Adapter-Unit-Tests, when `npm run test-gate`, then Fake-`qtmesh` deckt Args/JSON/Errors/targetNames/exit codes ohne Netzwerk/Qt/CMake.

## Edge Cases
- Missing binary → resolve env/PATH/cache/bootstrap; allein kein needs-human.
- Export nur `Shape_N` → FAIL.
- Rig/PBR regression → FAIL (Validator nicht abschwächen).
- `tongueOut` vorhanden → ok, nicht Core/full channel.
- EyeLook morphs → `gazeMode=morphs`.

## Out of scope
f5, Retarget Profile UI, Pipeline docs (#386), Blender/Faceit fallback, vendor of QtMeshEditor.
