# Composition Gate — item-thumbnail-assets

- HEAD_SHA: 55c4e5b6452bf6e73473b3d510fb72fa9159c2fb
- BASE_SHA: b03d3e0a54548379eeebd820cd75b48955393e3b
- Date: 2026-09-06
- Verdict: CLEAR

## Event

User uploads a PNG/JPEG thumbnail or confirms Meshy text-to-image generation for a Personal/World ItemDefinition; asset is materialized in SagaDrive storage and referenced via stable `assetKey`.

## Hop chain

Workbench Visuals (`ItemVisualsPanel` / `useItemAssets`) → `itemThumbnailService` → Edge Function `item-thumbnail` (authz + validation + optional Meshy) → Storage `item-thumbnails` + manifest/job tables → patch `assetKey` on definition payload → Library/Inventory resolve via `useItemThumbnailSrc` → `InventoryItemThumb` (`assetSrc` → `iconKey` → type)

Cardinality: exactly one Meshy createTask per confirmed Generate / Retry click (button disabled while starting/active job).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One signed-in editor; N concurrent editors each own JWT + personal owner / world edit check before mutate | JWT + personal owner / world edit check before mutate; no shared write without authz | pass |
| Invalid/missing | Fail closed | Meshy unset → `not-configured`; bad MIME/size rejected; prior asset kept; upload-only works | pass |
| Two consumers / crash | Workbench + Library/Inventory; crash mid-upload | Same `assetKey`; resolve signed URL server-side; provider URL never durable; incomplete job does not corrupt prior asset | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR
