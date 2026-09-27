# Debug Report — liveact-expand-modal-no-face-drive

**Date:** 2026-09-25  
**Project:** sagadrive  
**Shell:** web  
**Repro grade:** partial (vite-only) — code + user screenshots; no Playwright e2e this turn  

---

## Summary

LiveAct `bindOutput` targets only the editor-card `CharacterStudioRuntime`; the 3D Setup expand modal owns a **second** runtime that never receives `applyLiveActFrame`, so the visible mesh stays neutral while PiP + “Applied” HUD still show engine values from the hidden card.  
**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | With Tracking + Face Mapping saved, the 3D face in the Setup modal follows webcam (jaw/blink/brows). |
| **Actual** | PiP mesh moves; left HUD shows Character geometry + Applied numbers; cyan anchors sit on the face; **modal avatar face does not deform**. |
| **Steps** | 1. Character Editor → Setup modal. 2. Face Mapping setzen → Speichern. 3. Tracking + Face Overlay an. 4. Mund/Augen bewegen — Avatar bleibt starr. |

---

## Reproduction

- **Command / URL:** `http://localhost:3004/character-editor` (Vite port 3004; `.qa/project.yaml`)
- **Playwright spec:** none (screenshots attached by user)
- **Result:** reproduced via architecture + screenshots (anchors on face after `da20779`; drive still missing in modal)
- **Hard path:** no

---

## Evidence

### Screenshots (user)

- Anchors correctly on mesh (post projection fix).
- PiP LIVE + MediaPipe contours moving.
- Left HUD “Applied” (`jawOpen`, `blinkL/R`, …) updates.
- Modal character mouth/eyes stay neutral / T-pose upper body.

### Code

1. **Drive bind is editor-only** — `AvatarSurfaceViewer.tsx` (~214–230):

```ts
const output = studioRuntimeRef.current?.getLiveActAvatarOutput() ?? null;
engine.bindOutput(output);
```

`studioRuntimeRef` here is the **card** canvas, not the expand dialog.

2. **Expand owns a separate runtime** — `AvatarPreviewExpandDialog.tsx` creates its own `studioRuntimeRef` + `AvatarCanvas`. Grep: **no** `bindOutput` / `getLiveActAvatarOutput` in that file.

3. **Engine applies only to bound output** — `liveact-engine.ts` (~485–491):

```ts
this.output?.applyLiveActFrame(retargeted);
const applied = this.output
  ? this.output.getAppliedDiagnostics()
  : createUnavailableLiveActAppliedValues();
```

“Applied” in the modal HUD reads `diagnosticsV2Ref` from this engine snapshot → values from the **card** output, while the user stares at the **modal** mesh.

4. **Manual Face Mapping does not drive morphs** — `.qa/acceptance/liveact-face-anchors-character-persist.md` Scope **Out**: `Retarget-Drive aus Manual-Ankern`. Anchors = overlay / ground-truth, not webcam→morph wiring.

### Console / Network

Not collected this turn (root cause localized in bind path; Vite up on `:3004`).

---

## Prior art

- [x] Repo grep: `AvatarSurfaceViewer.tsx` `bindOutput`; `AvatarPreviewExpandDialog.tsx` no bind; `liveact-engine.ts` `applyLiveActFrame`
- [x] Acceptance: `liveact-face-anchors-character-persist.md` — Out: Retarget-Drive aus Manual-Ankern
- [x] GitHub: #424 Retargeting E2E still open; #418 Face Setup epic; PR #440 persist anchors (overlay, not drive)
- [ ] LightRAG: skipped (offline / not required)

---

## Root cause

**Layer:** app wiring (UI dual-runtime), not MediaPipe / not Face Mapping save.

Two independent `CharacterStudioRuntime` instances exist when Setup is open. LiveAct engine binds morph/head drive exclusively to the editor-card output. The modal viewport samples its own runtime for overlays (after `da20779`) but never becomes `engine` output → mesh never gets `applyLiveActFrame`. HUD “Applied” is therefore misleading in the modal: it proves the **pipeline** applied somewhere (card), not that **this** GLB deformed.

Secondary expectation gap: saving Face Mapping markers does not connect webcam channels to morph targets (by product scope).

**Hypotheses tested:**  
1. Wrong projection — falsified for current complaint (anchors on face).  
2. Engine not producing Applied — falsified (HUD shows jawOpen/blink).  
3. Expand mesh not bound to engine — **confirmed**.  

**Fix attempts this bug:** 0  

---

## Suggested fix (minimal)

1. **Files:** `AvatarPreviewExpandDialog.tsx` (+ possibly `AvatarSurfaceViewer.tsx` / `useLiveActViewport`)
2. **Change:** While expand is open + tracking on, `engine.bindOutput(expandRuntime.getLiveActAvatarOutput())`; on close, re-bind card output (or null). Keep a single active drive target — do not dual-drive without an explicit design.
3. **Regression:** assert expand open → `bindOutput` receives expand output; close → card output; optional e2e: tracking on in Setup → morph influence changes (or diagnostics applied + head bone delta on expand runtime).

**Next step:** `@implement` (or explicit “fix it”)

---

## Notes

- Assumptions: user tests exclusively inside Setup modal (matches screenshots).
- Out of scope here: morph-name retarget quality (e.g. blinkL 0.02 vs PiP 0.82) — separate after drive reaches the visible mesh.
- Related misconception: Face Overlay / anchors ≠ LiveAct morph drive.
