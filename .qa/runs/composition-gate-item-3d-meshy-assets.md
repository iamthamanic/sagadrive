# Composition Gate — item-3d-meshy-assets

- HEAD_SHA: 9a5afbac342fcadeea9a4f170e2da6a2a3c3792f
- BASE_SHA: 9a5afbac342fcadeea9a4f170e2da6a2a3c3792f
- Date: 2026-09-06
- Verdict: CLEAR
- Note: WORKTREE — implementation lives as uncommitted changes on `feat/141-item-3d-meshy`; update HEAD_SHA after parent commit. BASE_SHA = merge-base with origin/main (same tip until commit).

## Event

Workbench editor uploads a validated GLB or confirms Meshy Image-to-3D from a persisted thumbnail; result materializes into SagaDrive `item-models` storage and binds via logical `model3d:{uuid}` — never durable Meshy URLs. Library/Inventory continue to resolve thumbnails only.

## Hop chain

Workbench Visuals (`ItemVisualsPanel` / `useItemModel3dAssets`) → `itemModel3dService` → Edge Function `item-model3d` (JWT + owner/world authz + GLB magic/size + optional Meshy Image-to-3D) → Storage `item-models` + `item_model3d_assets` / `item_model3d_jobs` (input thumbnail + provider_task_id snapshots) → patch `payload.model3d` → Workbench lazy `ItemModelPreview` (Three GLTFLoader). Library/Inventory hop stops at thumbnail `assetKey` only.

Cardinality: exactly one Meshy `createTask` per confirmed Generate / Retry (submit lock + disabled while active).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One signed-in editor; concurrent editors each own JWT + personal owner / world edit check before mutate | JWT + `assertCanMutateDefinition` before upload/generate/remove; no shared write without authz | pass |
| Invalid/missing | Fail closed | Meshy unset → `not-configured`; no thumbnail → generate blocked; bad/oversized GLB rejected; prior model kept; upload-only works | pass |
| Two consumers / crash | Workbench preview + Library/Inventory; crash mid-job | Same `model3d` key for Workbench resolve; Library/Inventory never mount 3D; provider URL never durable; incomplete job does not corrupt prior model; job bound to input thumbnail snapshot | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR
