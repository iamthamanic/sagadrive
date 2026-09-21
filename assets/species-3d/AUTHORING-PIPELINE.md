# Species 3D — Canonical authoring pipeline (v1.1)

**Status:** Binding for every new LiveAct-capable humanoid species / gender base  
**Style:** Semi-real B — `docs/character-visual-styleguide.md`  
**Body pilot:** `human/runs/quality-20260921-m5/`  
**Face pilot:** `human/runs/quality-20260921-m5-face1/` (`faceAuthoringProvider: qtmesh-facerig`)

Body recipe from v1 is unchanged. **v1.1 adds the mandatory Face Pass** before LiveAct publish.

---

## Canonical order

```text
Generate
→ Select
→ Body Rig
→ PBR canonicalisation
→ QtMeshEditor FaceRig
    → head isolation
    → ICT-FaceKit fit
    → NRICP
    → deformation transfer
    → ARKit-style morph targets
→ SagaDrive channel normalization (aliases / profiles)
→ Khronos validation
→ SagaDrive face validation (`scripts/liveact-face-asset-check.mjs`)
→ visual/combination QA
→ publish
→ ledger
```

QtMeshEditor FaceRig is the **primary Face Authoring Adapter V1** (offline MIT tooling).  
Future providers (Meshy/Tripo facial rig, …) are allowed only if their output passes the same `SagaDriveLiveActFaceAssetV1` contract + validator — no domain fork.

---

## 1. Inputs (per variant)

| Input | Rule |
|-------|------|
| **Style-ref PNG** | One front (or best) underwear-base image in Semi-real B. Same lighting/finish as `human/style-compare/B-semireal-male.png`. |
| **Pose** | Prefer **t-pose** for Meshy auto-rig. |
| **Content** | Underwear-only base; no baked outerwear; adult proportions. |

Do **not** invent a new art style per species. Change ears / height / build via the ref image, keep the same renderer look.

---

## 2. Meshy generate (max look)

| Setting | Value | Notes |
|---------|-------|-------|
| Mode | **Single-image** → 3D | Multiview optional only if back/side fail; default = single |
| Model | `meshy-7` (or current Meshy-7 line) | |
| `ultra_mode` | **true** | +credits; single-image only |
| `texture_resolution` | **`8k`** | Base color; PBR maps stay ~2k |
| `enable_pbr` | **true** | base + metallic/roughness + normal |
| `pose_mode` | **`t-pose`** | Best for auto-rig |
| `should_texture` | true | |

Credits (order of magnitude): ~40 for ultra+8k textured mesh (confirm before run).

---

## 3. Remesh — only if forced

| Condition | Action |
|-----------|--------|
| Master faces **≤ ~300k** (Meshy auto-rig cap) | **Skip remesh** — keep mesh quality |
| Master faces **> ~300k** | Remesh to **≤ 280–300k** (never down to ~100k “for fun”) |
| Need height only | Prefer `height_meters` on rig / resize — not aggressive remesh |

Remesh is for limits/perf, not for “better look”.

---

## 4. Rig + PBR

1. **Meshy auto-rig** on the (unremeshed or lightly remeshed) master.  
2. **PBR rebind** from pre-rig master → rigged GLB (`scripts/species-authoring-rebind-pbr-maps.mjs`).  
3. Clear Meshy emissive glow if present (script does this).  
4. Keep this GLB as the **pre-face baseline** (do not overwrite until face PASS).

Body auto-rig ≠ facial blendshapes.

---

## 5. Face Pass (required for LiveAct publish)

See **`assets/species-3d/FACE-AUTHORING.md`**.

Summary:

1. Run `scripts/liveact-face-authoring-qtmesh.mjs` (optional `--bootstrap`) on the full skinned baseline GLB.  
2. Adapter canonicalizes Assimp export (PBR restore, IBM fix, sparse morph pack).  
3. Validate with `scripts/liveact-face-asset-check.mjs --profile core-v1` against the pre-face baseline.  
4. Only on PASS: publish public GLB + update `species-template-models-v1.ts` + provenance / run ledger.

**Not** part of the normal path: Blender, Faceit, manual head cut, temporary face skeleton, Shape-Key bake via Faceit.

---

## 6. Runtime / product notes

- Editor: **MToon off** for these PBR GLBs (authored maps are source of truth).  
- Face size grows with morph targets; sparse packing keeps shipping under host limits when possible.  
- Wire allowlisted path in `species-template-models-v1.ts`.  
- Retarget tuning (if any) uses `LiveActRetargetProfileV1` — never magic numbers in GLB adapters.

---

## 7. Checklist (copy per species run)

- [ ] Semi-real B style-ref approved  
- [ ] Single-image meshy-7 + ultra + 8k + PBR + t-pose  
- [ ] Remesh skipped unless >300k  
- [ ] Rig + PBR rebind → baseline GLB  
- [ ] QtMesh FaceRig face pass + `#383` validator `core-v1` PASS  
- [ ] `run.json` + `face-inventory.json` + `qtmesh-report.json` in face run dir  
- [ ] Public GLB + template wiring  
- [ ] Viewer: Core channels + Head; MToon aus; look matches style-ref  

---

## 8. Explicitly deprecated for new bases

- Multiview-first as default  
- Remesh-to-~100k as default  
- Soft-real / Palworld×Overwatch prompt forks as primary look  
- Shipping Meshy-rig GLB **without** PBR rebind  
- **Blender / Faceit as primary face authoring**  
- Manual head isolation / custom facial AI in the SagaDrive repo  

Reference ledgers:  
- Body: `human/runs/quality-20260921-m5/run.json`  
- Face: `human/runs/quality-20260921-m5-face1/run.json`
