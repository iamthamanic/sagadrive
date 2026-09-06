# Composition Gate — item-thumbnail-assets

- HEAD_SHA: 1f70b0452bc0154637c0e379465f9f11cd974695
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
| 1 event, N actors | One signed-in editor | JWT + personal owner / world edit check before mutate | pass |
| invalid / missing | Fail closed | Meshy unset → `not-configured`; bad MIME/size rejected; prior asset kept; upload-only works | pass |
| 2 consumers | Workbench + Library/Inventory | Same `assetKey`; resolve signed URL server-side; provider URL never durable | pass |
| side-effect once | One Meshy job per confirm | Submit lock + disabled generate while waiting/generating; Retry starts new single job | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR
