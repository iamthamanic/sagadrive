# Composition Gate — item-static-svg-icons

- HEAD_SHA: 6287be0dcab6fc62133c400d46b28ed62845aa9f
- WORKTREE: committed on `feat/item-static-svg-icons` (Cursor→PNG→VTracer static SVG pipeline + catalog wiring)
- BASE_SHA: b58beb6bbb9eca2a7d1ac0814e3878c8739c4b70
- Date: 2026-09-10
- Verdict: CLEAR

## Event

Catalog / Workbench / Inventory resolve a builtin or Core item `iconKey` to a static public SVG under `/assets/items/{slug}.svg`. New icons are authored offline (Cursor image gen → gitignored PNG → VTracer sanitize → committed SVG). Meshy `assetKey` thumbnails remain the preferred override when present.

## Hop chain

ItemDefinition `iconKey` (packs / Core map) → `buildItemIconPublicSrc` → Vite public `/assets/items/{slug}.svg` → `InventoryItemThumb` / Workbench `ItemVisualsPanel` / `InventoryBaseGrid` as `<img src>` (never `dangerouslySetInnerHTML`). Offline authoring: manifest + prompt helper → Cursor PNG (`assets/item-icon-sources/`, gitignored) → `scripts/vectorize-item-icons.mjs` / GH Action VTracer → sanitized SVG in `public/assets/items/`.

Cardinality: one SVG file per slug; valid SVG never auto-regenerated (`status: ready` skip unless `--force` / `regenerate`).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Shared static assets; no per-user write | Public SVG paths; no Storage/RLS for static icons; Meshy thumbs stay private | pass |
| Invalid/missing | Missing SVG → type PNG / slot fallback | `iconKey` SVG URL 404 → `onError` slot; legacy path-ish `iconKey` does not invent public SVG | pass |
| Two consumers / crash | Library + Inventar + Workbench; mid-vectorize | Same committed SVG path; sanitize rejects script/foreignObject/base64/external URL; incomplete PNG gitignored | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (worktree multi-hop: domain iconKey → public SVG → inventory UI; offline VTracer path documented)
