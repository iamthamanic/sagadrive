# Debug Report — meshy-avatar-confirm-layout-jitter

**Date:** 2026-09-18  
**Project:** sagadrive  
**Shell:** web  
**Repro grade:** partial (vite-only, code-path evidence; no paid Meshy run)

---

## Summary

Inline cost-confirm swaps the action row (1 → 2 buttons + status “Bitte bestätigen”) inside the sticky Character Editor card, causing layout reflow / “Zitter-Glitch” on click; progress monotonicity is already in place and is a secondary factor.  
**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | Click „Mit KI erstellen“ → stable UI → confirm cost → generation starts without panel jump |
| **Actual** | Click → buttons swap in-place → sticky sidebar / panel height jumps (“zitter glitchen”) |
| **Steps** | 1. Character Editor → Avatar „Mit KI erstellen“ 2. Prompt gültig 3. „Mit KI erstellen“ klicken |

---

## Reproduction

- **Command / URL:** http://localhost:3004 (dev running)
- **Playwright spec:** none (avoid paid Meshy call)
- **Result:** root cause confirmed via code path (`setConfirming(true)` replaces CTA row)
- **Hard path:** no

---

## Evidence

### Code

- `AvatarMeshyPanel.tsx`: `{!confirming ? <Start> : <Confirm+Cancel>}` — height/width of action cluster changes in sticky card
- Status line switches to `STATUS_LABEL.confirming` → additional text reflow
- Overlay only mounts after successful start (`isMeshyAvatarJobBusy`) — so start-click jitter is confirm UI, not overlay

### Prior art

- Repo: `.qa/acceptance/meshy-generating-health-progress.md` — progress 99→90 already mitigated via `monotonicMeshyProgress`
- User request same turn: replace inline confirm with modal + credit cost

---

## Root cause

UI/layout: confirming state mutates the panel DOM in the sticky left column instead of overlaying a portal dialog. That reflow is perceived as glitch/jitter when generation is initiated.

**Fix attempts this bug:** 1 (modal + stable action row)

---

## Suggested fix (minimal)

1. `AvatarMeshyPanel.tsx` — Dialog confirm with estimated credits; keep CTA row stable
2. Domain constants for Meshy credit estimates (text preview / image textured)
3. Check script asserts modal markers, not inline „Kosten bestätigen“ swap

**Next step:** implement (user asked debug + fix same turn)
