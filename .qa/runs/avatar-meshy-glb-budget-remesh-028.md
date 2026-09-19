# Run — avatar Meshy GLB budget + remesh (028)

Date: 2026-09-18

## Change
Raise store/download ceilings and remesh oversized Meshy avatar GLBs so **text** and **image** modes both materialize reliably.

## Limits
| Constant | Value |
|---|---|
| Soft (prefer remesh) | 80 MB |
| Store / bucket | 100 MB |
| Hard download | 200 MB |
| Remesh target | 50k triangles |

## Paths
1. **Image-to-3d create**: `should_remesh: true` + `target_polycount: 50000`
2. **Both modes after SUCCEEDED**: HEAD probe → if > soft, `POST /remesh` → poll `remesh_task_id` → download remeshed GLB
3. **Size-fail fallback**: if GET still exceeds store budget and no remesh yet, start remesh once

## Verified
- [x] Migration `028_character_avatar_meshy_glb_budget.sql` applied (`remesh_task_id` + bucket `104857600`)
- [x] `sagadrive-edge` force-recreated
- [x] `avatar-meshy-generation-check` PASS
- [x] `deno test` `avatar-meshy-remesh_test.ts` 7/7 PASS

## Manual next
- Generate once in **Bild** and once in **Text**; oversized jobs should show progress ~92–98 while remeshing, then succeed under 100 MB.
