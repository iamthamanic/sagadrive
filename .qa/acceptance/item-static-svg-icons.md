# Acceptance — item-static-svg-icons

## Goal

Ship static SVG inventory icons for Core + builtin catalog via Cursor→VTracer pipeline; display in Workbench/Inventory.

## Composition Gate

- Proof: `.qa/runs/composition-gate-item-static-svg-icons.md`
- Verdict: **CLEAR**
- HEAD_SHA: `3d259deeadeb6e0b5e6c7e01a749b0cc9b652e31` (post-main merge)

## Checklist

- [x] Prompt helper + manifest + vectorize script + GH Action
- [x] 121 catalog SVGs under `public/assets/items/`
- [x] Packs/Core set `iconKey`; Inventory resolves public SVG
- [x] Workbench 2D preview larger icons
- [x] `item-icon-assets-check` in test-gate
- [x] Docs in `docs/items.md` + README Recent changes
