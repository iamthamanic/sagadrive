# Third-party notices — LiveAct Face Authoring (offline)

SagaDrive does **not** vendor or ship QtMeshEditor at runtime. The FaceRig CLI is an
optional offline authoring tool resolved via `SAGADRIVE_QTMESH_BIN`, `PATH`, or
`.cache/sagadrive-tools/qtmesh/` (see `scripts/bootstrap-qtmesh-facerig.sh`).

| Component | Upstream | License | Role |
|-----------|----------|---------|------|
| QtMeshEditor FaceRig | [fernandotonon/QtMeshEditor](https://github.com/fernandotonon/QtMeshEditor) @ `8720dc91bd7426908b9218673fbd74d544dd908c` | MIT | Offline head isolation → ICT-FaceKit fit → NRICP → deformation transfer → ARKit-style morph targets + GLB export with `mesh.extras.targetNames` |
| ICT-FaceKit template | Bundled/downloaded by QtMeshEditor FaceRig (`facerig/arkit_template.bin`) | MIT | Neutral + expression template for deformation transfer |

Runtime LiveAct path remains MediaPipe → LiveActFrameV1 → retarget → GLB morph targets and has **no** dependency on QtMeshEditor or ICT-FaceKit.
