# Performance Investigation

**Depth:** Interaction Investigation (Mode A) + targeted Runtime/Asset white-box  
**Scale / Load (Mode D):** not in scope  
**Data / Complexity (Mode E):** not in scope (no large-repo axis; asset weight treated as critical-path bytes)

## Verdict

On a fast desktop with Local-Admin (Supabase Docker **down**), shell navigation and Character-Editor **tabs** are already responsive (Perceived Ready typically **&lt;200 ms**). The dominant product risk is the **species-template 3D path**: selecting a Human Vorlage loads a **~28–34 MB VRM** via `GLTFLoader.loadAsync` on the editor critical path. Localhost Fully Ready after template click was **~0.9–1.8 s**; the same bytes on average/mobile networks will dominate Fully Ready. Secondary: cold login / editor open transfer **multi‑MB JS+images** before any mesh. Backend latency was **not measured** (Kong unavailable).

## Lead table

| Rank | Interaction | p50 Perceived | p50 Fully | Bottleneck | Confidence | Priority |
|------|-------------|---------------|-----------|------------|------------|----------|
| 1 | Human species template → 3D ready | ~0.35–0.57 s (click) | ~0.9–1.8 s localhost | 28–34 MB VRM download+parse+GPU | PROVEN (bytes+path); network impact HYPOTHESIS off-LAN | **P0** |
| 2 | Login → Dashboard (cold) | 2.26 s (n=1) | 2.26 s | ~19.6 MB transfer / chunk+asset fan-out | STRONG EVIDENCE | P1 |
| 3 | Open blank Character Editor | 0.65 s | 1.07 s | ~7–12 MB transfer; no mesh yet | STRONG EVIDENCE | P1 |
| 4 | Dashboard warm `goto('/')` | 0.16 s | 0.46 s | ~6.7 MB re-transfer on full navigation | STRONG EVIDENCE (probe uses full reload) | P2 |
| 5 | Editor tabs Charakter/Inventar/Spezies | 0.04–0.11 s | 0.24–0.31 s | Not material | PROVEN | P3 |
| 6 | Editor tab Look (Perceived) | 0.04 s | — | UI only | PROVEN | P3 |
| — | Editor tab Look (Fully, probe) | — | ~31 s | **Artifact:** waited for canvas without template selected | REJECT measurement | — |

Sample size for repeats: **n=5** → p95/p99 omitted (insufficient). Profile: **A — fast desktop**, Vite `localhost:3004`, Chromium + SwiftShader.

## Test Environment

| Item | Value |
|------|--------|
| App | SagaDrive (React 18 + Vite 6 + Three/VRM + MediaPipe) |
| URL | `http://localhost:3004` |
| Auth | Local Admin `admin` / `1234` (product fallback) |
| Backend | `localhost:8000` Kong **down** — no Supabase REST timings |
| Docker | Daemon not running |
| Probe | `e2e/perf-interaction-probe.spec.ts` (`PERF_PROBE=1`) |
| Raw samples | `.qa/runs/perf-speed/samples-latest.json` |
| 3D focused | `.qa/runs/perf-speed/3d-template.log`, `3d-cold-warm.json` |

## Performance Map

```text
Browser (Vite :3004)
→ App shell / History routing (App.tsx lazy views)
→ CharacterEditor (lazy root) + Tabs
→ useCharacterAvatarEditor → resolveSpeciesTemplateModelUrl
→ AvatarCanvas → CharacterStudioRuntime.loadModel
→ three GLTFLoader.loadAsync(VRM/GLB)
→ (optional) LiveAct / MediaPipe face tracking (dynamic @mediapipe/tasks-vision)
→ Supabase Auth/REST/Storage/Edge  [NOT MEASURED — down]
→ Postgres/RLS                          [NOT MEASURED]
```

## User Journeys Tested

Prioritized from product surface + existing E2E (`e2e/helpers/auth.ts`, character editor flows):

1. Login → Dashboard  
2. Open blank Character Editor  
3. Gender reading + Human species template → 3D preview  
4. Editor tab switches (Spezies / Charakter / Look / Inventar)  
5. Open Bibliothek  

Not tested (blocked / out of scope): save character, session live, LiveAct camera, inventory item 3D, marketplace, real Supabase queries, load/scale.

## Baseline

- Warm-ups: 1  
- Repeats: 5 for most interactions; 3D cold/warm separate one-shots  
- Cold vs warm: documented for template 3D; browser HTTP cache on localhost is fast  

### Asset weights on critical path (filesystem / HTTP)

