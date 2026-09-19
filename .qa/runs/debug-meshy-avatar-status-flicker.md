# Debug Report — meshy-avatar-status-flicker

**Date:** 2026-09-18  
**Project:** sagadrive  
**Shell:** web  
**Repro grade:** full (Playwright mock + code path)

---

## Summary

Status line (`data-avatar-meshy-message`) flickered every ~1s because `CharacterEditor` passed an **inline `onSuccess`**, which was in the panel’s `useEffect([onSuccess])` deps. Each `setMeshyUi` from poll/health re-rendered the parent → new `onSuccess` → config effect reset `configReady=false` → copy flipped to „Prüfe Meshy…“ / idle; poll interval also restarted and caused race errors mid-generation.  
**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | Stable „Generiert … N%“ while job runs |
| **Actual** | Status text changes every second; poll errors during generation |
| **Steps** | Character Editor → Mit KI erstellen → start generation |

---

## Reproduction

- **Playwright:** `e2e/debug-meshy-status-flicker.spec.ts` (mocked Meshy + credentials)
- **Result:** PASS after fix (8s sampling — no „Prüfe Meshy“ / „Bereit“ flicker)
- **Hard path:** no

---

## Evidence

- Code: `AvatarMeshyPanel` effects depended on `onSuccess`; `CharacterEditor` used inline lambda.
- Soft-stale 1s timer + `onJobChange` → parent re-render amplified remounts.
- E2E samples during generating: only „Generiert … N%“ after fix.

---

## Fix applied

1. `onSuccessRef` / `onJobChangeRef` — effects no longer depend on parent lambdas.
2. Config/providers load **once** (`[]`).
3. Poll deps: `[jobId, status]` only.
4. Busy job status wins over config-loading copy.
5. Regression: Playwright flicker test.

**Next step:** hard-reload Character Editor and re-run a real generation.
