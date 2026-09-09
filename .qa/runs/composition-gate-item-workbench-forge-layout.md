# Composition Gate — item-workbench-forge-layout

- HEAD_SHA: 8e6cd26fa8e6818ec43ebea3c2f47408a4dfab1d
- BASE_SHA: b6f5e4878dadf1f6f0518c9d5c22a1eb7967044e
- Date: 2026-09-09
- Verdict: CLEAR

## Event
Author creates/edits an ItemDefinition in the Workbench and optionally uploads a 2D/3D asset before explicit Speichern. App shell mounts children once; desktop/mobile chrome toggles via CSS without remounting route state.

## Hop chain
UI Visuals dropzone (`ItemVisualsPanel` / `useItemAssets`) → `ensureDraftId` (`useItemEditor` → `createPersonalDefinition` / `createWorldDefinition` via catalog service; world ohne worldId → personal + toast/hint) → persist `inventory_item_definitions` → `onCreated` navigate `/items/:id` → `itemAssetPending` consume → Edge `item-thumbnail` / `item-model3d` (via `main` dispatcher) → storage + definition asset keys → Workbench preview / Speichern preserves keys.

Shell: `Layout` single children mount in `main`; `data-app-shell` via `matchMedia`; chrome via Tailwind `md:` (no dual portal tree).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One draft create per first asset action (deduped via `ensureDraftPromiseRef`) | Shared in-flight promise; pending queue holds one action | pass |
| Invalid/missing | Missing name uses type label fallback; world without worldId falls back to personal with UI hint + toast; draft validation errors toast + no upload | Fail-closed on validation/API error; pending cleared | pass |
| Two consumers / crash | Remount after navigate; only matching pending type consumed; resize keeps editor state; only one children mount | `takePendingItemAsset(types)` filtered; CSS chrome; single main | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| n/a | — | — | — | — |

## Skip reason
n/a
