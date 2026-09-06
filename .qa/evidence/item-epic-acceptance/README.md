# Evidence — Item Epic final acceptance (#144)

Issue: #144 · Parent: #132 · Children: #133–#143

Evidence here is **visual confirmation** of the Library → Workbench → Inventory hop.
It does **not** replace automated assertions in `scripts/test-gate.mjs`
(child Item gates + `item-epic-acceptance-check.mjs`).

## Required captures

| File | What to show |
|---|---|
| `01-library-items.png` | Library Items tab with catalog list/grid + thumbnails |
| `02-workbench.png` | Item Workbench create/edit surface (`/items/create` or `/items/:id`) |
| `03-inventory-add.png` | Character Inventory add-catalog with Core / Standard / Welt / Eigen labels |
| `viewport-1440-library.png` | Desktop 1440×900 Library Items (no horizontal overflow) |
| `viewport-768-library.png` | Tablet 768 Library Items |
| `viewport-390-library.png` | Mobile 390×844 Library Items |
| `viewport-390-inventory-add.png` | Mobile inventory add dialog |

## Status

Binaries are produced by Playwright (`e2e/item-epic-acceptance.spec.ts`) when
`npm run test:e2e` runs with a live app. CI may upload them as artifacts; if
binaries are absent in the worktree, keep this README + gate scripts as the
source of truth. Live Meshy calls are **not** required.

## Security regression pointers

| Item | Gate |
|---|---|
| Cross-owner / world RLS | `item-definition-persistence-check.mjs` (#136) |
| MIME / magic / size | `item-thumbnail-assets-check.mjs` (#140), `item-model3d-assets-check.mjs` (#141) |
| Meshy fail-closed / no client secrets | #140/#141 + `item-epic-acceptance-check.mjs` (no `VITE_*MESHY`) |
| Cardinality / composition | `item-world-catalog-check.mjs` (#142), `item-inventory-world-catalog-wire-check.mjs` (#143) |
