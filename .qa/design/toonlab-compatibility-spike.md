# ToonLab Compatibility Spike (#341)

## Intent
Isolated, reproducible compatibility check of `@call-me-sensei/toonlab` against the current SagaDrive avatar renderer (`CharacterStudioRuntime` + MToon/PBR path) using real SagaDrive assets.

## Evaluated package
- Package: `@call-me-sensei/toonlab@0.5.0`
- Host: `three@0.183.2`, `@pixiv/three-vrm@3.5.1`, `react@^18.3.1`, `THREE.WebGLRenderer` + MToon/GLSL

## Fixtures (identical-camera matrix)
| Id | Asset |
|----|--------|
| human-male-glb | `public/assets/avatars/species/human-male-quality-20260921-m5.glb` |
| human-male-vrm | `public/assets/avatars/species/human-male-quality-20260921-m5-face1.vrm` |

## Verdict: **BLOCKED**

Drop-in ToonLab shading on the current avatar renderer is **not** viable.

### Blockers
1. **three peer gap** — ToonLab requires `three@^0.185.1`; SagaDrive is on `0.183.2`.
2. **Renderer/material stack** — ToonLab 0.5 is WebGPU-first TSL/NodeMaterial; GLSL material path removed. SagaDrive avatar path is `WebGLRenderer` + MToon/GLSL (`mtoon-style-applier`).
3. **VRM peer gap** — ToonLab wants `@pixiv/three-vrm@^3.5.4`; host is `3.5.1`.

### Risks (non-blocking alone)
- Package peers `react@^19` while SagaDrive is on React 18 (avatar runtime itself is React-free).
- Alpha/hair and morph preservation under `applyToonShader` are unverified until an executable TSL harness exists.
- Dual-renderer / three bump performance and LiveAct regression risk.

## What was verified on the host path (PBR / MToon baseline)
- Fixtures exist and parse as GLB (JSON chunk inventory) with SkinnedMesh, materials, and (where present) morph targets / VRM extensions.
- Portrait capture and MToon style application already exist on the host path (`mtoon-style-applier` / CharacterStudioRuntime).
- Side-by-side ToonLab render capture is **not executable** on the current stack without a version+renderer upgrade — recorded as blocked matrix rows, not faked PASS.

## Minimal integration path (if unblocking later)
1. Dedicated PR: bump `three` ≥ 0.185.1 and `@pixiv/three-vrm` ≥ 3.5.4 with avatar/LiveAct gates green — **no silent upgrade**.
2. Isolated Look preview surface on WebGPURenderer (or documented TSL WebGL2 fallback); keep CharacterStudioRuntime on WebGL/MToon until proven.
3. Provider-neutral Look runtime adapter (#342); domain stays ToonLab-free.
4. Re-run this spike with identical-camera PBR vs Toon portrait artifacts on both fixtures; fail closed on map/morph/alpha loss.

## Non-goals (honored)
- No productive Look Library/UI
- No broad renderer migration in this PR
- No ToonLab dependency added to `package.json` (would force incompatible peers)

## Evidence
- Decision module: `src/infrastructure/character/avatar/toonlab-compatibility-spike.ts`
- Gate: `scripts/toonlab-compatibility-spike-check.mjs`
- Inventory artifact: `.qa/evidence/toonlab-compatibility-spike/asset-inventory.json`
