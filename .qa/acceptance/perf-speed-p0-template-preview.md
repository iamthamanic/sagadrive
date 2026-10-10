# Acceptance — Performance P0 template preview LOD

## Intent
Editor species-template preview must not download the full face3 HQ VRM (~28–34 MB) on the default critical path. HQ/fidelity mesh remains available for LiveAct face work and persistence.

## Preconditions
- Local Vite app; Local Admin auth
- Human Vorlage + Geschlecht selected

## Happy Path
1. Given a blank Character Editor with Human Vorlage + feminine/masculine reading, when the 3D preview loads, then the network requests the **preview** mesh (canonical ≤~10 MB), not the face3 HQ VRM.
2. Given the same character is saved / fidelity resolved, when persistence asks for the SagaDrive template URL, then the **fidelity** face3 VRM URL is used.
3. Given LiveAct tracking is enabled (or fidelity quality requested), when the mesh is resolved with `quality: 'fidelity'`, then face3 paths remain allowlisted and loadable.

## Edge Cases
- Diverse / unset gender → no mesh (unchanged fail-closed)
- Non-human species without meshes → undefined (unchanged)
- Import / comparison mesh still wins over template preview

## Scope
- In: `species-template-models-v1.ts`, editor hook wiring, gate script, lobby roster meta batch
- Out: Mesh compression pipeline, list virtualization, Docker Mode C timings

## Security Coverage
- F-03 / allowlisted asset paths only (no free client URLs) — PASS: preview base still allowlisted first-party paths
- B-01 N/A (no new endpoints); roster meta uses existing owner-scoped select with narrower columns

## Composition Gate
- Proof: `.qa/runs/composition-gate-perf-speed-p0-template-preview.md`
- Verdict: CLEAR (preview/fidelity mesh resolution + lobby roster batch; no cardinality change of persisted events)
