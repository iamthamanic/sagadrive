# Species 3D — Canonical authoring pipeline (v1)

**Status:** Binding for every new species / gender base (Mensch, Elf, Zwerg, …)  
**Style:** Semi-real B — `docs/character-visual-styleguide.md`  
**Proven pilot:** `human/runs/quality-20260921-m5/` (look winner; Meshy single ultra+8k)

This is the recipe that produced the preferred male look. Reuse it for female, elf, dwarf, etc. — only the **style-ref image** and species silhouette change.

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

Remesh is for limits/perf, not for “better look”. Aggressive remesh is what caused the clay look on older human runs.

---

## 4. Rig + materials

1. **Meshy auto-rig** on the (unremeshed or lightly remeshed) master.  
2. **PBR rebind** from pre-rig master → rigged GLB (`scripts/species-authoring-rebind-pbr-maps.mjs`).  
3. Clear Meshy emissive glow if present (script does this).  
4. Publish under `public/assets/avatars/species/{species}-{gender}-….glb` + ledger under `assets/species-3d/{species}/runs/…`.

Body auto-rig ≠ facial blendshapes. Live face expressions are a **separate** track.

---

## 5. Runtime / product notes

- Editor: **MToon off** for these PBR GLBs (authored maps are source of truth).  
- File size: 8k + high poly can be ~80 MB — ok for quality bases; optional later downscale of albedo for shipping if needed.  
- Wire allowlisted path in `species-template-models-v1.ts` (+ preview versions if comparing).

---

## 6. Checklist (copy per species run)

- [ ] Semi-real B style-ref approved (same finish as human B)  
- [ ] Single-image meshy-7 + ultra + 8k + PBR + t-pose  
- [ ] Remesh skipped unless >300k  
- [ ] Rig + PBR rebind  
- [ ] `run.json` + material dumps in `runs/…`  
- [ ] Public GLB + template wiring  
- [ ] Viewer check: MToon aus, look matches style-ref  

---

## 7. Explicitly deprecated for new bases

- Multiview-first as default (use only to fix side/back)  
- Remesh-to-~100k as default  
- Soft-real / Palworld×Overwatch prompt forks as primary look  
- Shipping Meshy-rig GLB **without** PBR rebind  

Reference ledger: `human/runs/quality-20260921-m5/run.json`
