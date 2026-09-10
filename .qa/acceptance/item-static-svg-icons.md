# Acceptance — item-static-svg-icons

## Goal

Ship static SVG inventory icons for Core + builtin catalog via Cursor→VTracer pipeline; display in Workbench/Inventory.

## Composition Gate

- Proof: `.qa/runs/composition-gate-item-static-svg-icons.md`
- Verdict: **CLEAR**
- WORKTREE scope on base `b58beb6`

## Checklist

- [x] Prompt helper + manifest + vectorize script + GH Action
- [x] 121 catalog SVGs under `public/assets/items/`
- [x] Packs/Core set `iconKey`; Inventory resolves public SVG
- [x] Workbench 2D preview larger icons
- [x] `item-icon-assets-check` in test-gate
- [x] Docs in `docs/items.md` + README Recent changes
