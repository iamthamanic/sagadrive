# Composition Gate — item-workbench-forge-layout

- HEAD_SHA: 0573bb03c614b7d66ce6c0680206fbeb35e36c30 (+ follow-up e2e visible selectors)
- Date: 2026-09-09
- Verdict: CLEAR

## Event
Author creates/edits an ItemDefinition in the Workbench and optionally uploads a 2D/3D asset before explicit Speichern.

## Hop chain
UI Visuals dropzone (`ItemVisualsPanel` / `useItemAssets`) → `ensureDraftId` (`useItemEditor` → `createPersonalDefinition` / `createWorldDefinition` via catalog service) → persist `inventory_item_definitions` → `onCreated` navigate `/items/:id` → `itemAssetPending` consume → Edge `item-thumbnail` / `item-model3d` (via `main` dispatcher) → storage + definition asset keys → Workbench preview / Speichern preserves keys.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One draft create per first asset action (deduped via `ensureDraftPromiseRef`) | Shared in-flight promise; pending queue holds one action | pass |
| invalid / missing | Missing name uses type label fallback; world without worldId falls back to personal; draft validation errors toast + no upload | Fail-closed on validation/API error; pending cleared | pass |
| 2 consumers / crash | Remount after navigate; only matching pending type consumed | `takePendingItemAsset(types)` filtered; one consume per hook | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| n/a | — | — | — | — |

## Skip reason
n/a