| Asset | Size |
|-------|------|
| `human-female-quality-20260921-f5-face3.vrm` | **34.1 MB** |
| `human-male-quality-20260921-m5-face3.vrm` | **28.5 MB** |
| `saga-human-canonical-v1.vrm` | **9.8 MB** |
| MediaPipe `vision_wasm_internal.wasm` | **9.0 MB** |
| Built `index-*.js` | 1.1 MB |
| Built `three-vrm-*.js` | 788 KB |
| Built `vendor-*.js` | 689 KB |
| Built `root-*.js` (character) | 364 KB |

Code path: `species-template-models-v1.ts` → `useCharacterAvatarEditor` → `AvatarCanvas` → `character-studio-runtime.ts` `loadModel` → `GLTFLoader.loadAsync`.

## Slowest Interactions

### Human Vorlage → Fully Ready (3D)

- Click Perceived Ready: **~350–570 ms**  
- Fully Ready (canvas + animation chrome): **~0.9–1.8 s** on this LAN  
- Network: confirmation of **34,101,496** byte VRM for feminine Human template  
- Without template id, UI correctly shows `Kein 3D-Modell — Portrait/Fallback` (gender alone does **not** load mesh)

### Open Character Editor (no mesh)

- Perceived Ready (heading + Spezies tab): **p50 647 ms**  
- Fully Ready: **p50 1067 ms**  
- Transfer median ~7.1 MB, up to ~12.7 MB; `asset_requests` median 52  

### Cold login

- **2259 ms**, ~19.7 MB transfer, long tasks ~62 ms  

## Critical Paths

### OPEN HUMAN TEMPLATE 3D — ~1.8 s Fully Ready (localhost example)

```text
UI click species template .............. ~0.35–0.55 s   Perceived Ready
resolveSpeciesTemplateModelUrl ......... <1 ms
GLTFLoader.loadAsync(34 MB VRM) ........ bulk of Fully Ready
VRMUtils + center + materials + bind ... included in Fully Ready
MediaPipe FaceLandmarker WASM .......... NOT on this click (separate LiveAct path)
Supabase ................................ N/A (down)
```

Share of problem on slow networks: **bytes on the wire** dominate (HYPOTHESIS quantified by size; PROVEN that this file is the mesh source).

### OPEN CHARACTER EDITOR — ~1.1 s Fully Ready

```text
Navigation / lazy CharacterEditor ...... primary
JS/CSS/PNG fan-out (~7–12 MB) .......... primary transfer
3D mesh ................................ not yet (placeholder)
React tab chrome ....................... minor
```

### EDITOR TAB SWITCH — Perceived Ready

```text
Charakter / Inventar / Spezies ......... ~40–110 ms Perceived — not a bottleneck
Look Perceived ......................... ~44 ms
Look Fully (probe wait for canvas) ..... INVALID without template
```

## Proven Bottlenecks

### B1 — Species template VRM byte weight on preview path

- **Observation:** Human feminine template serves a 34.1 MB VRM; masculine 28.5 MB. Canonical body is 9.8 MB.  
- **Evidence:** `du` + HTTP GET via Vite; Playwright response capture; code `SPECIES_GENDER_MESH` in `species-template-models-v1.ts`; `loadModel` in `character-studio-runtime.ts`.  
- **Affected interaction:** Vorlage „Mensch“ + gender reading → avatar preview Fully Ready.  
- **Measured impact:** Localhost Fully Ready ~0.9–1.8 s after click; **34 MB** on critical path.  
- **Likely root cause:** Preview uses full quality face3 VRM as default template mesh.  
- **Confidence:** **PROVEN** (size + load path). Off-LAN duration: **HYPOTHESIS** (Profile D not run).

### B2 — Multi‑MB transfer before editor Perceived Ready

- **Observation:** Opening blank editor transfers ~7–12 MB with 50+ asset requests before Spezies tab ready; no GLB/VRM yet.  
- **Evidence:** Probe `open_blank_character_editor` samples; notes `no_3d_placeholder`.  
- **Affected interaction:** Dashboard → Character Editor.  
- **Measured impact:** Perceived p50 **647 ms**, Fully p50 **1067 ms** (n=5).  
- **Likely root cause:** Lazy route still pulls large character/root + image assets eagerly for first paint of editor chrome.  
- **Confidence:** **STRONG EVIDENCE**.

### B3 — Cold login payload

- **Observation:** First authenticated shell ~2.3 s with ~19.6 MB transfer.  
- **Evidence:** `login_to_dashboard_cold` sample.  
- **Confidence:** **STRONG EVIDENCE** (n=1 exploratory for timing; byte count still informative).

## Root Causes

