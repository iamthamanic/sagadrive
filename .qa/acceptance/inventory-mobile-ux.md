# Feature: Inventory v2 — Mobile inventory/equipment UX

Issue: #113 (Parent: #105, Depends on: #110/#111) · Slug: `inventory-mobile-ux`

## Intent
Make Character → Inventar fully usable at **390×844** without drag & drop,
hover, or side-by-side desktop panels. Same persisted state/actions as #110/#111
via touch-friendly Sheets and a segmented Inventar / Ausrüstung switch.

## Preconditions
- #110 desktop grid + catalog and #111 equipment/containers/quick-access mounted.
- Domain ops unchanged; UI only orchestrates.
- Breakpoint: mobile contract mandatory through 639px; `lg:` keeps desktop side-by-side.

## Happy Path
- [x] Sticky/compact summary (Inventar X/20, Last, overload/overflow) visible on both mobile views.
- [x] Segmented `Inventar` | `Ausrüstung` below `md` (640px; not side-by-side).
- [x] 20-slot 2-column grid; Verschieben via numbered target Sheet (move/merge/swap preview).
- [x] Catalog / Personal form / item actions / container / equip picker usable via Sheets/Dialogs.
- [x] Seven equipment + four quick slots accessible on Ausrüstung view; ~44px targets.
- [x] No horizontal page overflow at 390px from grid/tabs/forms/badges.

## Edge Cases
- [x] Partial merge preview when only part of stack can merge.
- [x] Two-handed occupation communicated on mobile equipment view.
- [x] Destructive remove still requires explicit confirm ≠ cancel.

## Regression
- [x] Desktop `lg:` side-by-side layout and DnD click-to-move still work.
- [x] `npm run test-gate` + `inventory-mobile-ui-check.mjs`.
- [x] Playwright smoke at 390×844 for Inventar segment + no overflow (assertions added).

## Security Coverage
No new persistence — existing authenticated `inventory_v2` write path only.

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-inventory-mobile-ux.md`

## Implementation Notes
Shared
helpers: `InventoryMobileViewSwitch`, `InventoryMoveTargetSheet`; panel switches
layout at ≤639px; static check `scripts/inventory-mobile-ui-check.mjs`.
