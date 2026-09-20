# Human species 3D pilot — soft-real underwear base (v=softreal1)

## Canonical style
**Palworld × Overwatch, soft-real** — `docs/character-visual-styleguide.md`  
Golden refs: `golden/human-{male|female}-style-ref.png`

## Pipeline (2026-09-20)
Golden PNG → Meshy-7 i2-3d (tex) → remesh quad 40k → retexture 8k → rig → public GLB.

| File | Role |
|------|------|
| `golden/human-*-style-ref.png` | Style + generation input |
| `human-*-preview.glb` | Retextured pre-rig (~20 MB) |
| `human-male.glb` / `human-female.glb` | Rigged runtime (~23 / ~21 MB) |
| `provenance.json` | Task IDs |

Served at `/assets/avatars/species/human-{male\|female}.glb?v=softreal1`

## Review
Hard-reload editor. Vorlage → Mensch → Geschlecht m/w.
