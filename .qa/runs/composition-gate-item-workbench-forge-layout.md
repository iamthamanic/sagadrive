# Composition Gate — item-workbench-forge-layout

- HEAD_SHA: ff249dd96b41942b54d157be76df40483464a9a1
- BASE_SHA: b6f5e4878dadf1f6f0518c9d5c22a1eb7967044e
- Date: 2026-09-09
- Verdict: CLEAR

## Event
Author creates/edits an ItemDefinition in the Workbench and optionally uploads a 2D/3D asset before explicit Speichern. App shell mounts children once; desktop/mobile chrome toggles via CSS without remounting route state. Edge main rewrites nginx-stripped paths to `/functions/v1/<fn>/…` for workers.

## Hop chain
UI Visuals dropzone (`ItemVisualsPanel` / `useItemAssets`) → `ensureDraftId` (`useItemEditor` → create via catalog; world ohne worldId → personal + toast/hint; live form preserved via `formRef` after await) → persist `inventory_item_definitions` → navigate `/items/:id` → `itemAssetPending` → Edge `item-thumbnail` / `item-model3d` via `main` (`toWorkerRequest`) → storage + asset keys → Workbench preview / Speichern.

Shell: single children mount; CSS `md:` chrome; `data-app-shell` via matchMedia.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One draft create per first asset action (deduped via `ensureDraftPromiseRef`) | Shared in-flight promise; pending queue holds one action | pass |
| Invalid/missing | Missing name uses type label fallback; world without worldId falls back to personal with UI hint + toast; draft validation errors toast + no upload | Fail-closed on validation/API error; pending cleared | pass |
| Two consumers / crash | Remount after navigate; pending type filtered; resize keeps editor; worker paths work after nginx strip | `takePendingItemAsset`; CSS chrome; `toWorkerRequest` | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| n/a | — | — | — | — |

## Skip reason
n/a
