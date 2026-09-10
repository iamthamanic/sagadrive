---
name: svg-icon-create
description: >-
  Create flat vector SVG icons by writing SVG markup directly (no AI image
  generation). Use when the user says svg-icon-create, asks for an item/asset
  SVG icon, inventory icon, or public/assets/items/*.svg for SagaDrive.
---

# svg-icon-create

Create a single centered inventory/asset icon as **hand-authored SVG markup**.

**Never** use image generation, raster embeds, or VTracer-from-PNG for this skill.
Write the `.svg` file directly.

## When invoked

1. Identify the target: item name, definition id, or free-form asset description.
2. Resolve **slug** + **output path** (ask only if ambiguous).
3. Write one SVG matching the style contract below.
4. Wire catalog/`iconKey`/manifest when the target is a SagaDrive catalog item.
5. Confirm path + slug in one short reply.

## Slug + path (SagaDrive defaults)

| Case | Slug | File |
|------|------|------|
| Builtin pack item `builtin.fantasy.longsword` | `builtin-fantasy-longsword` (dots → hyphens) | `public/assets/items/{slug}.svg` |
| Core-only unique art | `core-misc-footwear` | same dir |
| Free-form / legacy | kebab-case, `[a-z0-9]+(?:-[a-z0-9]+)*` | same dir unless user names another path |

Public URL: `/assets/items/{slug}.svg`  
`iconKey` on definitions **must equal** the slug.

Reference style file: `public/assets/items/iron-longsword.svg`  
Batch generator (bulk only): `node scripts/generate-builtin-item-icons.mjs` — do **not** use it for a single new icon; edit/write the one SVG file.

## Style contract (hard rules)

- `viewBox="0 0 512 512"`
- Transparent background
- Centered **single** object, fully visible, no crop
- Flat vector; simple geometric shapes (`path` / `rect` / `circle` / `ellipse` / `polygon`)
- Dark outline: `stroke="#1a1f28"` `stroke-width="8"` `stroke-linejoin="round"` `stroke-linecap="round"`
- Maximum **6** fill colors (outline counts toward the palette budget if distinct)
- No gradients, filters, text, letters, numbers
- No embedded raster / `data:image` / base64
- No UI frame, inventory slot, character holding the object, environment
- Strong silhouette; family-similar to sibling icons is OK if proportions/details differ
- `role="img"` + `aria-label` (prefer German display name when from catalog)
- HTML comment: `<!-- SagaDrive item icon: … Flat vector, transparent bg, ≤6 colors. -->`

### Setting palettes (pick one; stay ≤6 colors)

- **Fantasy:** `#9aa3ad` `#7a8490` `#5c6570` `#3d2914` `#6b4a2e` + accent `#c43c3c` / `#3d8f5a` / `#c4a035`
- **Sci-Fi:** `#2a3340` `#3d4a5c` `#3db8c5` `#2a8f9a` `#b8c4d0`
- **Contemporary:** `#4a5568` `#6b7280` `#e8ecf0` `#3b6ea5` `#d97706` `#5c4033`

## SVG skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="DISPLAY_NAME">
  <!-- SagaDrive item icon: DISPLAY_NAME. Flat vector, transparent bg, ≤6 colors. -->
  <g stroke="#1a1f28" stroke-width="8" stroke-linejoin="round" stroke-linecap="round">
    <!-- shapes here; stroke="none" on detail fills when outline not wanted -->
  </g>
</svg>
```

## Catalog wiring (when target is a catalog definition)

1. **Builtin-standard** (`builtin.*`): `buildStandardItem` already sets `iconKey` from id → usually only add/overwrite the SVG + manifest entry.
2. **Core** (`core.*`): prefer sharing an existing pack `iconKey` via `CORE_SHARED_ICON_KEYS` in `src/domains/character/inventory-v2/core-catalog.ts`. Add a dedicated SVG only if no good match.
3. **Personal/World**: set definition `iconKey` to the slug when editing that definition.
4. **Manifest** `assets/item-icons.manifest.json`: upsert entry with `slug`, `iconKey`, `outputSvg: public/assets/items/{slug}.svg`, `status: "ready"`.
5. Do not set Meshy `assetKey` for this static SVG path.

## Validation

- Prefer shapes that pass `scripts/lib/item-icon-svg.mjs` (no script/foreignObject, no external URLs except W3C xmlns).
- Optional: `node scripts/item-icon-assets-check.mjs` after manifest updates.
- If packs check is relevant: `node scripts/item-standard-packs-check.mjs`.

## Clarifying questions (only if needed)

Ask until confident (≥95%):

1. Slug / definition id?
2. Output path if not `public/assets/items/`?
3. Setting palette (fantasy / scifi / contemporary)?
4. Wire `iconKey` + manifest now?

If the user already pointed at an item/file or said “same style as the others”, proceed without questions.

## Done criteria

- [ ] SVG file written at the resolved path
- [ ] Style contract satisfied
- [ ] Unique enough vs similar existing icons
- [ ] `iconKey`/manifest updated when catalog-relevant
- [ ] Short confirmation: path + slug (+ wiring yes/no)

## Anti-patterns

- Cursor/GenerateImage or any raster→vector pipeline for this skill
- Purple glow / soft UI chrome / multi-object scenes
- Overwriting unrelated legacy files (`skull-sword.svg`, etc.) unless asked
- Regenerating all 120 icons when one item was requested
