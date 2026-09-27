# Web Design Guidelines — look-library (#343)

Date: 2026-09-27
Scope: `src/app/library/looks/**`, `src/app/look/**`, Library Looks tab wiring

## src/app/library/looks/LookLibraryBrowser.tsx

✓ pass — search has `aria-label`; loading spinner `aria-label`; error `role="alert"`; primary CTA is `<button>`; empty/filtered/success states present; touch target `min-h-11` on search.

## src/app/library/looks/LookLibraryCard.tsx

✓ pass — preview `alt` + width/height + `loading="lazy"`; decorative Palette `aria-hidden`; action buttons use text labels (not icon-only); destructive archive uses confirm.

## src/app/look/LookCreateScreen.tsx / LookEditScreen.tsx

✓ pass — semantic heading; back is button; DE copy.

## Notes (non-blocking / inherited)

- Library tab selection remains component state (same as Items/NPCs) — not new deep-link debt for this slice.
- Looks catalog not virtualized; expected small personal catalogs for v1.

## Verdict
PASS
