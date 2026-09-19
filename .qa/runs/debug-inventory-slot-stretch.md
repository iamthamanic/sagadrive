# Debug Report — inventory-slot-stretch

**Date:** 2026-09-09  
**Project:** sagadrive  
**Shell:** web  
**Repro grade:** full  

---

## Summary

On desktop Inventar+Ausrüstung side-by-side, `lg:grid-cols-5` leaves ~50–60px per cell; `break-words` + `pr-10` wraps names character-by-character and `fillPanel` equal-height rows amplify the stretch.  
**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | Occupied inventar slots stay compact; long names truncate or wrap to a few lines. |
| **Actual** | On some desktop widths, the occupied slot (e.g. „Leichte Nahkampfwaffe“) stretches extremely tall; text stacks one letter per line. |
| **Steps** | 1. Open Charakter Editor → Inventar. 2. Add Core item „Leichte Nahkampfwaffe“. 3. View at ~1440px with Inventar beside Ausrüstung (`lg`). |

---

## Reproduction

- **Command / URL:** `http://localhost:3004/character-editor` (Inventar tab), viewport 1440×900  
- **Playwright spec:** none for this layout bug (existing `e2e/inventory-v2.spec.ts` does not assert cell height)  
- **Result:** reproduced  
- **Hard path:** no  

CDP (`Runtime.evaluate`) after `Emulation.setDeviceMetricsOverride` 1440×900:

| Metric | Value |
|--------|-------|
| inventar panel width | 349px |
| ausrüstung width | 384px |
| grid columns | 5 |
| cell 0 width | **58px** |
| name clientWidth | **40px** (after `pr-10`) |
| name height | **385px** |
| cell height | **501px** |
| overflow-wrap | `break-word` |

User screenshot: `.cursor/.../Bildschirmfoto_2026-09-09_um_22.18.48-….png`

---

## Evidence

### Console

No app errors required for repro (layout-only).

### Network

N/A (UI layout)

### Screenshot / trace

- User: vertical letter stacking of „Leichte Nahkampfwaffe“
- Live CDP metrics above at 1440px

---

## Prior art

- [x] Repo grep: `InventoryBaseGrid.tsx:184` — `break-words pr-10`; `fillPanel` + `lg:auto-rows-fr` (paper-doll #131)
- [x] GitHub / acceptance: `.qa/acceptance/desktop-inventory-grid.md`, paper-doll feet UX
- [ ] LightRAG: not used
- [ ] Ledger: n/a

---

## Root cause

UI layer: Desktop Inventar sits in a flex row with fixed `lg:w-96` Ausrüstung, so the inventar panel often shrinks to ~350px. Five equal columns yield ~58px cells. Name uses `break-words` with `pr-10` for the ⋮ menu (~40px text width) → German compound names wrap character-by-character → cell height explodes. `fillPanel` (`lg:h-full` + `auto-rows-fr`) stretches the whole row to that height.

**Fix attempts this bug:** 1 (applied after evidence)

---

## Suggested fix (minimal)

1. File: `src/app/character/inventory/InventoryBaseGrid.tsx`
2. Change: `min-w-0 overflow-hidden` on cells; replace `break-words` with `truncate` + `title={displayName}`; constrain badge overflow
3. Regression test: Playwright assert occupied slot height ≤ ~160px at 1440×900 after add (optional follow-up)

**Next step:** implemented in same turn (user asked „fix das“)

---

## Notes

- Assumptions: Core catalog item name matches production string.
- Out of scope: Changing column count / Ausrüstung width.
- **Fix verified (CDP 1440×900):** before `cellH=501`/`nameH=385`; after truncate `cellH=135`/`nameH=19`/`textOverflow=ellipsis`.
