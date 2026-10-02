# #423 Stage B Debug — jawOpen Root Cause (m5)

## Verdict

**Single root-cause class:**

> FaceRig never consumes reviewed SagaDrive anchors; `MARKER_SIM=2` regenerates deterministic ICT-template morphs (byte-identical to face1) whose `jawOpen` deltas do **not** open the mouth at reviewed lip/chin anchors.

**Publish:** forbidden. **#424:** not started. **GT:** unchanged.

## Pipeline (measured)

| Hop | Expected change | Actual |
|-----|-----------------|--------|
| Reviewed anchors | Drive FaceRig markers | **Never passed** to `qtmesh facerig` argv |
| Authoring config | GT-aware repair | `MARKER_SIM=2` → 13 ICT markers; m5 proportional defaults (`seedConfident=0`) |
| QtMesh facerig | New functional morphs | 51 shapes from **baseline** (0 morphs) |
| In-tool [sim] | jawOpen deformation | `nonZero=46887 maxDisp=0.0278` — morphs **are** created |
| Export + canonicalize | Preserve deltas | **Mutation test Case A** — extreme Y=-0.15 survives |
| Functional QA | mouthGapΔ ≥ 0.06 | mouthGapΔ ≈ **-0.00049**; **chin Δ = 0** |

## Decisive proofs

1. **Mutation test Case A:** exporter/canonicalize preserves intentional `jawOpen` shape-key edits → failure is **not** export.
2. **face3 file SHA == historical face1 run output** `53d7be5c…` → deterministic regenerate, not lost-in-transit.
3. **jawOpen POSITION buffer SHA identical** public face1 ↔ face3 (`cc403218…`).
4. **Geometry:** mouthUpper/mouthLower move nearly in parallel (relative ≈ 5.3e-4); **chin unmoved** under `jawOpen=1`.
5. **f5 confirm:** same identical morphs, chin Δ=0, face3 SHA == f5 face1 run output.

## MARKER_SIM=2

Not a no-op. It is the production marker-sim path that **does** attach 51 morphs, driven by internal 13 markers (or proportional defaults), **not** by `face-anchors.json`.

## Historical

- **face1:** created these morphs via QtMesh MARKER_SIM=2.
- **face2:** explicitly `GLB morphs unchanged from face1` (anchors/VRM only).
- **face3:** regenerates the same morph bytes. No run ever produced different m5 `jawOpen` POSITION buffers.

## Implication

The wired QtMesh FaceRig path is **not** a functional morph-reauthoring path relative to reviewed GT. Re-running it cannot close #423 Functional QA.