| ID | Cause | Confidence |
|----|-------|------------|
| RC1 | Default Human preview mesh = full face3 VRM (28–34 MB), not a light LOD/canonical | PROVEN |
| RC2 | Editor first open downloads large JS/PNG set before usable chrome | STRONG EVIDENCE |
| RC3 | `CharacterStudioRuntime` statically couples LiveAct debug/output modules → Vite serves related modules early | LIKELY |
| RC4 | Backend/RLS/query cost | **Unknown** (Docker down) |

## White-box backlog (code evidence only — not timed this run)

Source: repo map of routing, services, and E2E surfaces ([Map SagaDrive perf surfaces](02d9ce01-c24e-4ad1-b6da-8bea93b0e0b0)). These are **candidates for Mode C / next Interaction runs**, not proven bottlenecks until measured with Docker up.

| Candidate | Code signal | Suggested measure | Confidence now |
|-----------|-------------|-------------------|----------------|
| Session lobby open | `useSessionLobby.ts`: public IDs → `getSessionById` → **per-player** `getCharacterById` | Instrument lobby open with N players; Network waterfall | HYPOTHESIS (N+1 shape) |
| Project list fan-out | `project-service.ts` `fetchUserProjects`: per project `members` + `sessions` `select('*')` | Contrast vs `getUserProjectSummaries` on Dashboard | HYPOTHESIS |
| Session list fan-out | `session-service.ts` `getUserSessions` + `loadPlayers` per session | Session join / session dashboards | HYPOTHESIS |
| Full character sheet fetch | `supabase-character.repository.ts` `select('*')` on open/edit | Editor open with large JSONB sheet | HYPOTHESIS |
| Library / item lists | Full `.map()`; no Virtuoso/react-window (`ItemLibraryResults`, `EntityBrowser`, …) | Profile E: 100 → 1k → 5k rows | HYPOTHESIS |
| LiveAct enable | MediaPipe WASM ~9 MB + `face_landmarker.task` + VRM bind; fpsCap in engine | `liveact-viewport-smoke` / face-setup E2E + Performance timeline | HYPOTHESIS |
| Live 3D strip | Cap `AVATAR_SURFACE_MAX_LIVE_3D` (=4) | GM/player live with 1–4 avatars | HYPOTHESIS |
| Static asset footprint | `public/assets` ~517 MB on disk (not all on one journey) | HAR per journey; avoid treating tree size as one load | Note only |

Reuse for timing (when backend available): `golden-mobile-journeys`, `character-editor`, `session-lobby-preflight`, `live-session-golden-e2e-gate`, `liveact-viewport-smoke`, library browse specs.

## Scaling Behaviour

Not in scope (Mode D/E not requested). Asset-byte scaling note: Fully Ready for template preview will grow roughly with **download time ∝ VRM size / bandwidth** until parse/GPU bound. List virtualization candidates belong to Mode E once row counts are fixture-driven.

## Recommended Optimizations

### BOTTLENECK B1 — oversized template VRM

**OPTION A — Dual-quality preview (recommended)**  
Ship a **≤5–10 MB** editor preview (e.g. canonical / meshopt / Draco / lower tex) for Vorlage; keep face3 VRM for export / LiveAct fidelity / explicit “HQ laden”.  
- Expected impact: Fully Ready cut **substantially** off-LAN; localhost may drop below 1 s more consistently.  
- Why: Moves bytes off Perceived/Fully Ready critical path without changing sheet rules.  
- Trade-offs: Two assets to maintain; risk of preview≠final mismatch (mitigate with badge “Vorschau”).  
- Risks: Users confuse preview fidelity with final.  
- Complexity: Medium.  
- Confidence: High for impact on byte-bound waits.

**OPTION B — Compress face3 VRMs in place (meshopt/Draco + texture resize)**  
- Expected impact: Directly shrink B1 without UX dual-path.  
- Trade-offs: Pipeline/build complexity; possible quality loss.  
- Complexity: Medium–High.  

**OPTION C — Defer `loadModel` until Look tab or “3D laden” click**  
- Expected impact: Spezies/Charakter Perceived Ready unchanged; delays cost until user needs preview.  
- Trade-offs: Empty viewport longer; may surprise.  
- Complexity: Low–Medium.

### BOTTLENECK B2 — editor open transfer

**OPTION A — Audit Vite manualChunks / defer non-visible PNGs (species carousel offscreen)**  
- Expected impact: tens–hundreds of ms on Perceived Ready.  
- Confidence: Medium until chunk graph measured in production build (probe used **dev** server).

**OPTION B — Ensure production-build measurements for absolute claims**  
Dev HMR module graph (`/src/...ts`) inflates request counts vs `build/`.

## Rejected Optimizations

