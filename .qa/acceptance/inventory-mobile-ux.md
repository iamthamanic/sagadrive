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
- [ ] Sticky/compact summary (Inventar X/20, Last, overload/overflow) visible on both mobile views.
- [ ] Segmented `Inventar` | `Ausrüstung` below `lg` (not side-by-side).
- [ ] 20-slot 2-column grid; Verschieben via numbered target Sheet (move/merge/swap preview).
- [ ] Catalog / Personal form / item actions / container / equip picker usable via Sheets/Dialogs.
- [ ] Seven equipment + four quick slots accessible on Ausrüstung view; ~44px targets.
- [ ] No horizontal page overflow at 390px from grid/tabs/forms/badges.

## Edge Cases
- [ ] Partial merge preview when only part of stack can merge.
- [ ] Two-handed occupation communicated on mobile equipment view.
- [ ] Destructive remove still requires explicit confirm ≠ cancel.

## Regression
- [ ] Desktop `lg:` side-by-side layout and DnD click-to-move still work.
- [ ] `npm run test-gate` + `inventory-mobile-ui-check.mjs`.
- [ ] Playwright smoke at 390×844 for Inventar segment + no overflow.

## Security Coverage
No new persistence — existing authenticated `inventory_v2` write path only.

## Composition Gate
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-inventory-mobile-ux.md`

## Implementation Notes
- `CharacterInventoryV2Panel`: `useIsNarrowViewport` (≤639px) toggles mobile vs desktop layout;
  mobile uses Inventar|Ausrüstung segments; Verschieben opens `InventoryMoveTargetSheet`.
- `InventoryItemActions`: bottom Sheet actions on `useIsMobile`; desktop keeps DropdownMenu.
- `InventoryContainerPanel`: `side="bottom"` on mobile.
- Catalog: overflow-x guards + near-full viewport height.
- Contract: `scripts/inventory-mobile-ui-check.mjs` + Playwright 390 Inventar smoke in
  `e2e/character-editor.spec.ts`.
- Acceptance slug: `inventory-mobile-ux`.