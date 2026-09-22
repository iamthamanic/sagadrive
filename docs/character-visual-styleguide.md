# SagaDrive Character Visual Styleguide

**Status:** Binding for species base bodies, Meshy/generation refs, and Avatar V2 authoring  
**Canonical golden refs:** `assets/species-3d/human/golden/`

> **UI vs Character:** `docs/ui-styleguide.md` = Editor-Chrome (Karten, Tooltips, Karussells).  
> **Dieses Dokument** = 3D-/2D-Charakter-Look (Proportionen, Stil-Mix, Underwear-Base, Do/Don’t).

---

## 1. Intent

Erwachsene, spielbare Humanoid-Avatare für Fantasy + Sci-Fi: **stilisiertes Game-Look mit leicht realer Anatomie** — weder Photoreal-CGI noch Chibi/Mascot.

## 2. Canonical style (v1)

| Feld | Wert |
|------|------|
| **Name** | Palworld × Overwatch, soft-real |
| **Tag** | `palworld-overwatch-soft-real` |
| **Kurz** | Bold Overwatch-Körperformen + Palworld-weiche Toon-Formen, etwas realere Anatomie/Gesicht |
| **Nicht** | Full photoreal, Unreal-Cinematic, Chibi, Palworld-Creature-Cute |

### Golden reference images (Underwear base)

| Gender | File |
|--------|------|
| Male | [`assets/species-3d/human/golden/human-male-style-ref.png`](../assets/species-3d/human/golden/human-male-style-ref.png) |
| Female | [`assets/species-3d/human/golden/human-female-style-ref.png`](../assets/species-3d/human/golden/human-female-style-ref.png) |

Source board (exploration): `assets/species-3d/human/style-compare-v2/mix-palow-more-real-*.png`

### Runtime meshes (pilot)

Public allowlisted GLBs (quality m5/f5 only):

- `/assets/avatars/species/human-male-quality-20260921-m5-face1.glb?v=quality5-face1-tex2k`
- `/assets/avatars/species/human-female-quality-20260921-f5-face1.glb?v=quality5-face1-tex2k`

Provenance: `assets/species-3d/human/provenance.json`

### Runtime look

- Materials: SagaDrive **MToon** preferred; controlled PBR fallback (`SagaDriveMToonProfileV1`).
- Albedo maps must stay visible (no flat clay tint over textures).
- Editor may toggle MToon preview on/off; **saved look** remains MToon-on by default.

## 3. Proportion & content rules

**Do**
- Adult age read (~25–35), adult limb/head ratios
- Underwear-only base mesh (modular wardrobe separate)
- Clear silhouette, readable in sheet viewport
- T-/A-pose refs for generation

**Don’t**
- Chibi / big-head / child proportions
- Baked outerwear on base body
- Photoreal pore skin as default product look
- Style forks per screen (one profile)

## 4. Generation prompt anchors (Meshy / adapters)

Positive (DE/EN mix ok in prompts):

- `stylized 3D video game character`
- `Palworld human NPC + Overwatch 2 hero hybrid`
- `slightly more realistic adult anatomy`
- `soft game shading, mild toon, soft specular`
- `underwear base only`, `T-pose`

Negative:

- `NOT photorealistic`, `NOT photograph`, `NOT Unreal cinematic`
- `NO chibi`, `NO big head`, `NO extreme pores`

## 5. Species rollout

Human golden refs above are the **pilot**. Other species reuse the same style tag and adult rules; only silhouette/species traits change.

## 6. Related docs

- `docs/avatar-v2-asset-authoring.md` — Generate → Validate → Publish
- `docs/avatar-v2-modular-glb-spec.md` — Modular GLB contract
- `docs/ui-styleguide.md` — UI patterns only
- `.qa/design/avatar-character-creator-v1.md` — Creator product decisions
- Domain tags: `ASSET_AUTHORING_STYLE_TAGS` in `asset-authoring-contract-v1.ts`