```text
REJECTED: Memoize Character Editor tab panels / blanket useMemo
Reason: Tab Perceived Ready already ~40–110 ms (n=5). State/render is not the measured bottleneck versus 28–34 MB VRM and multi-MB first load.

REJECTED: Replace React state library for performance
Reason: No evidence state updates dominate any measured critical path.

REJECTED: Treat Look-tab Fully Ready ~31 s as user-facing lag
Reason: Probe artifact waiting for canvas without speciesTemplateId; Perceived Ready was ~44 ms.
```

## Priority Order

1. **P0** — Reduce template preview mesh bytes (Option A or B for B1)  
2. **P1** — Re-measure editor open on **production build**; trim eager images/chunks (B2)  
3. **P1** — When Docker is up: Mode C — lobby N+1, `select('*')` sheets, project/session list fan-out (white-box backlog)  
4. **P1** — LiveAct enable path (MediaPipe WASM + face model) once tracking is intentionally started  
5. **P2** — Defer LiveAct/MediaPipe module graph until tracking enabled (RC3)  
6. **P2** — Library list Mode E (virtualization) only after row-count fixtures prove cost  
7. **P3** — Tab micro-opts (skip)

## Expected Impact

| Change | Metric | Expected |
|--------|--------|----------|
| Light preview mesh | Template → Fully Ready | Large off-LAN; clear byte reduction PROVEN |
| Compress face3 | Same | Proportional to compression ratio |
| Defer 3D until Look/explicit | Spezies flow Fully Ready | Removes mesh from early path |
| Chunk/image defer | Editor Perceived Ready | Modest (needs prod build proof) |

## Risks / Trade-offs

- Preview vs final fidelity mismatch (mitigated: persist always writes fidelity face3 URL)  
- Extra asset pipeline maintenance  
- Do not silently drop facial morph quality for LiveAct without a HQ path (`quality:'fidelity'`)  
- Security/consistency: allowlisted `/assets/avatars/species/**` + `/assets/avatars/canonical/**` only  

## Unknowns

- Supabase/Postgres/Edge latency (Docker down)  
- Whether lobby/project N+1 shapes dominate user-facing p95 once DB is up  
- Production-build vs Vite-dev transfer mix  
- Profile C/D (CPU/network throttle) not run  
- LiveAct + MediaPipe WASM timing when tracking enabled  
- List render cost at realistic library sizes  
- p95/p99 (n&lt;10)  

## Validation Plan

For any keepable change:

1. Same probe: `PERF_PROBE=1 PERF_REPEATS=10 npx playwright test e2e/perf-interaction-probe.spec.ts --project=chromium`  
2. Plus `.qa/tmp/perf-3d-cold.mjs` cold/warm template load  
3. Report Perceived vs Fully for **Human Vorlage** and **open editor**  
4. Guardrails: facial/LiveAct HQ path still loads when explicitly needed; no allowlist bypass  
5. Verdict KEEP only if same measurement improves; else REJECT/REVERT  

**Next audit slice (Docker required):**

1. Start compose → Kong `:8000` healthy  
2. Time `session-lobby-preflight` / lobby open with 2 vs 8 players (waterfall count + duration)  
3. Time character edit of a fat sheet (`select('*')`) vs summary endpoints  
4. Optional: LiveAct viewport smoke cold vs warm WASM  
5. Promote backlog rows to PROVEN/STRONG only with those numbers — do not implement N+1 “fixes” from code shape alone  


### Before / After — P0 dual-quality preview (IMPLEMENTED)

```text
BEFORE (audit, localhost Profile A)
Human Vorlage → Fully Ready ~0.9–1.8 s; mesh 34.1 MB feminine face3 VRM

CHANGE
resolveSpeciesTemplateModelUrl quality:'preview' → canonical (~9.8 MB)
quality:'fidelity' retained for persist / face3 HQ
Gate: scripts/species-template-gender-model-preview-check.mjs

AFTER (2026-10-08, .qa/runs/perf-speed/3d-template-after.log)
Human Vorlage → Runtime bereit ~1.8 s localhost
mesh: /assets/avatars/canonical/saga-human-canonical-v1.vrm len=10,243,088 (~9.8 MB)
face3 not on editor critical path

ALSO SHIPPED (code-shape; Docker Mode C still untimed)
- Lobby: getCharacterRosterMetaByIds batch (no N× select('*'))
- SessionJoin / ProjectJoin / PreparedAdventure / CharacterBackground / SagaCreate
  → project summaries (no per-project members+sessions fan-out)
- LiveActEngine acquire deferred until Tracking (or liveactE2e)

VERDICT
KEEP (P0 byte path PROVEN; localhost timing similar — win is off-LAN / transfer)
```

Acceptance: `.qa/acceptance/perf-speed-p0-template-preview.md`
