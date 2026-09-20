# Debug Report — meshy-avatar-stuck-99-offline

**Date:** 2026-09-20  
**Project:** sagadrive  
**Shell:** web  
**Repro grade:** partial (vite-only UI + Edge logs; live poll not re-triggered in browser session)

---

## Summary

Avatar generation hangs at ~99% with „Keine Verbindung“ because **Supabase Edge isolates hit CPU soft/hard limits** during the heavy `rigging` phase (remesh → auto-rig → GLB download → storage upload). Poll requests die (`execution terminated` / `user worker failed to respond`); the client maps that to `pollHealth: offline` while **monotonic progress keeps the last good Meshy progress (99%)**. This is not a Meshy “stuck at 99%” product quirk alone — it is Edge killing the worker mid-materialize.  
**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | Job reaches `succeeded`, overlay dismisses, model appears in preview |
| **Actual** | Overlay stays: „Modell wird heruntergeladen…“, bar at **99%**, red „Keine Verbindung — versuche erneut…“ |
| **Steps** | 1. Open Character Editor (`localhost:3004/character-editor`) 2. Start Meshy KI avatar generation 3. Wait until late progress / rigging 4. Observe freeze at 99% + offline |

---

## Reproduction

- **URL:** `http://localhost:3004/character-editor`
- **Vite:** HTTP 200
- **Edge health (no JWT):** POST `character-avatar-meshy` → **401** „Anmeldung erforderlich“ (Kong/function reachable)
- **Edge logs (live):** repeated `CPU time soft/hard limit reached` → `execution terminated` → `user worker failed to respond`
- **Browser snapshot at debug time:** overlay no longer visible (job idle / source not KI) — UI state from user screenshot used as primary UI evidence
- **Hard path:** no (root cause already evidenced by Edge logs + prior sibling bug)

---

## Evidence

### UI mapping (code)

- Status `rigging` → label **„Modell wird heruntergeladen…“** (`CharacterEditor.tsx`)
- `pollHealth === 'offline'` → **„Keine Verbindung — versuche erneut …“** (`AvatarMeshyGeneratingOverlay.tsx`)
- `markPollError()` on `pollMeshyAvatarJob` reject (`AvatarMeshyPanel.tsx`)
- Progress never goes backwards: `monotonicMeshyProgress` — Meshy/rig progress can sit at **99%** by design (`meshy-avatar-job.ts` comment: Meshy 99% → our rigging 90%)
- Edge poll path intentionally splits phases but **second+ polls still do remesh/rig/download/upload** with up to **120s download** (`character-avatar-meshy/index.ts`)

### Edge / Docker

```
CPU time soft limit reached. isolate: …
CPU time hard limit reached. isolate: …
event loop error: Uncaught Error: execution terminated
failed to send request to user worker: connection closed before message completed
edge main dispatch failed user worker failed to respond
```

- Container `sagadrive-edge`: Up, ~196MiB RAM (memory OK)
- Worker config: `memoryLimitMb: 512`, `workerTimeoutMs: 5 * 60 * 1000` (`supabase/functions/main/index.ts`)
- **CPU time** limits are separate from memory/timeout — currently killing isolates during avatar materialize

### Prior related report

`.qa/runs/debug-meshy-avatar-edge-down-false-key.md` (2026-09-18): same family — Edge CPU/OOM → polls fail → UI shows „Keine Verbindung“, progress frozen at last good poll (~59% then). Now the freeze lands later (**~99% / rigging**) because generation often succeeds first.

### Knowledge

- Repo grep: overlay copy, poll health, monotonic progress, Edge split-materialize comments
- Prior `.qa/runs/debug-meshy-avatar-edge-down-false-key.md`
- Edge runtime docs pattern: Deno/Supabase Edge isolates enforce **CPU time** quotas independent of wall-clock `workerTimeoutMs`

---

## Root cause

1. Meshy text/image generation progresses to high % (often **99%** from provider/rig task).
2. Client enters busy overlay; label switches to download copy when server status is **`rigging`**.
3. Each poll continues heavy work in one Edge isolate turn (remesh poll, rigging poll, GLB download ≤120s, upload).
4. Edge Runtime hits **CPU time hard limit** → isolate terminated mid-request.
5. Browser poll fails → `markPollError()` → red offline copy; **progress stays at last successful snapshot (99%)** because of monotonic peak + no successful poll to advance to 100/`succeeded`.

**Not primary cause:** Vite down, missing API key (would be `provider-unavailable` / config UI), or CORS (would fail earlier consistently).

---

## Minimal fix hint (do not apply in this debug pass)

1. **Operational (now):** Restart `sagadrive-edge`; hard-reload editor; retry generation. Clear stuck job id in sessionStorage if polls keep failing.
2. **Product/infra:** Further split rigging materialize so **one poll never does download+upload+CPU-heavy work** in the same isolate (queue step machine: remesh wait → rig wait → download → upload each return early). Optionally raise Edge CPU budget if self-host config allows.
3. **UX:** On `offline` during `rigging`, copy should say **„KI-Server überlastet / Worker abgebrochen — retry“** not pure „Keine Verbindung“; optionally show last server `error_message` / edge 5xx.
4. **Regression:** Gate or script that fails if Edge logs contain `CPU time hard limit` during avatar e2e; assert poll continues after simulated mid-rigging 5xx without sticky false “no API key”.

---

## Follow-ups

- Confirm whether self-host Edge Runtime exposes configurable CPU soft/hard limits (vs only memory/timeout already raised to 512MB / 5min).
- Review remesh+rig+download still chained on “Second+ polls” despite earlier split at first `rigging` transition.

---

## Verdict

**Root cause evidenced.** Fix via `@implement` when ready — prefer Edge step-splitting + clearer offline copy; restart Edge for immediate unblock.
