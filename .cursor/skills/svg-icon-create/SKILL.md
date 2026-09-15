---
name: svg-icon-create
description: >-
  Create SagaDrive pack-quality static SVG icons via Cursor GenerateImage → PNG
  → VTracer (never hand-authored geometry). Use when the user says svg-icon-create,
  asks for an item/NPC/creature icon, inventory icon, “mach mir ein Icon/Bild von …”,
  or any public/assets/items|npc-creatures/*.svg.
---

# svg-icon-create

Create **one** SagaDrive inventory / NPC / creature icon in **pack style**
(same quality as existing sword / potion / wolf / goblin SVGs).

**Hard ban:** Do **not** hand-write flat geometric SVG markup. Do **not** invent
paths/circles/rects as the icon. That look is rejected — only the raster→vector
pipeline below is allowed.

Invoking this skill (or asking for an icon / “Bild von X” in SagaDrive) **is**
an explicit image request → you **must** call Cursor `GenerateImage`.

## When invoked

1. Resolve **kind** (item vs NPC/creature), **slug**, display name, short subject prompt.
2. Build the full generation prompt from the matching domain helper (do not freestyle style prose).
3. `GenerateImage` 1:1 with style reference PNGs.
4. Save + normalize PNG into the correct `assets/*-icon-sources/` path.
5. Run the matching VTracer script with `--force --slug`.
6. Upsert manifest + wire `iconKey` when catalog-relevant.
7. Run the matching assets-check.
8. Confirm path + slug in one short reply.

Ask clarifying questions only if kind/slug is ambiguous (<95% confidence).

## Kind → paths

| Kind | Slug example | Source PNG | Output SVG | Manifest | Vectorize |
|------|--------------|------------|------------|----------|-----------|
| Item | `builtin-fantasy-longsword` | `assets/item-icon-sources/{slug}.png` | `public/assets/items/{slug}.svg` | `assets/item-icons.manifest.json` | `npm run icons:vectorize -- --force --slug {slug}` |
| NPC / creature | `builtin-creature-fantasy-skeleton` | `assets/npc-creature-icon-sources/{slug}.png` | `public/assets/npc-creatures/{slug}.svg` | `assets/npc-creature-icons.manifest.json` | `npm run icons:vectorize:npc -- --force --slug {slug}` |

Slug rules: kebab-case `[a-z0-9]+(?:-[a-z0-9]+)*`. Builtin ids: dots → hyphens  
(`builtin.fantasy.longsword` → `builtin-fantasy-longsword`).  
`iconKey` on definitions **must equal** the slug.  
Public URLs: `/assets/items/{slug}.svg` or `/assets/npc-creatures/{slug}.svg`.

## Prompt construction (mandatory)

Work from the SagaDrive repo root (`sagadrive/`).

**Items** — `src/domains/items/icon-assets.ts`:

- Full prompt = `buildItemIconPrompt({ name, iconPrompt })` / `getItemIconStyleTemplate()`.
- Manifest `iconPrompt` = short object-only subject (no style boilerplate).
- PNG background per item template (plain / transparent — do not force black).

**NPC / creatures** — `src/domains/npc-creature/icon-assets.ts`:

- Full prompt = `buildNpcCreatureIconPrompt({ name, iconPrompt })` / `getNpcCreatureIconStyleTemplate()`.
- Manifest `iconPrompt` = short concrete subject (e.g. `red fox portrait`, `bare undead skeleton`).
- **Solid pure BLACK background required on the PNG** (pack parity). Never light/white.
- Subject must be concrete enough for later 3D (no generic “Wildtier”).
- Prefer a sibling pack PNG as extra style peer (wolf for animals, goblin/zombie for humanoids).

If you cannot import the TS helpers in-shell, copy the template text from those files
and substitute the subject line — do not invent a new style paragraph.

## GenerateImage step

Call Cursor `GenerateImage` with:

- `aspect_ratio`: `"1:1"`
- `description`: full prompt from the helper above
- `filename`: `{slug}.png`
- `reference_image_paths` (always include both item style refs):
  - `assets/item-icon-style-refs/style-ref-sword.png`
  - `assets/item-icon-style-refs/style-ref-potion.png`
  - Plus optional sibling under `assets/npc-creature-icon-sources/` or `assets/item-icon-sources/`

Then:

1. Copy/move the generated file into the correct `*-icon-sources/{slug}.png`.
2. Normalize: `sips -s format png assets/.../{slug}.png` (must be real PNG, not JPEG-as-.png).

## VTracer + sanitize

```bash
# items
npm run icons:vectorize -- --force --slug {slug}

# npc / creatures (knocks out black canvas → transparent SVG)
npm run icons:vectorize:npc -- --force --slug {slug}
```

Prefer `.cache/vtracer/vtracer` when present (`VTRACER_BIN=.cache/vtracer/vtracer`).  
Do **not** hand-edit the resulting SVG paths. Final SVG must be transparent (no full-frame black plate). Sanitize lives in `scripts/lib/item-icon-svg.mjs` (shared).

## Manifest + catalog

Upsert the matching manifest entry:

- `id`, `slug`, `name`, `iconPrompt` (short), `iconKey` (= slug)
- `sourcePng`, `outputSvg`, `status: "ready"`

Catalog wiring:

1. **Builtin** — `iconKey` usually already derived from id; overwrite SVG + manifest.
2. **Core items** — prefer shared pack `iconKey` via `CORE_SHARED_ICON_KEYS` when a match exists; else new slug + SVG.
3. **Core / builtin creatures** — set definition `iconKey` = slug; name/description must match the concrete subject.
4. Do not set Meshy `assetKey` for this static SVG path.

## Validation

```bash
# items
node scripts/item-icon-assets-check.mjs

# npc / creatures (rejects hand-authored 512 geometry)
node scripts/npc-creature-icon-assets-check.mjs
```

## Done criteria

- [ ] PNG in the correct `*-icon-sources/` path (normalized)
- [ ] SVG in the correct `public/assets/.../` path via VTracer (not hand markup)
- [ ] Manifest `status: "ready"`, `iconKey === slug`
- [ ] Assets-check passes for that kind
- [ ] Short confirmation: kind + slug + PNG path + SVG path

## Anti-patterns

- Hand-authored flat SVG / palette stroke templates / “quick geometry”
- Skipping GenerateImage or skipping VTracer
- Light/white background on **creature** PNGs
- Leaving a solid black full-canvas plate in the **public SVG**
- Regenerating the entire pack when one icon was requested
- Using batch generators (`generate-builtin-*-icons.mjs`) for a single new icon
- Overwriting unrelated legacy files unless asked
